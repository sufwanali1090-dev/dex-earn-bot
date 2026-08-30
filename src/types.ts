export interface TokenInfo {
  symbol: string;
  name: string;
  address: string;
  decimals: number;
  icon?: string;
  category: 'core' | 'stable' | 'defi' | 'gaming' | 'custom' | 'ai' | 'meme' | 'layer1' | 'infra';
  verified: boolean;
  basePriceUsd: number;
}

export interface DexInfo {
  id: string;
  name: string;
  routerAddress: string;
  factoryAddress: string;
  feePercent: number; // e.g. 0.3 for 0.3%
  protocol: 'uniswap_v2' | 'uniswap_v3' | 'custom';
  color: string;
}

export interface ExecutableQuote {
  inputAmount: number;
  outputAmount: number;
  effectivePrice: number; // Quote token per Base token (for Buy = Ask, for Sell = Bid)
  spotPrice: number;
  priceImpactPercent: number;
  dexFeeUsd: number;
}

export interface DexToDexOpportunity {
  id: string;
  tokenPair: string; // e.g. "WETH/USDT"
  baseToken: TokenInfo;
  quoteToken: TokenInfo;
  direction: 'DEX_A_TO_B' | 'DEX_B_TO_A';
  buyDex: DexInfo;
  sellDex: DexInfo;
  buyPrice: number; // Exact Effective Ask (USDT paid per BaseToken)
  sellPrice: number; // Exact Effective Bid (USDT received per BaseToken)
  verifiedSellPrice?: number; // On-chain verified live selling price
  minAcceptableSellPrice?: number; // Minimum price required to break even + profit
  isSellPriceVerified?: boolean; // Verified on-chain before execution
  sellPriceVerificationStatus?: 'VERIFIED' | 'FAILED' | 'PENDING';
  sellPriceVerificationReason?: string;
  spotPriceDiffPercent: number;
  grossSpreadPercent: number;
  buyQuote: ExecutableQuote;
  sellQuote: ExecutableQuote;
  dexFeesUsd: number;
  estGasUnits: number;
  gasFeePol: number; // Gas fee in native Polygon POL/MATIC token
  gasFeeUsd: number;
  slippageUsd: number;
  approvalCostUsd: number;
  profitConversionCostUsd: number;
  safetyMarginUsd: number;
  totalFeesUsd: number;
  tradeAmountUsd: number;
  grossProfitUsd: number;
  netProfitUsd: number;
  netProfitPercent: number;
  isProfitable: boolean;
  riskScore: number; // 0 (lowest risk) to 100
  riskStatus: 'SAFE' | 'WARNING' | 'HIGH_RISK';
  simulationStatus: 'PASSED' | 'FAILED' | 'PENDING' | 'SKIPPED';
  decisionReason: string;
  timestamp: number;
  quoteAgeMs: number;
  latencyMs: number;
}

export interface TriangularOpportunity {
  id: string;
  dex: DexInfo;
  route: [TokenInfo, TokenInfo, TokenInfo]; // e.g. [USDT, QUICK, WMATIC]
  pathNames: string[]; // ["USDT -> QUICK", "QUICK -> WMATIC", "WMATIC -> USDT"]
  rates: [number, number, number];
  cycleMultiplier: number;
  verifiedSellPrice?: number;
  minAcceptableSellPrice?: number;
  isSellPriceVerified?: boolean;
  sellPriceVerificationStatus?: 'VERIFIED' | 'FAILED' | 'PENDING';
  grossEdgePercent: number;
  dexFeesUsd: number;
  estGasUnits: number;
  gasFeePol: number;
  gasFeeUsd: number;
  slippageUsd: number;
  totalFeesUsd: number;
  tradeAmountUsd: number;
  grossProfitUsd: number;
  netProfitUsd: number;
  netProfitPercent: number;
  isProfitable: boolean;
  riskScore: number;
  riskStatus: 'SAFE' | 'WARNING' | 'HIGH_RISK';
  decisionReason: string;
  timestamp: number;
  quoteAgeMs: number;
  latencyMs: number;
}

export interface BotConfig {
  scanIntervalMs: number; // 50ms - 2000ms
  tradeAmountUsd: number; // default $50
  minProfitMarginUsd: number; // default $0.01
  minProfitPercent: number; // default 0.20%
  minSpreadPercent: number; // default 0.4%
  maxGasGwei: number; // default 80 Gwei
  maxPriceImpactPercent: number; // default 2.0%
  slippageTolerancePercent: number; // default 0.5%
  maxQuoteAgeMs: number; // default 4000ms
  activeStrategy: 'dex_to_dex' | 'triangular';
  autoTradeEnabled: boolean;
  emergencyStop: boolean; // Global Emergency Stop
  maxDailyLossUsd: number; // default $5.00
  strictGasShield: boolean; // Ensures Gross Profit > (Gas Fee + LP Fee + Slippage)
  verifySellPriceBeforeSell?: boolean; // Verifies live on-chain selling price before submitting sell tx
  profitConversionToPol: boolean; // Automatically convert realized profit to POL when safe
  soundAlerts: boolean;
  executionMode: 'PAPER' | 'LIVE';
  privateKey?: string; // Optional user private key for automated zero-popup live trading
  selectedTokens: string[];
  selectedDexes: string[];
}

export type LossCategory =
  | 'WRONG_QUOTE'
  | 'STALE_QUOTE'
  | 'PRICE_MOVEMENT'
  | 'SLIPPAGE'
  | 'PRICE_IMPACT'
  | 'GAS'
  | 'APPROVAL'
  | 'LIQUIDITY'
  | 'TOKEN_TAX'
  | 'ROUTE_FAILURE'
  | 'DEX_ERROR'
  | 'NONCE_ERROR'
  | 'RPC_ERROR'
  | 'EXECUTION_DELAY'
  | 'PARTIAL_EXECUTION'
  | 'PROFIT_CONVERSION_COST'
  | 'ACCOUNTING_ERROR'
  | 'USER_REJECTED'
  | 'NONE';

export interface TradeRecord {
  id: string;
  type: 'DEX_TO_DEX' | 'TRIANGULAR';
  timestamp: number;
  routeSummary: string;
  direction?: string;
  buyPrice?: number;
  sellPrice?: number;
  tradeAmountUsd: number;
  expectedFinalAmountUsd?: number;
  actualFinalAmountUsd?: number;
  grossProfitUsd: number;
  dexFeesUsd: number;
  gasFeePol: number;
  gasFeeUsd: number;
  netProfitUsd: number;
  expectedNetProfitUsd?: number;
  actualNetProfitUsd?: number;
  profitDifferenceUsd?: number;
  netRoiPercent: number;
  status: 'FILLED' | 'REVERTED' | 'SIMULATED' | 'SKIPPED';
  lossCategory?: LossCategory;
  skipOrFailureReason?: string;
  txHash?: string;
  buyTxHash?: string;
  sellTxHash?: string;
  executionTimeMs: number;
  mode: 'PAPER' | 'LIVE';
}

export interface BotStats {
  totalScans: number;
  opportunitiesFound: number;
  tradesExecuted: number;
  successfulTrades: number;
  failedTrades: number;
  totalVolumeUsd: number;
  grossProfitUsd: number;
  totalGasFeesPol: number;
  totalGasFeesUsd: number;
  totalDexFeesUsd: number;
  netProfitUsd: number;
  todayPnlUsd: number;
  winRate: number;
  bestTradeUsd: number;
}

export interface DailyRiskState {
  dateString: string;
  dailyRealizedLossUsd: number;
  dailyRealizedProfitUsd: number;
  consecutiveFailures: number;
  emergencyStopTriggered: boolean;
}

export interface LiveTradingPrerequisites {
  minUsdtRequired: number; // 0 USDT
  minPolGasUsdRequired: number; // $0.05 worth of POL
  currentUsdt: number;
  currentPol: number;
  currentPolUsd: number;
  meetsUsdtRequirement: boolean;
  meetsGasRequirement: boolean;
  canStartLiveTrading: boolean;
}

export interface RpcEndpoint {
  name: string;
  url: string;
  chainId: number;
  latencyMs: number;
  status: 'connected' | 'slow' | 'offline' | 'checking';
  isDefault?: boolean;
}

