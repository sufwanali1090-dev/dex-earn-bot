import JSZip from 'jszip';
import { generateUpdatedPythonBotScript } from './pythonBotGenerator';

export async function downloadProjectZip(): Promise<void> {
  const zip = new JSZip();

  // 1. package.json
  zip.file(
    'package.json',
    JSON.stringify(
      {
        name: 'dexearn-polygon-arbitrage',
        version: '1.0.0',
        private: true,
        type: 'module',
        scripts: {
          dev: 'vite --port=3000 --host=0.0.0.0',
          build: 'vite build',
          preview: 'vite preview',
          lint: 'tsc --noEmit',
        },
        dependencies: {
          '@google/genai': '^2.4.0',
          '@tailwindcss/vite': '^4.1.14',
          '@vitejs/plugin-react': '^5.0.4',
          dotenv: '^17.2.3',
          ethers: '^6.17.0',
          express: '^4.21.2',
          jszip: '^3.10.1',
          'lucide-react': '^0.546.0',
          motion: '^12.23.24',
          react: '^19.0.1',
          'react-dom': '^19.0.1',
          vite: '^6.2.3',
        },
        devDependencies: {
          '@types/express': '^4.17.21',
          '@types/node': '^22.14.0',
          autoprefixer: '^10.4.21',
          esbuild: '^0.25.0',
          tailwindcss: '^4.1.14',
          tsx: '^4.21.0',
          typescript: '~5.8.2',
        },
      },
      null,
      2
    )
  );

  // 2. tsconfig.json
  zip.file(
    'tsconfig.json',
    JSON.stringify(
      {
        compilerOptions: {
          target: 'ES2020',
          useDefineForClassFields: true,
          lib: ['ES2020', 'DOM', 'DOM.Iterable'],
          module: 'ESNext',
          skipLibCheck: true,
          moduleResolution: 'bundler',
          allowImportingTsExtensions: true,
          resolveJsonModule: true,
          isolatedModules: true,
          noEmit: true,
          jsx: 'react-jsx',
          strict: true,
          noUnusedLocals: false,
          noUnusedParameters: false,
          noFallthroughCasesInSwitch: true,
          baseUrl: '.',
          paths: {
            '@/*': ['./*'],
          },
        },
        include: ['src'],
      },
      null,
      2
    )
  );

  // 3. vite.config.ts
  zip.file(
    'vite.config.ts',
    `import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
  server: {
    port: 3000,
    host: '0.0.0.0',
  },
});
`
  );

  // 4. index.html
  zip.file(
    'index.html',
    `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>DexEarn - Polygon DEX Arbitrage Bot</title>
    <meta name="description" content="High-frequency DEX-to-DEX and triangular arbitrage bot and scanner on Polygon Network." />
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;700&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet">
  </head>
  <body class="bg-[#0c0c14] text-slate-100 antialiased selection:bg-indigo-500 selection:text-white">
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
`
  );

  // 5. .env.example
  zip.file(
    '.env.example',
    `# Polygon RPC Configuration
VITE_POLYGON_RPC_URL=https://rpc.ankr.com/polygon

# (Optional) Private Key for Live On-Chain Trading execution
# LIVE_TRADING_PRIVATE_KEY=0x...
`
  );

  // 6. README.md
  zip.file(
    'README.md',
    `# DexEarn - Polygon DEX Arbitrage Bot & Scanner

A high-frequency real-time DEX-to-DEX and Triangular Cycle Arbitrage Scanner and Bot engineered specifically for the **Polygon PoS Network (Chain ID: 137)**.

---

## 🚀 Quick Start on PC

### Method 1: Web Dashboard (React + Vite + TypeScript)

1. **Install Dependencies**:
   \`\`\`bash
   npm install
   \`\`\`

2. **Run the Local Dev Server**:
   \`\`\`bash
   npm run dev
   \`\`\`

3. Open your browser and navigate to:
   👉 **\`http://localhost:3000\`**

---

### Method 2: Standalone Python Bot (Terminal / Background)

If you prefer running a headless background trading bot in Python:

1. **Install Web3 library**:
   \`\`\`bash
   pip install web3
   \`\`\`

2. **Run the Polygon Bot**:
   \`\`\`bash
   python polygon_arbitrage_bot.py
   \`\`\`

---

## ⚡ Features Included

- **Multi-Token Arbitrage Engine**: Scans 18+ verified Polygon tokens (WMATIC, USDC, USDT, DAI, WETH, WBTC, QUICK, LINK, AAVE, UNI, SAND, MANA, CRV, SUSHI, GRT, GHST).
- **DEX-to-DEX Gap Scanner**: Compares real-time pool reserves and quotes across QuickSwap, SushiSwap, Uniswap V3, Dfyn, and ApeSwap.
- **Triangular 3-Hop Multi-Cycle Engine**: Identifies cyclic token imbalance loops returning to initial stable assets.
- **Polygon Gas & Fee Subtraction**: Exact deduction of Polygon gas fees in Gwei/USD + swap fees (0.3%) + slippage before declaring net profitability.
- **Ankr Polygon RPC & Custom Node Switcher**: Pre-configured with \`https://rpc.ankr.com/polygon\` with latency testing.
- **Paper vs. Live Execution**: Instant simulation engine or live on-chain execution capability.
- **CSV Trade Export**: Download full audit logs and historical PnL reports.
`
  );

  // 7. Windows / Mac one-click run scripts
  zip.file(
    'start-dashboard.bat',
    `@echo off
echo ====================================================
echo Starting DexEarn Polygon Arbitrage Dashboard...
echo ====================================================
call npm install
call npm run dev
pause
`
  );

  zip.file(
    'start-dashboard.sh',
    `#!/bin/bash
echo "===================================================="
echo "Starting DexEarn Polygon Arbitrage Dashboard..."
echo "===================================================="
npm install
npm run dev
`
  );

  // 8. Python Bot Script
  zip.file('polygon_arbitrage_bot.py', generateUpdatedPythonBotScript());

  // 9. Source Code Files
  const src = zip.folder('src');
  if (src) {
    // main.tsx
    src.file(
      'main.tsx',
      `import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
`
    );

    // index.css
    src.file(
      'index.css',
      `@import "tailwindcss";

@layer base {
  body {
    background-color: #0c0c14;
    color: #f8fafc;
    font-family: 'Plus Jakarta Sans', system-ui, -apple-system, sans-serif;
  }
}
`
    );

    // types.ts
    src.file(
      'types.ts',
      `export interface TokenInfo {
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
  feePercent: number;
  protocol: 'uniswap_v2' | 'uniswap_v3' | 'custom';
  color: string;
}

export interface DexToDexOpportunity {
  id: string;
  tokenPair: string;
  baseToken: TokenInfo;
  quoteToken: TokenInfo;
  buyDex: DexInfo;
  sellDex: DexInfo;
  buyPrice: number;
  sellPrice: number;
  grossSpreadPercent: number;
  dexFeesUsd: number;
  estGasUnits: number;
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
  route: [TokenInfo, TokenInfo, TokenInfo];
  pathNames: string[];
  rates: [number, number, number];
  cycleMultiplier: number;
  grossEdgePercent: number;
  dexFeesUsd: number;
  estGasUnits: number;
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
  scanIntervalMs: number;
  tradeAmountUsd: number;
  minProfitMarginUsd: number;
  minSpreadPercent: number;
  maxGasGwei: number;
  slippageTolerancePercent: number;
  activeStrategy: 'dex_to_dex' | 'triangular';
  autoTradeEnabled: boolean;
  mevProtection: boolean;
  soundAlerts: boolean;
  executionMode: 'PAPER' | 'LIVE';
  selectedTokens: string[];
  selectedDexes: string[];
}

export interface TradeRecord {
  id: string;
  type: 'DEX_TO_DEX' | 'TRIANGULAR';
  timestamp: number;
  routeSummary: string;
  tradeAmountUsd: number;
  grossProfitUsd: number;
  dexFeesUsd: number;
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
  totalGasFeesUsd: number;
  totalDexFeesUsd: number;
  netProfitUsd: number;
  winRate: number;
  bestTradeUsd: number;
}

export interface RpcEndpoint {
  name: string;
  url: string;
  chainId: number;
  latencyMs: number;
  status: 'connected' | 'slow' | 'offline' | 'checking';
  isDefault?: boolean;
}
`
    );

    // data folder
    const dataFolder = src.folder('data');
    if (dataFolder) {
      dataFolder.file(
        'polygonTokens.ts',
        `import { TokenInfo } from '../types';

export const OFFICIAL_POLYGON_TOKENS: TokenInfo[] = [
  { symbol: 'WMATIC', name: 'Wrapped MATIC / POL', address: '0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270', decimals: 18, category: 'core', verified: true, basePriceUsd: 0.42 },
  { symbol: 'USDC', name: 'USD Coin (Bridged USDC.e)', address: '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174', decimals: 6, category: 'stable', verified: true, basePriceUsd: 1.0 },
  { symbol: 'USDC.n', name: 'Native USD Coin', address: '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359', decimals: 6, category: 'stable', verified: true, basePriceUsd: 1.0 },
  { symbol: 'USDT', name: 'Tether USD', address: '0xc2132D05D31c914a87C6611C10748AEb04B58e8F', decimals: 6, category: 'stable', verified: true, basePriceUsd: 1.0 },
  { symbol: 'DAI', name: 'Dai Stablecoin', address: '0x8f3Cf7ad23Cd3CaDbD9735AFf958023239c6A063', decimals: 18, category: 'stable', verified: true, basePriceUsd: 1.0 },
  { symbol: 'WETH', name: 'Wrapped Ether', address: '0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619', decimals: 18, category: 'core', verified: true, basePriceUsd: 2650.0 },
  { symbol: 'WBTC', name: 'Wrapped BTC', address: '0x1BFD67037B42Cf73acF2047067bd4F2C47D9BfD6', decimals: 8, category: 'core', verified: true, basePriceUsd: 87500.0 },
  { symbol: 'QUICK', name: 'QuickSwap Token', address: '0xB5C064F955D8e7F38fE0460C556a72987494eE17', decimals: 18, category: 'defi', verified: true, basePriceUsd: 0.048 },
  { symbol: 'LINK', name: 'Chainlink Token', address: '0x53E0bca35eC356BD5ddDFebbD1Fc0fD03FaBad39', decimals: 18, category: 'defi', verified: true, basePriceUsd: 15.8 },
  { symbol: 'AAVE', name: 'Aave Token', address: '0xD6DF932A45C0f255f85145f286eA0b292B21C90B', decimals: 18, category: 'defi', verified: true, basePriceUsd: 182.0 },
  { symbol: 'UNI', name: 'Uniswap Token', address: '0xb33EaAd8d922B1083446DC23f610c2567fB5180f', decimals: 18, category: 'defi', verified: true, basePriceUsd: 8.9 },
  { symbol: 'SAND', name: 'The Sandbox', address: '0xBbba073C31bF03b8ACf7c28EF0781859556254b1', decimals: 18, category: 'gaming', verified: true, basePriceUsd: 0.38 },
  { symbol: 'MANA', name: 'Decentraland', address: '0xA1c57f48F0De49958348cb5e381088a6A6E470E7', decimals: 18, category: 'gaming', verified: true, basePriceUsd: 0.34 },
  { symbol: 'CRV', name: 'Curve DAO Token', address: '0x172370d5Cd63279eFa6d502DAB29171933a610AF', decimals: 18, category: 'defi', verified: true, basePriceUsd: 0.45 },
  { symbol: 'SUSHI', name: 'SushiToken', address: '0x0b3F868E0BE5597D5DB7fEB59E1CADBb0fdDa50a', decimals: 18, category: 'defi', verified: true, basePriceUsd: 0.92 },
  { symbol: 'GRT', name: 'The Graph', address: '0x5fe2B58c013d7601147DcdD68C143A77499f5531', decimals: 18, category: 'defi', verified: true, basePriceUsd: 0.19 },
  { symbol: 'TEL', name: 'Telcoin', address: '0xdF7837DE1F2Fa4631D716CF2502f8b230F1dcc32', decimals: 2, category: 'defi', verified: true, basePriceUsd: 0.0028 },
  { symbol: 'GHST', name: 'Aavegotchi GHST', address: '0x385Eeac5cB85A38A9a07A70c73e0a3271CfB54A7', decimals: 18, category: 'gaming', verified: true, basePriceUsd: 1.05 },
  { symbol: 'BAL', name: 'Balancer', address: '0x9a71012B13CA4d3D0Cdc72A177DF3ef03b0E76A3', decimals: 18, category: 'defi', verified: true, basePriceUsd: 2.15 },
];
`
      );

      dataFolder.file(
        'dexRouters.ts',
        `import { DexInfo } from '../types';

export const POLYGON_DEXES: DexInfo[] = [
  { id: 'quickswap', name: 'QuickSwap (V2/V3)', routerAddress: '0xa5E0829CaCEd8fFDD4De3c43696c57F7D7A678ff', factoryAddress: '0x5757371414417b8C6CAad45bAeF941aBc7d3Ab32', feePercent: 0.30, protocol: 'uniswap_v2', color: '#00D2FF' },
  { id: 'sushiswap', name: 'SushiSwap', routerAddress: '0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506', factoryAddress: '0xc35DADB65012eC5796536bD9864eD8773aBc74C4', feePercent: 0.30, protocol: 'uniswap_v2', color: '#FA52A0' },
  { id: 'uniswap_v3', name: 'Uniswap V3', routerAddress: '0xE592427A0AEce92De3Edee1F18E0157C05861564', factoryAddress: '0x1F98431c8aD98523631AE4a59f267346ea31F984', feePercent: 0.05, protocol: 'uniswap_v3', color: '#FF007A' },
  { id: 'dfyn', name: 'Dfyn Network', routerAddress: '0xA102072A4C07F06EC3B4900FDC4C7B80b6c57429', factoryAddress: '0xE7615CDAb656Fa9cad883853246023326444AC73', feePercent: 0.30, protocol: 'uniswap_v2', color: '#9C27B0' },
  { id: 'apeswap', name: 'ApeSwap Polygon', routerAddress: '0xC0788A3aD43d79aa53B09c272fd207b99351709c', factoryAddress: '0xCf083Beba2285Ab819FF930869F150829079baa0', feePercent: 0.20, protocol: 'uniswap_v2', color: '#A06000' },
];
`
      );
    }
  }

  // Generate ZIP Blob and trigger native browser download
  const blob = await zip.generateAsync({ type: 'blob' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'dexearn-polygon-arbitrage-bot.zip';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
