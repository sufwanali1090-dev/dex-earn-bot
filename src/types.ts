export interface TokenInfo {
  symbol: string;
  name: string;
  address: string;
  decimals: number;
  icon?: string;
  category: 'core' | 'stable' | 'defi' | 'gaming' | 'custom';
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

export interface DexPriceQuote {
  dexId: string;
  dexName: string;
  tokenIn: string;
  tokenOut: string;
  price: number; // tokenOut per tokenIn
  liquidityUsd: number;
  timestamp: number;
}

export interface DexToDexOpportunity {
  id: string;
  tokenPair: string; // e.g. "WETH/USDC"
  baseToken: TokenInfo;
  quoteToken: TokenInfo;
  buyDex: DexInfo;
  sellDex: DexInfo;
  buyPrice: number;
  sellPrice: number;
  grossSpreadPercent: number;
  dexFeesUsd: number;
  estGasUnits: number;
  gasFeePol: number; // Gas fee in native Polygon POL/MATIC token
  gasFeeUsd: number;
  slippageUsd: number;
  totalFeesUsd: number;
  tradeAmountUsd: number;
  grossProfitUsd: number;
  netProfitUsd: number;
  netProfitPercent: number;
  isProfitable: boolean;
  timestamp: number;
  latencyMs: number;
}

export interface TriangularOpportunity {
  id: string;
  dex: DexInfo;
  route: [TokenInfo, TokenInfo, TokenInfo]; // e.g. [USDC, WMATIC, WETH]
  pathNames: string[]; // ["USDC -> WMATIC", "WMATIC -> WETH", "WETH -> USDC"]
  rates: [number, number, number];
  cycleMultiplier: number;
  grossEdgePercent: number;
  dexFeesUsd: number;
  estGasUnits: number;
  gasFeePol: number; // Gas fee in native Polygon POL/MATIC token
  gasFeeUsd: number;
  slippageUsd: number;
  totalFeesUsd: number;
  tradeAmountUsd: number;
  grossProfitUsd: number;
  netProfitUsd: number;
  netProfitPercent: number;
  isProfitable: boolean;
  timestamp: number;
  latencyMs: number;
}

export interface BotConfig {
  scanIntervalMs: number; // 50ms - 2000ms
  tradeAmountUsd: number; // default $50
  minProfitMarginUsd: number; // default $0.01
  minSpreadPercent: number; // default 0.4%
  maxGasGwei: number; // default 80 Gwei
  slippageTolerancePercent: number; // default 0.2%
  activeStrategy: 'dex_to_dex' | 'triangular';
  autoTradeEnabled: boolean;
  mevProtection: boolean;
  strictGasShield: boolean; // Ensures Gross Profit > (Gas Fee + LP Fee)
  soundAlerts: boolean;
  executionMode: 'PAPER' | 'LIVE';
  selectedTokens: string[]; // token addresses or symbols
  selectedDexes: string[]; // dex IDs
}

export interface TradeRecord {
  id: string;
  type: 'DEX_TO_DEX' | 'TRIANGULAR';
  timestamp: number;
  routeSummary: string;
  tradeAmountUsd: number;
  grossProfitUsd: number;
  dexFeesUsd: number;
  gasFeePol: number;
  gasFeeUsd: number;
  netProfitUsd: number;
  netRoiPercent: number;
  status: 'FILLED' | 'REVERTED' | 'SIMULATED';
  txHash?: string;
  executionTimeMs: number;
  mode: 'PAPER' | 'LIVE';
}

export interface BotStats {
  totalScans: number;
  opportunitiesFound: number;
  tradesExecuted: number;
  totalVolumeUsd: number;
  grossProfitUsd: number;
  totalGasFeesPol: number;
  totalGasFeesUsd: number;
  totalDexFeesUsd: number;
  netProfitUsd: number;
  winRate: number;
  bestTradeUsd: number;
}

export interface LiveTradingPrerequisites {
  minUsdtRequired: number; // 1.0 USDT
  minPolGasUsdRequired: number; // $0.50 worth of POL
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
