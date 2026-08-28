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

// Pre-defined triangle cycles for fast scanning
export const TRIANGLE_CYCLES: {
  id: string;
  symbols: [string, string, string];
  dexId: string;
}[] = [
  { id: 'tri-1', symbols: ['USDC', 'WMATIC', 'WETH'], dexId: 'quickswap' },
  { id: 'tri-2', symbols: ['USDT', 'QUICK', 'WMATIC'], dexId: 'quickswap' },
  { id: 'tri-3', symbols: ['USDC', 'WBTC', 'WETH'], dexId: 'quickswap' },
  { id: 'tri-4', symbols: ['DAI', 'AAVE', 'WMATIC'], dexId: 'quickswap' },
  { id: 'tri-5', symbols: ['USDC', 'LINK', 'WETH'], dexId: 'quickswap' },
  { id: 'tri-6', symbols: ['USDT', 'SAND', 'WMATIC'], dexId: 'quickswap' },
  { id: 'tri-7', symbols: ['USDC', 'UNI', 'WMATIC'], dexId: 'sushiswap' },
  { id: 'tri-8', symbols: ['USDC', 'CRV', 'WETH'], dexId: 'sushiswap' },
  { id: 'tri-9', symbols: ['USDT', 'SUSHI', 'WMATIC'], dexId: 'sushiswap' },
  { id: 'tri-10', symbols: ['USDC', 'GRT', 'WETH'], dexId: 'quickswap' },
  { id: 'tri-11', symbols: ['USDC', 'GHST', 'WMATIC'], dexId: 'quickswap' },
  { id: 'tri-12', symbols: ['USDT', 'BAL', 'WETH'], dexId: 'sushiswap' },
  { id: 'tri-13', symbols: ['USDC', 'TEL', 'WMATIC'], dexId: 'quickswap' },
  { id: 'tri-14', symbols: ['DAI', 'MANA', 'WMATIC'], dexId: 'quickswap' },
];

export class ArbitrageScannerService {
  private tokenMap: Map<string, TokenInfo> = new Map();
  private dexMap: Map<string, DexInfo> = new Map();

  // Simulated live micro-fluctuations to emulate real high-frequency DEX orderbook shifts
  private dexPriceFluctuations: Map<string, number> = new Map();

  constructor() {
    OFFICIAL_POLYGON_TOKENS.forEach((t) => this.tokenMap.set(t.symbol, t));
    POLYGON_DEXES.forEach((d) => this.dexMap.set(d.id, d));
  }

  public getToken(symbol: string): TokenInfo | undefined {
    return this.tokenMap.get(symbol);
  }

  public getDex(id: string): DexInfo | undefined {
    return this.dexMap.get(id);
  }

  /**
   * Generates or fetches current token price on a specific DEX with millisecond tick noise
   */
  public getDexTokenPrice(token: TokenInfo, dex: DexInfo): number {
    const key = `${dex.id}_${token.symbol}`;
    let base = token.basePriceUsd;

    // Jitter per DEX
    const prevFluc = this.dexPriceFluctuations.get(key) || 0;
    // Micro brownian motion
    const delta = (Math.random() - 0.495) * 0.003; // +/- 0.3%
    const newFluc = Math.max(-0.025, Math.min(0.025, prevFluc + delta));
    this.dexPriceFluctuations.set(key, newFluc);

    // DEX specific bias
    let dexBias = 0;
    if (dex.id === 'quickswap') dexBias = 0.0005;
    if (dex.id === 'sushiswap') dexBias = -0.0003;
    if (dex.id === 'uniswap_v3') dexBias = 0.0002;
    if (dex.id === 'dfyn') dexBias = -0.001;
    if (dex.id === 'apeswap') dexBias = 0.0015;

    return base * (1 + newFluc + dexBias);
  }

  /**
   * Scans all DEX-to-DEX opportunities across all tokens and DEXes
   */
  public scanDexToDex(config: BotConfig): DexToDexOpportunity[] {
    const scanStart = performance.now();
    const opportunities: DexToDexOpportunity[] = [];
    const gasPriceGwei = polygonRpc.getGasPriceGwei();

    // Base tokens to pair against quote tokens
    const baseTokens = OFFICIAL_POLYGON_TOKENS.filter((t) => t.symbol !== 'USDC' && t.symbol !== 'USDT' && t.symbol !== 'DAI');
    const quoteTokens = OFFICIAL_POLYGON_TOKENS.filter((t) => t.symbol === 'USDC' || t.symbol === 'USDT' || t.symbol === 'DAI');
    const dexes = POLYGON_DEXES;

    for (const baseToken of baseTokens) {
      for (const quoteToken of quoteTokens) {
        // Evaluate all DEX pairs
        for (let i = 0; i < dexes.length; i++) {
          for (let j = i + 1; j < dexes.length; j++) {
            const dexA = dexes[i];
            const dexB = dexes[j];

            const priceA = this.getDexTokenPrice(baseToken, dexA);
            const priceB = this.getDexTokenPrice(baseToken, dexB);

            if (priceA <= 0 || priceB <= 0) continue;

            const buyDex = priceA < priceB ? dexA : dexB;
            const sellDex = priceA < priceB ? dexB : dexA;
            const buyPrice = Math.min(priceA, priceB);
            const sellPrice = Math.max(priceA, priceB);

            const grossSpreadPercent = ((sellPrice - buyPrice) / buyPrice) * 100;

            // Gas fee calculation for 2 on-chain swaps (approx 260,000 gas units total)
            const estGasUnits = 260000;
            const gasFeePol = polygonRpc.calculateGasCostPol(estGasUnits, gasPriceGwei);
            const gasFeeUsd = polygonRpc.calculateGasCostUsd(estGasUnits, gasPriceGwei);

            // DEX Trading Fees (e.g. 0.3% on Buy DEX + 0.3% on Sell DEX)
            const buyDexFeeUsd = config.tradeAmountUsd * (buyDex.feePercent / 100);
            const sellDexFeeUsd = config.tradeAmountUsd * (sellDex.feePercent / 100);
            const dexFeesUsd = buyDexFeeUsd + sellDexFeeUsd;

            // Slippage allowance
            const slippageUsd = config.tradeAmountUsd * (config.slippageTolerancePercent / 100) * 2;

            const totalFeesUsd = Number((dexFeesUsd + gasFeeUsd + slippageUsd).toFixed(4));
            const grossProfitUsd = Number((config.tradeAmountUsd * (grossSpreadPercent / 100)).toFixed(4));
            const netProfitUsd = Number((grossProfitUsd - totalFeesUsd).toFixed(4));
            const netProfitPercent = Number(((netProfitUsd / config.tradeAmountUsd) * 100).toFixed(3));

            const isProfitable =
              netProfitUsd >= config.minProfitMarginUsd &&
              grossSpreadPercent >= config.minSpreadPercent &&
              gasPriceGwei <= config.maxGasGwei &&
              (!config.strictGasShield || (grossProfitUsd > (gasFeeUsd + dexFeesUsd) && netProfitUsd > 0));

            const opp: DexToDexOpportunity = {
              id: `d2d-${baseToken.symbol}-${quoteToken.symbol}-${buyDex.id}-${sellDex.id}-${Date.now()}`,
              tokenPair: `${baseToken.symbol}/${quoteToken.symbol}`,
              baseToken,
              quoteToken,
              buyDex,
              sellDex,
              buyPrice,
              sellPrice,
              grossSpreadPercent: Number(grossSpreadPercent.toFixed(3)),
              dexFeesUsd: Number(dexFeesUsd.toFixed(4)),
              estGasUnits,
              gasFeePol,
              gasFeeUsd,
              slippageUsd: Number(slippageUsd.toFixed(4)),
              totalFeesUsd,
              tradeAmountUsd: config.tradeAmountUsd,
              grossProfitUsd,
              netProfitUsd,
              netProfitPercent,
              isProfitable,
              timestamp: Date.now(),
              latencyMs: Math.round(performance.now() - scanStart),
            };

            opportunities.push(opp);
          }
        }
      }
    }

    // Sort by net profit descending
    return opportunities.sort((a, b) => b.netProfitUsd - a.netProfitUsd);
  }

  /**
   * Scans all Triangular Arbitrage cycles
   */
  public scanTriangular(config: BotConfig): TriangularOpportunity[] {
    const scanStart = performance.now();
    const opportunities: TriangularOpportunity[] = [];
    const gasPriceGwei = polygonRpc.getGasPriceGwei();

    for (const cycleDef of TRIANGLE_CYCLES) {
      const t0 = this.tokenMap.get(cycleDef.symbols[0]);
      const t1 = this.tokenMap.get(cycleDef.symbols[1]);
      const t2 = this.tokenMap.get(cycleDef.symbols[2]);
      const dex = this.dexMap.get(cycleDef.dexId) || POLYGON_DEXES[0];

      if (!t0 || !t1 || !t2) continue;

      const p0 = this.getDexTokenPrice(t0, dex);
      const p1 = this.getDexTokenPrice(t1, dex);
      const p2 = this.getDexTokenPrice(t2, dex);

      // 3-hop rate calculation:
      // Hop 1: t0 -> t1 (Rate = p0 / p1)
      // Hop 2: t1 -> t2 (Rate = p1 / p2)
      // Hop 3: t2 -> t0 (Rate = p2 / p0)
      // With micro-market imbalance:
      const rate1 = (p0 / p1) * (1 + (Math.random() - 0.485) * 0.006);
      const rate2 = (p1 / p2) * (1 + (Math.random() - 0.485) * 0.006);
      const rate3 = (p2 / p0) * (1 + (Math.random() - 0.485) * 0.006);

      const cycleMultiplier = rate1 * rate2 * rate3;
      const grossEdgePercent = (cycleMultiplier - 1) * 100;

      // 3-hop gas fee calculation (approx 380,000 gas units)
      const estGasUnits = 380000;
      const gasFeePol = polygonRpc.calculateGasCostPol(estGasUnits, gasPriceGwei);
      const gasFeeUsd = polygonRpc.calculateGasCostUsd(estGasUnits, gasPriceGwei);

      // 3 swaps DEX fee
      const dexFeesUsd = config.tradeAmountUsd * (dex.feePercent / 100) * 3;

      // Slippage allowance
      const slippageUsd = config.tradeAmountUsd * (config.slippageTolerancePercent / 100) * 3;

      const totalFeesUsd = Number((dexFeesUsd + gasFeeUsd + slippageUsd).toFixed(4));
      const grossProfitUsd = Number((config.tradeAmountUsd * (Math.abs(grossEdgePercent) / 100)).toFixed(4));
      
      // Only positive edge yields gross profit in the right cycle direction
      const actualGrossProfit = grossEdgePercent > 0 ? grossProfitUsd : 0;
      const netProfitUsd = Number((actualGrossProfit - totalFeesUsd).toFixed(4));
      const netProfitPercent = Number(((netProfitUsd / config.tradeAmountUsd) * 100).toFixed(3));

      const isProfitable =
        grossEdgePercent > 0 &&
        netProfitUsd >= config.minProfitMarginUsd &&
        grossEdgePercent >= config.minSpreadPercent &&
        gasPriceGwei <= config.maxGasGwei &&
        (!config.strictGasShield || (actualGrossProfit > (gasFeeUsd + dexFeesUsd) && netProfitUsd > 0));

      const opp: TriangularOpportunity = {
        id: `tri-${cycleDef.id}-${dex.id}-${Date.now()}`,
        dex,
        route: [t0, t1, t2],
        pathNames: [
          `${t0.symbol} ➔ ${t1.symbol}`,
          `${t1.symbol} ➔ ${t2.symbol}`,
          `${t2.symbol} ➔ ${t0.symbol}`,
        ],
        rates: [rate1, rate2, rate3],
        cycleMultiplier: Number(cycleMultiplier.toFixed(6)),
        grossEdgePercent: Number(grossEdgePercent.toFixed(3)),
        dexFeesUsd: Number(dexFeesUsd.toFixed(4)),
        estGasUnits,
        gasFeePol,
        gasFeeUsd,
        slippageUsd: Number(slippageUsd.toFixed(4)),
        totalFeesUsd,
        tradeAmountUsd: config.tradeAmountUsd,
        grossProfitUsd: actualGrossProfit,
        netProfitUsd,
        netProfitPercent,
        isProfitable,
        timestamp: Date.now(),
        latencyMs: Math.round(performance.now() - scanStart),
      };

      opportunities.push(opp);
    }

    return opportunities.sort((a, b) => b.netProfitUsd - a.netProfitUsd);
  }
}

export const arbitrageScanner = new ArbitrageScannerService();
