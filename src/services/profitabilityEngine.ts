import { TokenInfo, DexInfo, ExecutableQuote, DexToDexOpportunity, BotConfig } from '../types';
import { polygonRpc } from './polygonRpc';

export interface PoolReserves {
  reserveBase: number;
  reserveQuote: number;
  spotPrice: number; // Quote per Base
}

export interface DirectionEvaluationResult {
  direction: 'DEX_A_TO_B' | 'DEX_B_TO_A';
  buyDex: DexInfo;
  sellDex: DexInfo;
  buyQuote: ExecutableQuote;
  sellQuote: ExecutableQuote;
  grossSpreadPercent: number;
  spotPriceDiffPercent: number;
  tradeAmountUsd: number;
  expectedFinalAmountUsd: number;
  grossProfitUsd: number;
  buyDexFeeUsd: number;
  sellDexFeeUsd: number;
  dexFeesUsd: number;
  estGasUnits: number;
  gasFeePol: number;
  gasFeeUsd: number;
  slippageUsd: number;
  approvalCostUsd: number;
  profitConversionCostUsd: number;
  safetyMarginUsd: number;
  totalFeesUsd: number;
  netProfitUsd: number;
  netProfitPercent: number;
  isProfitable: boolean;
  riskScore: number;
  riskStatus: 'SAFE' | 'WARNING' | 'HIGH_RISK';
  decisionReason: string;
}

export class ProfitabilityEngine {
  /**
   * Exact AMM constant-product output calculation (x * y = k)
   * Formula: amountOut = (amountInWithFee * reserveOut) / (reserveIn * 10000 + amountInWithFee)
   */
  public calculateAmmAmountOut(
    amountIn: number,
    reserveIn: number,
    reserveOut: number,
    feePercent: number
  ): { amountOut: number; priceImpactPercent: number } {
    if (amountIn <= 0 || reserveIn <= 0 || reserveOut <= 0) {
      return { amountOut: 0, priceImpactPercent: 100 };
    }

    const feeMultiplier = 1 - feePercent / 100;
    const amountInWithFee = amountIn * feeMultiplier;
    const numerator = amountInWithFee * reserveOut;
    const denominator = reserveIn + amountInWithFee;

    const amountOut = numerator / denominator;

    // Spot price before trade = reserveOut / reserveIn
    const spotPrice = reserveOut / reserveIn;
    // Execution rate = amountOut / amountIn
    const executionRate = amountOut / amountIn;
    // Price impact relative to spot price
    const priceImpactPercent = Math.max(0, ((spotPrice - executionRate) / spotPrice) * 100);

    return {
      amountOut,
      priceImpactPercent: Number(priceImpactPercent.toFixed(3)),
    };
  }

  /**
   * Generates simulated realistic pool reserves based on base price and liquidity depth
   */
  public getSimulatedPoolReserves(
    token: TokenInfo,
    quoteToken: TokenInfo,
    dex: DexInfo,
    priceJitterPct: number = 0
  ): PoolReserves {
    const effectiveBasePrice = token.basePriceUsd * (1 + priceJitterPct);
    const spotPrice = effectiveBasePrice / quoteToken.basePriceUsd;

    // Typical high liquidity pool on Polygon ($50k - $2M depth)
    let liquidityUsd = 250000;
    if (dex.id === 'quickswap') liquidityUsd = 650000;
    if (dex.id === 'sushiswap') liquidityUsd = 400000;
    if (dex.id === 'uniswap_v3') liquidityUsd = 1200000;
    if (dex.id === 'apeswap') liquidityUsd = 180000;
    if (dex.id === 'dfyn') liquidityUsd = 150000;

    const reserveQuote = liquidityUsd / 2;
    const reserveBase = reserveQuote / spotPrice;

    return {
      reserveBase,
      reserveQuote,
      spotPrice,
    };
  }

  /**
   * Evaluates a single specific trade direction:
   * 1. Start with quoteAmountIn (e.g. USDT)
   * 2. Buy baseToken on buyDex -> receive baseTokenAmountOut
   * 3. Sell baseTokenAmountOut on sellDex -> receive quoteAmountOut
   * 4. Deduct all fees, gas, slippage, approval, and profit conversion costs
   */
  public evaluateSingleDirection(
    direction: 'DEX_A_TO_B' | 'DEX_B_TO_A',
    baseToken: TokenInfo,
    quoteToken: TokenInfo,
    buyDex: DexInfo,
    sellDex: DexInfo,
    buyReserves: PoolReserves,
    sellReserves: PoolReserves,
    tradeAmountUsd: number,
    config: BotConfig,
    hasExistingApproval: boolean = true
  ): DirectionEvaluationResult {
    const gasPriceGwei = polygonRpc.getGasPriceGwei();
    const polPriceUsd = polygonRpc.getPolPriceUsd();

    // 1. BUY LEG (Quote Asset -> Base Token on Buy DEX)
    const quoteIn = tradeAmountUsd; // in Quote units (e.g. USDT)
    const buySwap = this.calculateAmmAmountOut(
      quoteIn,
      buyReserves.reserveQuote,
      buyReserves.reserveBase,
      buyDex.feePercent
    );

    const baseTokensAcquired = buySwap.amountOut;
    // Effective Buy Price (Ask) = Quote spent per BaseToken received
    const effectiveBuyPrice = baseTokensAcquired > 0 ? quoteIn / baseTokensAcquired : 0;
    const buyDexFeeUsd = quoteIn * (buyDex.feePercent / 100);

    const buyQuote: ExecutableQuote = {
      inputAmount: quoteIn,
      outputAmount: baseTokensAcquired,
      effectivePrice: Number(effectiveBuyPrice.toFixed(6)),
      spotPrice: buyReserves.spotPrice,
      priceImpactPercent: buySwap.priceImpactPercent,
      dexFeeUsd: Number(buyDexFeeUsd.toFixed(4)),
    };

    // 2. SELL LEG (Base Token -> Quote Asset on Sell DEX)
    const sellSwap = this.calculateAmmAmountOut(
      baseTokensAcquired,
      sellReserves.reserveBase,
      sellReserves.reserveQuote,
      sellDex.feePercent
    );

    const finalQuoteReceived = sellSwap.amountOut;
    // Effective Sell Price (Bid) = Quote received per BaseToken sold
    const effectiveSellPrice = baseTokensAcquired > 0 ? finalQuoteReceived / baseTokensAcquired : 0;
    const sellDexFeeUsd = finalQuoteReceived * (sellDex.feePercent / 100);

    const sellQuote: ExecutableQuote = {
      inputAmount: baseTokensAcquired,
      outputAmount: finalQuoteReceived,
      effectivePrice: Number(effectiveSellPrice.toFixed(6)),
      spotPrice: sellReserves.spotPrice,
      priceImpactPercent: sellSwap.priceImpactPercent,
      dexFeeUsd: Number(sellDexFeeUsd.toFixed(4)),
    };

    // 3. GROSS CALCULATIONS
    const grossProfitUsd = Number((finalQuoteReceived - quoteIn).toFixed(4));
    const grossSpreadPercent = effectiveBuyPrice > 0
      ? Number((((effectiveSellPrice - effectiveBuyPrice) / effectiveBuyPrice) * 100).toFixed(3))
      : 0;

    const spotPriceDiffPercent = buyReserves.spotPrice > 0
      ? Number((((sellReserves.spotPrice - buyReserves.spotPrice) / buyReserves.spotPrice) * 100).toFixed(3))
      : 0;

    // 4. GAS & FEE BREAKDOWN
    // Multi-leg atomic/2-leg gas (~280,000 gas units on Polygon)
    const estGasUnits = 280000;
    const gasFeePol = polygonRpc.calculateGasCostPol(estGasUnits, gasPriceGwei);
    const gasFeeUsd = Number(polygonRpc.calculateGasCostUsd(estGasUnits, gasPriceGwei).toFixed(4));
    const dexFeesUsd = Number((buyDexFeeUsd + sellDexFeeUsd).toFixed(4));

    // Slippage allowance buffer
    const slippageUsd = Number((tradeAmountUsd * (config.slippageTolerancePercent / 100)).toFixed(4));

    // Approval cost (0 if already approved, otherwise ~45,000 gas)
    const approvalCostUsd = hasExistingApproval ? 0 : Number((polygonRpc.calculateGasCostUsd(45000, gasPriceGwei)).toFixed(4));

    // Profit conversion cost to POL (only if profit conversion enabled & gross profit > 0)
    const profitConversionCostUsd = config.profitConversionToPol && grossProfitUsd > 0.05
      ? Number((polygonRpc.calculateGasCostUsd(120000, gasPriceGwei) + grossProfitUsd * 0.003).toFixed(4))
      : 0;

    // Safety margin ($0.01 floor)
    const safetyMarginUsd = 0.01;

    const totalFeesUsd = Number(
      (dexFeesUsd + gasFeeUsd + slippageUsd + approvalCostUsd + profitConversionCostUsd + safetyMarginUsd).toFixed(4)
    );

    // 5. NET PROFIT FORMULA
    // Net Profit = Gross Profit - DEX Fees - Gas Cost - Slippage - Approval - Profit Conversion - Safety Margin
    const netProfitUsd = Number((grossProfitUsd - (gasFeeUsd + slippageUsd + approvalCostUsd + profitConversionCostUsd + safetyMarginUsd)).toFixed(4));
    const netProfitPercent = tradeAmountUsd > 0 ? Number(((netProfitUsd / tradeAmountUsd) * 100).toFixed(3)) : 0;

    // 6. RISK SCORING
    let riskScore = 10;
    let riskStatus: 'SAFE' | 'WARNING' | 'HIGH_RISK' = 'SAFE';

    const maxPriceImpact = Math.max(buySwap.priceImpactPercent, sellSwap.priceImpactPercent);
    if (maxPriceImpact > 1.5) riskScore += 30;
    if (maxPriceImpact > config.maxPriceImpactPercent) riskScore += 40;
    if (gasPriceGwei > config.maxGasGwei) riskScore += 25;
    if (grossSpreadPercent < 0.20) riskScore += 20;

    if (riskScore >= 70) riskStatus = 'HIGH_RISK';
    else if (riskScore >= 40) riskStatus = 'WARNING';

    // 7. DECISION & VALIDATION
    let isProfitable = false;
    let decisionReason = 'Profitable execution spread';

    if (gasPriceGwei > config.maxGasGwei) {
      decisionReason = `Gas (${gasPriceGwei.toFixed(1)} Gwei) exceeds ceiling (${config.maxGasGwei} Gwei)`;
    } else if (maxPriceImpact > config.maxPriceImpactPercent) {
      decisionReason = `Price impact (${maxPriceImpact.toFixed(2)}%) exceeds limit (${config.maxPriceImpactPercent}%)`;
    } else if (grossProfitUsd <= 0) {
      decisionReason = `Inverted prices: Buy Ask ($${effectiveBuyPrice.toFixed(4)}) >= Sell Bid ($${effectiveSellPrice.toFixed(4)})`;
    } else if (grossProfitUsd <= gasFeeUsd + dexFeesUsd) {
      decisionReason = `Gross profit ($${grossProfitUsd.toFixed(3)}) insufficient to cover gas ($${gasFeeUsd.toFixed(3)}) + fees ($${dexFeesUsd.toFixed(3)})`;
    } else if (netProfitUsd < config.minProfitMarginUsd) {
      decisionReason = `Net profit ($${netProfitUsd.toFixed(3)}) below min threshold ($${config.minProfitMarginUsd.toFixed(2)})`;
    } else if (netProfitPercent < config.minProfitPercent) {
      decisionReason = `Net ROI (${netProfitPercent.toFixed(2)}%) below required min (${config.minProfitPercent.toFixed(2)}%)`;
    } else {
      isProfitable = true;
    }

    return {
      direction,
      buyDex,
      sellDex,
      buyQuote,
      sellQuote,
      grossSpreadPercent,
      spotPriceDiffPercent,
      tradeAmountUsd,
      expectedFinalAmountUsd: Number(finalQuoteReceived.toFixed(4)),
      grossProfitUsd,
      buyDexFeeUsd: Number(buyDexFeeUsd.toFixed(4)),
      sellDexFeeUsd: Number(sellDexFeeUsd.toFixed(4)),
      dexFeesUsd,
      estGasUnits,
      gasFeePol,
      gasFeeUsd,
      slippageUsd,
      approvalCostUsd,
      profitConversionCostUsd,
      safetyMarginUsd,
      totalFeesUsd,
      netProfitUsd,
      netProfitPercent,
      isProfitable,
      riskScore,
      riskStatus,
      decisionReason,
    };
  }

  /**
   * Evaluates BOTH directions (A -> B and B -> A) and selects the strictly optimal direction
   */
  public evaluateBidirectionalArbitrage(
    baseToken: TokenInfo,
    quoteToken: TokenInfo,
    dexA: DexInfo,
    dexB: DexInfo,
    tradeAmountUsd: number,
    config: BotConfig,
    fluctuationA: number = 0,
    fluctuationB: number = 0
  ): DexToDexOpportunity {
    const scanStart = performance.now();

    const reservesA = this.getSimulatedPoolReserves(baseToken, quoteToken, dexA, fluctuationA);
    const reservesB = this.getSimulatedPoolReserves(baseToken, quoteToken, dexB, fluctuationB);

    // Direction 1: Buy on Dex A (Quote -> Base), Sell on Dex B (Base -> Quote)
    const evalDir1 = this.evaluateSingleDirection(
      'DEX_A_TO_B',
      baseToken,
      quoteToken,
      dexA, // Buy DEX
      dexB, // Sell DEX
      reservesA,
      reservesB,
      tradeAmountUsd,
      config
    );

    // Direction 2: Buy on Dex B (Quote -> Base), Sell on Dex A (Base -> Quote)
    const evalDir2 = this.evaluateSingleDirection(
      'DEX_B_TO_A',
      baseToken,
      quoteToken,
      dexB, // Buy DEX
      dexA, // Sell DEX
      reservesB,
      reservesA,
      tradeAmountUsd,
      config
    );

    // Choose the direction with highest net profit
    const bestEval = evalDir1.netProfitUsd >= evalDir2.netProfitUsd ? evalDir1 : evalDir2;

    const oppId = `d2d-${baseToken.symbol}-${quoteToken.symbol}-${bestEval.buyDex.id}-${bestEval.sellDex.id}`;

    return {
      id: oppId,
      tokenPair: `${baseToken.symbol}/${quoteToken.symbol}`,
      baseToken,
      quoteToken,
      direction: bestEval.direction,
      buyDex: bestEval.buyDex,
      sellDex: bestEval.sellDex,
      buyPrice: bestEval.buyQuote.effectivePrice,
      sellPrice: bestEval.sellQuote.effectivePrice,
      spotPriceDiffPercent: bestEval.spotPriceDiffPercent,
      grossSpreadPercent: bestEval.grossSpreadPercent,
      buyQuote: bestEval.buyQuote,
      sellQuote: bestEval.sellQuote,
      dexFeesUsd: bestEval.dexFeesUsd,
      estGasUnits: bestEval.estGasUnits,
      gasFeePol: bestEval.gasFeePol,
      gasFeeUsd: bestEval.gasFeeUsd,
      slippageUsd: bestEval.slippageUsd,
      approvalCostUsd: bestEval.approvalCostUsd,
      profitConversionCostUsd: bestEval.profitConversionCostUsd,
      safetyMarginUsd: bestEval.safetyMarginUsd,
      totalFeesUsd: bestEval.totalFeesUsd,
      tradeAmountUsd,
      grossProfitUsd: bestEval.grossProfitUsd,
      netProfitUsd: bestEval.netProfitUsd,
      netProfitPercent: bestEval.netProfitPercent,
      isProfitable: bestEval.isProfitable,
      riskScore: bestEval.riskScore,
      riskStatus: bestEval.riskStatus,
      simulationStatus: bestEval.isProfitable ? 'PASSED' : 'SKIPPED',
      decisionReason: bestEval.decisionReason,
      timestamp: Date.now(),
      quoteAgeMs: 0,
      latencyMs: Math.round(performance.now() - scanStart),
    };
  }
}

export const profitabilityEngine = new ProfitabilityEngine();
