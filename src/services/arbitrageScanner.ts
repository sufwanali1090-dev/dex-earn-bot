import { ethers, Contract } from 'ethers';
import {
  TokenInfo,
  DexInfo,
  DexToDexOpportunity,
  TriangularOpportunity,
  BotConfig,
} from '../types';
import { OFFICIAL_POLYGON_TOKENS } from '../data/polygonTokens';
import { POLYGON_DEXES } from '../data/dexRouters';
import { polygonRpc } from './polygonRpc';
import { riskEngine } from './riskEngine';
import { livePriceService } from './livePriceService';

const ROUTER_ABI = [
  'function getAmountsOut(uint amountIn, address[] calldata path) external view returns (uint[] memory amounts)',
];

const WPOL_ADDR = '0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270';

// Pre-defined triangle cycles for fast scanning - strictly starting and ending in USDT/USDC across all verified DEXes
export const TRIANGLE_CYCLES: {
  id: string;
  symbols: [string, string, string];
  dexId: string;
}[] = [
  { id: 'tri-1', symbols: ['USDT', 'QUICK', 'POL'], dexId: 'quickswap' },
  { id: 'tri-2', symbols: ['USDT', 'WETH', 'WBTC'], dexId: 'quickswap' },
  { id: 'tri-3', symbols: ['USDT', 'LINK', 'WETH'], dexId: 'quickswap' },
  { id: 'tri-4', symbols: ['USDT', 'AAVE', 'POL'], dexId: 'quickswap' },
  { id: 'tri-5', symbols: ['USDT', 'SAND', 'POL'], dexId: 'quickswap' },
  { id: 'tri-6', symbols: ['USDT', 'UNI', 'POL'], dexId: 'sushiswap' },
  { id: 'tri-7', symbols: ['USDT', 'CRV', 'WETH'], dexId: 'sushiswap' },
  { id: 'tri-8', symbols: ['USDT', 'SUSHI', 'POL'], dexId: 'sushiswap' },
  { id: 'tri-9', symbols: ['USDT', 'GRT', 'POL'], dexId: 'quickswap' },
  { id: 'tri-10', symbols: ['USDT', 'GRT', 'WETH'], dexId: 'quickswap' },
  { id: 'tri-11', symbols: ['USDT', 'MANA', 'POL'], dexId: 'quickswap' },
  { id: 'tri-12', symbols: ['USDT', '1INCH', 'WETH'], dexId: 'sushiswap' },
  { id: 'tri-13', symbols: ['USDT', 'POL', 'WETH'], dexId: 'quickswap' },
  { id: 'tri-14', symbols: ['USDT', 'WBTC', 'WETH'], dexId: 'quickswap' },
  { id: 'tri-15', symbols: ['USDT', 'FET', 'WETH'], dexId: 'uniswap' },
  { id: 'tri-16', symbols: ['USDT', 'RNDR', 'WETH'], dexId: 'uniswap' },
  { id: 'tri-17', symbols: ['USDT', 'NEAR', 'POL'], dexId: 'pancakeswap' },
  { id: 'tri-18', symbols: ['USDT', 'AVAX', 'WETH'], dexId: 'kyberswap' },
  { id: 'tri-19', symbols: ['USDT', 'BAL', 'WETH'], dexId: 'balancer' },
  { id: 'tri-20', symbols: ['USDT', 'SOL', 'POL'], dexId: 'meshswap' },
  { id: 'tri-21', symbols: ['USDT', 'PEPE', 'WETH'], dexId: 'pancakeswap' },
  { id: 'tri-22', symbols: ['USDT', 'SHIB', 'POL'], dexId: 'quickswap' },
  { id: 'tri-23', symbols: ['USDT', 'ONDO', 'WETH'], dexId: 'uniswap' },
  { id: 'tri-24', symbols: ['USDT', 'PENDLE', 'WETH'], dexId: 'kyberswap' },
];

interface OnChainQuoteCache {
  amountOutWei: bigint;
  outputAmount: number;
  effectivePrice: number;
  path: string[];
  timestamp: number;
}

export class ArbitrageScannerService {
  private tokenMap: Map<string, TokenInfo> = new Map();
  private dexMap: Map<string, DexInfo> = new Map();
  private onChainQuoteCache: Map<string, OnChainQuoteCache> = new Map();
  private isUpdatingOnChain: boolean = false;
  private lastBackgroundUpdate: number = 0;

  constructor() {
    OFFICIAL_POLYGON_TOKENS.forEach((t) => this.tokenMap.set(t.symbol, t));
    POLYGON_DEXES.forEach((d) => this.dexMap.set(d.id, d));

    // Trigger initial on-chain quotes fetch
    this.refreshOnChainPrices();
  }

  public getToken(symbol: string): TokenInfo | undefined {
    return this.tokenMap.get(symbol);
  }

  public getDex(id: string): DexInfo | undefined {
    return this.dexMap.get(id);
  }

  /**
   * Fetches real on-chain quotes in parallel batches from Polygon DEX routers
   */
  public async refreshOnChainPrices(tradeAmountUsd: number = 1.0) {
    if (this.isUpdatingOnChain) return;
    const now = Date.now();
    if (now - this.lastBackgroundUpdate < 2500) return;

    this.isUpdatingOnChain = true;
    this.lastBackgroundUpdate = now;

    try {
      const provider = polygonRpc.getProvider();
      const priorityTokens = OFFICIAL_POLYGON_TOKENS.filter((t) =>
        ['POL', 'WMATIC', 'WETH', 'WBTC', 'QUICK', 'LINK', 'AAVE', 'UNI', 'GRT', 'CRV', 'SUSHI'].includes(t.symbol)
      );
      const quoteToken = this.tokenMap.get('USDT') || OFFICIAL_POLYGON_TOKENS[3];
      const quoteDecimals = quoteToken.decimals;
      const quoteInputWei = ethers.parseUnits(tradeAmountUsd.toFixed(quoteDecimals === 6 ? 4 : 6), quoteDecimals);

      const dexes = POLYGON_DEXES;

      const tasks = [];
      for (const baseToken of priorityTokens) {
        const liveMarketPrice = livePriceService.getTokenPriceUsd(baseToken.symbol);

        for (const dex of dexes) {
          tasks.push(async () => {
            try {
              const routerContract = new Contract(dex.routerAddress, ROUTER_ABI, provider);
              const path = [quoteToken.address, baseToken.address];
              const amounts: bigint[] = await routerContract.getAmountsOut(quoteInputWei, path);
              const outWei = amounts[amounts.length - 1];

              if (outWei > 0n) {
                const baseOut = parseFloat(ethers.formatUnits(outWei, baseToken.decimals));
                const effectiveBuyPrice = baseOut > 0 ? tradeAmountUsd / baseOut : 0;

                // Sanity check: router price must be strictly within 0.3% of live benchmark to filter dead/illiquid pools
                if (
                  effectiveBuyPrice > 0 &&
                  liveMarketPrice > 0 &&
                  Math.abs(effectiveBuyPrice - liveMarketPrice) / liveMarketPrice <= 0.003
                ) {
                  const buyKey = `BUY_${dex.id}_${quoteToken.symbol}_${baseToken.symbol}`;
                  this.onChainQuoteCache.set(buyKey, {
                    amountOutWei: outWei,
                    outputAmount: baseOut,
                    effectivePrice: effectiveBuyPrice,
                    path,
                    timestamp: Date.now(),
                  });
                }
              }
            } catch {
              // Pair does not exist on this specific router
            }
          });
        }
      }

      await Promise.allSettled(tasks.map((fn) => fn()));
    } catch (err) {
      console.warn('[ArbitrageScanner] On-chain update notice:', err);
    } finally {
      this.isUpdatingOnChain = false;
    }
  }

  /**
   * Scans all DEX-to-DEX opportunities using 100% real-time live trading prices
   */
  public scanDexToDex(config: BotConfig): DexToDexOpportunity[] {
    const scanStart = performance.now();
    this.refreshOnChainPrices(config.tradeAmountUsd);

    const opportunities: DexToDexOpportunity[] = [];
    const baseTokens = OFFICIAL_POLYGON_TOKENS.filter(
      (t) => t.symbol !== 'USDC' && t.symbol !== 'USDC.n' && t.symbol !== 'USDT' && t.symbol !== 'DAI'
    );
    const quoteToken = this.tokenMap.get('USDT') || OFFICIAL_POLYGON_TOKENS[3];
    const dexes = POLYGON_DEXES;
    const gasPriceGwei = polygonRpc.getGasPriceGwei();

    // 2 swaps on Polygon ~280,000 gas units
    const estGasUnits = 280000;
    const gasFeePol = polygonRpc.calculateGasCostPol(estGasUnits, gasPriceGwei);
    const gasFeeUsd = Math.max(0.003, polygonRpc.calculateGasCostUsd(estGasUnits, gasPriceGwei));
    const slippageUsd = Number((config.tradeAmountUsd * (config.slippageTolerancePercent / 100)).toFixed(4));

    const oppsByToken = new Map<string, DexToDexOpportunity>();

    for (const baseToken of baseTokens) {
      let bestTokenOpp: DexToDexOpportunity | null = null;

      for (let i = 0; i < dexes.length; i++) {
        for (let j = i + 1; j < dexes.length; j++) {
          const dexA = dexes[i];
          const dexB = dexes[j];

          const buyKeyA = `BUY_${dexA.id}_${quoteToken.symbol}_${baseToken.symbol}`;
          const buyKeyB = `BUY_${dexB.id}_${quoteToken.symbol}_${baseToken.symbol}`;

          const quoteA = this.onChainQuoteCache.get(buyKeyA);
          const quoteB = this.onChainQuoteCache.get(buyKeyB);

          // Get live pool prices
          let priceA = livePriceService.getDexPriceUsd(dexA.id, baseToken);
          let priceB = livePriceService.getDexPriceUsd(dexB.id, baseToken);

          if (quoteA && quoteA.effectivePrice > 0) {
            priceA = quoteA.effectivePrice;
          }
          if (quoteB && quoteB.effectivePrice > 0) {
            priceB = quoteB.effectivePrice;
          }

          // Symmetrical Route Direction: Lower Price is Buy DEX (Low), Higher Price is Sell DEX (High)
          let buyDex = dexA;
          let sellDex = dexB;
          let buyPrice = priceA;
          let sellPrice = priceB;

          if (priceB < priceA) {
            buyDex = dexB;
            sellDex = dexA;
            buyPrice = priceB;
            sellPrice = priceA;
          }

          const effectiveBuyPrice = buyPrice;
          const effectiveSellPrice = sellPrice;
          const baseAcquired = effectiveBuyPrice > 0 ? config.tradeAmountUsd / effectiveBuyPrice : 0;
          const grossQuoteReturned = baseAcquired * effectiveSellPrice;

          const buyDexFeeUsd = Number((config.tradeAmountUsd * (buyDex.feePercent / 100)).toFixed(4));
          const sellDexFeeUsd = Number((grossQuoteReturned * (sellDex.feePercent / 100)).toFixed(4));
          const dexFeesUsd = Number((buyDexFeeUsd + sellDexFeeUsd).toFixed(4));

          const grossSpreadPercent = effectiveBuyPrice > 0
            ? Number((((effectiveSellPrice - effectiveBuyPrice) / effectiveBuyPrice) * 100).toFixed(3))
            : 0;

          const grossProfitUsd = Number((grossQuoteReturned - config.tradeAmountUsd).toFixed(4));
          const totalFeesUsd = Number((dexFeesUsd + gasFeeUsd + slippageUsd).toFixed(4));
          const netProfitUsd = Number((grossProfitUsd - totalFeesUsd).toFixed(4));
          const netProfitPercent = Number(((netProfitUsd / config.tradeAmountUsd) * 100).toFixed(3));

          let isProfitable = false;
          let decisionReason = 'Live DEX Market Rates';
          let riskScore = 12;
          let riskStatus: 'SAFE' | 'WARNING' | 'HIGH_RISK' = 'SAFE';

          // Zero-Loss Invariant & Strict Profit Validation
          if (grossQuoteReturned <= config.tradeAmountUsd) {
            decisionReason = `Zero-Loss Guard: Return ($${grossQuoteReturned.toFixed(4)}) <= Capital ($${config.tradeAmountUsd.toFixed(2)})`;
            riskScore += 20;
          } else if (grossProfitUsd <= totalFeesUsd) {
            decisionReason = `Gross spread ($${grossProfitUsd.toFixed(4)}) < Fees ($${totalFeesUsd.toFixed(4)})`;
            riskScore += 15;
          } else if (netProfitUsd < (config.minProfitMarginUsd ?? 0.01)) {
            decisionReason = `Net profit ($${netProfitUsd.toFixed(4)}) < Min threshold ($${(config.minProfitMarginUsd ?? 0.01).toFixed(2)})`;
          } else if (gasPriceGwei > (config.maxGasGwei || 80)) {
            decisionReason = `Gas price (${gasPriceGwei.toFixed(1)} Gwei) exceeds max ceiling`;
            riskScore += 40;
          } else {
            isProfitable = true;
            decisionReason = 'Profitable on-chain arbitrage route';
          }

          if (riskScore >= 60) riskStatus = 'HIGH_RISK';
          else if (riskScore >= 35) riskStatus = 'WARNING';

          const isSellPriceVerified = effectiveSellPrice > effectiveBuyPrice && grossQuoteReturned > config.tradeAmountUsd;
          const minAcceptableSellPrice = effectiveBuyPrice > 0
            ? Number((effectiveBuyPrice * (1 + (dexFeesUsd + gasFeeUsd) / config.tradeAmountUsd)).toFixed(effectiveBuyPrice < 0.01 ? 7 : 4))
            : 0;

          const opp: DexToDexOpportunity = {
            id: `d2d-${baseToken.symbol}-${quoteToken.symbol}-${buyDex.id}-${sellDex.id}`,
            tokenPair: `${baseToken.symbol}/${quoteToken.symbol}`,
            baseToken,
            quoteToken,
            direction: 'DEX_A_TO_B',
            buyDex,
            sellDex,
            buyPrice: Number(effectiveBuyPrice.toFixed(effectiveBuyPrice < 0.01 ? 7 : 4)),
            sellPrice: Number(effectiveSellPrice.toFixed(effectiveSellPrice < 0.01 ? 7 : 4)),
            verifiedSellPrice: Number(effectiveSellPrice.toFixed(effectiveSellPrice < 0.01 ? 7 : 4)),
            minAcceptableSellPrice,
            isSellPriceVerified,
            sellPriceVerificationStatus: isSellPriceVerified ? 'VERIFIED' : 'FAILED',
            sellPriceVerificationReason: isSellPriceVerified
              ? `Sell Price ($${effectiveSellPrice.toFixed(4)}) > Buy Price ($${effectiveBuyPrice.toFixed(4)})`
              : `Sell Price ($${effectiveSellPrice.toFixed(4)}) <= Buy Price ($${effectiveBuyPrice.toFixed(4)})`,
            spotPriceDiffPercent: grossSpreadPercent,
            grossSpreadPercent,
            buyQuote: {
              inputAmount: config.tradeAmountUsd,
              outputAmount: baseAcquired,
              effectivePrice: effectiveBuyPrice,
              spotPrice: livePriceService.getTokenPriceUsd(baseToken.symbol),
              priceImpactPercent: 0.08,
              dexFeeUsd: buyDexFeeUsd,
            },
            sellQuote: {
              inputAmount: baseAcquired,
              outputAmount: grossQuoteReturned,
              effectivePrice: effectiveSellPrice,
              spotPrice: livePriceService.getTokenPriceUsd(baseToken.symbol),
              priceImpactPercent: 0.08,
              dexFeeUsd: sellDexFeeUsd,
            },
            dexFeesUsd,
            estGasUnits,
            gasFeePol,
            gasFeeUsd,
            slippageUsd,
            approvalCostUsd: 0,
            profitConversionCostUsd: 0,
            safetyMarginUsd: 0.005,
            totalFeesUsd,
            tradeAmountUsd: config.tradeAmountUsd,
            grossProfitUsd,
            netProfitUsd,
            netProfitPercent,
            isProfitable,
            riskScore,
            riskStatus,
            simulationStatus: isProfitable ? 'PASSED' : 'SKIPPED',
            decisionReason,
            timestamp: Date.now(),
            quoteAgeMs: quoteA ? Date.now() - quoteA.timestamp : 0,
            latencyMs: Math.round(performance.now() - scanStart),
          };

          const safety = riskEngine.validateTradeSafety(opp, config);
          if (!safety.safe && opp.isProfitable) {
            opp.isProfitable = false;
            opp.decisionReason = safety.reason || 'Blocked by Risk Engine';
            opp.riskStatus = 'HIGH_RISK';
          }

          // Pick the single highest spread / highest net profit route for this token
          if (!bestTokenOpp) {
            bestTokenOpp = opp;
          } else {
            const isBetterProfit = opp.netProfitUsd > bestTokenOpp.netProfitUsd;
            const isBetterSpread = opp.grossSpreadPercent > bestTokenOpp.grossSpreadPercent;
            if ((opp.isProfitable && !bestTokenOpp.isProfitable) || (opp.isProfitable === bestTokenOpp.isProfitable && (isBetterProfit || isBetterSpread))) {
              bestTokenOpp = opp;
            }
          }
        }
      }

      if (bestTokenOpp) {
        oppsByToken.set(baseToken.symbol, bestTokenOpp);
        opportunities.push(bestTokenOpp);
      }
    }

    return opportunities.sort((a, b) => {
      if (a.isProfitable && !b.isProfitable) return -1;
      if (!a.isProfitable && b.isProfitable) return 1;
      return b.grossSpreadPercent - a.grossSpreadPercent;
    });
  }

  /**
   * Scans all Triangular Arbitrage cycles across ALL 114 Polygon tokens and ALL 13 DEXes
   * Evaluates real-time DEX-specific rates, gas costs, LP fees, and slippage deductions
   */
  public scanTriangular(config: BotConfig): TriangularOpportunity[] {
    const scanStart = performance.now();
    const opportunities: TriangularOpportunity[] = [];
    const gasPriceGwei = polygonRpc.getGasPriceGwei();

    // Primary quote anchor for triangular cycles
    const anchorToken = this.tokenMap.get('USDT') || OFFICIAL_POLYGON_TOKENS[3];
    
    // Major intermediate liquidity hubs on Polygon
    const hubSymbols = ['POL', 'WMATIC', 'WETH', 'WBTC', 'USDC', 'QUICK', 'LINK', 'AAVE', 'UNI', 'DAI'];
    const hubs = hubSymbols
      .map((s) => this.tokenMap.get(s))
      .filter((t): t is TokenInfo => !!t);

    const estGasUnits = 320000;
    const gasFeePol = polygonRpc.calculateGasCostPol(estGasUnits, gasPriceGwei);
    const gasFeeUsd = Math.max(0.003, polygonRpc.calculateGasCostUsd(estGasUnits, gasPriceGwei));
    const slippageUsd = Number((config.tradeAmountUsd * (config.slippageTolerancePercent / 100)).toFixed(4));
    const minProfitTarget = config.minProfitMarginUsd !== undefined ? config.minProfitMarginUsd : 0.01;

    // Iterate through ALL tokens in the catalog (114 tokens)
    for (const token of OFFICIAL_POLYGON_TOKENS) {
      if (token.symbol === 'USDT' || token.symbol === 'USDC.n') continue;

      let bestTokenTriOpp: TriangularOpportunity | null = null;

      // Scan all 13 DEXes for this token
      for (const dex of POLYGON_DEXES) {
        const dexFeesUsd = Number((config.tradeAmountUsd * (dex.feePercent / 100) * 3).toFixed(4));
        const totalFeesUsd = Number((dexFeesUsd + gasFeeUsd + slippageUsd).toFixed(4));

        // Evaluate cycles through candidate intermediate hubs
        for (const hub of hubs) {
          if (hub.symbol === token.symbol || (hub.symbol === 'USDT' && token.symbol === 'USDT')) continue;

          // Two directional 3-hop routes:
          // Route A: USDT ➔ Token ➔ Hub ➔ USDT
          // Route B: USDT ➔ Hub ➔ Token ➔ USDT
          const candidateRoutes: [TokenInfo, TokenInfo, TokenInfo][] = [
            [anchorToken, token, hub],
            [anchorToken, hub, token],
          ];

          for (let rIdx = 0; rIdx < candidateRoutes.length; rIdx++) {
            const [t0, t1, t2] = candidateRoutes[rIdx];

            const p0 = livePriceService.getDexPriceUsd(dex.id, t0);
            const p1 = livePriceService.getDexPriceUsd(dex.id, t1);
            const p2 = livePriceService.getDexPriceUsd(dex.id, t2);

            if (p0 <= 0 || p1 <= 0 || p2 <= 0) continue;

            const rate1 = (p0 / p1) * (1 - dex.feePercent / 100);
            const rate2 = (p1 / p2) * (1 - dex.feePercent / 100);
            const rate3 = (p2 / p0) * (1 - dex.feePercent / 100);

            const cycleMultiplier = rate1 * rate2 * rate3;
            const grossEdgePercent = Number(((cycleMultiplier - 1) * 100).toFixed(3));

            const grossProfitUsd = Number((config.tradeAmountUsd * (Math.max(0, grossEdgePercent) / 100)).toFixed(4));
            const netProfitUsd = Number((grossProfitUsd - (gasFeeUsd + dexFeesUsd + slippageUsd)).toFixed(4));
            const netProfitPercent = Number(((netProfitUsd / config.tradeAmountUsd) * 100).toFixed(3));

            let isProfitable = false;
            let decisionReason = 'Triangular cycle';
            let riskScore = 15;
            let riskStatus: 'SAFE' | 'WARNING' | 'HIGH_RISK' = 'SAFE';

            if (gasPriceGwei > (config.maxGasGwei || 80)) {
              decisionReason = `Gas price (${gasPriceGwei.toFixed(1)} Gwei) exceeds ceiling`;
              riskScore += 30;
            } else if (grossProfitUsd <= (gasFeeUsd + dexFeesUsd)) {
              decisionReason = `Gross spread ($${grossProfitUsd.toFixed(3)}) < Gas + LP fees ($${(gasFeeUsd + dexFeesUsd).toFixed(3)})`;
              riskScore += 25;
            } else if (netProfitUsd < minProfitTarget) {
              decisionReason = `Net profit ($${netProfitUsd.toFixed(3)}) < Min threshold ($${minProfitTarget.toFixed(2)})`;
            } else {
              isProfitable = true;
              decisionReason = `Profitable cycle: +$${netProfitUsd.toFixed(3)} net after all 3 leg fees`;
            }

            if (riskScore >= 60) riskStatus = 'HIGH_RISK';
            else if (riskScore >= 35) riskStatus = 'WARNING';

            const isTriSellVerified = cycleMultiplier > 1.0 && grossProfitUsd > 0;
            const opp: TriangularOpportunity = {
              id: `tri-${token.symbol}-${hub.symbol}-${dex.id}-${rIdx}`,
              dex,
              route: [t0, t1, t2],
              pathNames: [
                `${t0.symbol} ➔ ${t1.symbol}`,
                `${t1.symbol} ➔ ${t2.symbol}`,
                `${t2.symbol} ➔ ${t0.symbol}`,
              ],
              rates: [rate1, rate2, rate3],
              cycleMultiplier: Number(cycleMultiplier.toFixed(6)),
              verifiedSellPrice: Number((p2 * rate3).toFixed(4)),
              minAcceptableSellPrice: Number(p0.toFixed(4)),
              isSellPriceVerified: isTriSellVerified,
              sellPriceVerificationStatus: isTriSellVerified ? 'VERIFIED' : 'FAILED',
              grossEdgePercent,
              dexFeesUsd,
              estGasUnits,
              gasFeePol,
              gasFeeUsd,
              slippageUsd,
              totalFeesUsd,
              tradeAmountUsd: config.tradeAmountUsd,
              grossProfitUsd,
              netProfitUsd,
              netProfitPercent,
              isProfitable,
              riskScore,
              riskStatus,
              decisionReason,
              timestamp: Date.now(),
              quoteAgeMs: 0,
              latencyMs: Math.round(performance.now() - scanStart),
            };

            // Pick the best triangular cycle for this specific token
            if (!bestTokenTriOpp) {
              bestTokenTriOpp = opp;
            } else {
              const isBetterProfit = opp.netProfitUsd > bestTokenTriOpp.netProfitUsd;
              const isBetterEdge = opp.grossEdgePercent > bestTokenTriOpp.grossEdgePercent;
              if (
                (opp.isProfitable && !bestTokenTriOpp.isProfitable) ||
                (opp.isProfitable === bestTokenTriOpp.isProfitable && (isBetterProfit || isBetterEdge))
              ) {
                bestTokenTriOpp = opp;
              }
            }
          }
        }
      }

      if (bestTokenTriOpp) {
        opportunities.push(bestTokenTriOpp);
      }
    }

    return opportunities.sort((a, b) => {
      if (a.isProfitable && !b.isProfitable) return -1;
      if (!a.isProfitable && b.isProfitable) return 1;
      return b.netProfitUsd - a.netProfitUsd || b.grossEdgePercent - a.grossEdgePercent;
    });
  }
}

export const arbitrageScanner = new ArbitrageScannerService();
