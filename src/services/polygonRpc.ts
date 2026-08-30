import { ethers } from 'ethers';
import { RpcEndpoint } from '../types';

export const DEFAULT_POLYGON_RPCS: RpcEndpoint[] = [
  {
    name: 'PublicNode Bor (Fast & Open)',
    url: 'https://polygon-bor-rpc.publicnode.com',
    chainId: 137,
    latencyMs: 0,
    status: 'connected',
    isDefault: true,
  },
  {
    name: 'LlamaNodes Polygon',
    url: 'https://polygon.llamarpc.com',
    chainId: 137,
    latencyMs: 0,
    status: 'checking',
  },
  {
    name: '1RPC Privacy Node',
    url: 'https://1rpc.io/matic',
    chainId: 137,
    latencyMs: 0,
    status: 'checking',
  },
  {
    name: 'Ankr Polygon Public',
    url: 'https://rpc.ankr.com/polygon',
    chainId: 137,
    latencyMs: 0,
    status: 'checking',
  },
  {
    name: 'dRPC Polygon Node',
    url: 'https://polygon.drpc.org',
    chainId: 137,
    latencyMs: 0,
    status: 'checking',
  },
  {
    name: 'BlastAPI Polygon Public',
    url: 'https://polygon-mainnet.public.blastapi.io',
    chainId: 137,
    latencyMs: 0,
    status: 'checking',
  },
];

export const MIN_LIVE_USDT_REQUIRED = 0; // Minimum 0 USDT on Polygon chain required
export const MIN_LIVE_POL_GAS_USD_REQUIRED = 0.05; // Minimum $0.05 worth of Polygon (POL/MATIC) required

// Known Polygon USDT tokens:
// 1. (PoS) Tether USD (Bridged USDT) - 0xc2132D05D31c914a87C6611C10748AEb04B58e8F (6 decimals)
// 2. Native Polygon Tether USD - 0x4ECB77443180eb0bcaD6aCd55B6327b9c9f28D89 (6 decimals)
export const POLYGON_USDT_ADDRESS = '0xc2132D05D31c914a87C6611C10748AEb04B58e8F'; 
export const POLYGON_USDT_NATIVE_ADDRESS = '0x4ECB77443180eb0bcaD6aCd55B6327b9c9f28D89';
const ERC20_BALANCE_ABI = ['function balanceOf(address account) external view returns (uint256)'];

class PolygonRpcManager {
  private activeRpcUrl: string = 'https://polygon-bor-rpc.publicnode.com';
  private provider: ethers.JsonRpcProvider | null = null;
  private currentBlock: number = 62890000;
  private currentGasPriceGwei: number = 32.5;
  private polPriceUsd: number = 0.1085;

  constructor() {
    this.initProvider(this.activeRpcUrl);
  }

  public setPolPriceUsd(price: number) {
    if (price > 0) {
      this.polPriceUsd = price;
    }
  }

  public initProvider(url: string): ethers.JsonRpcProvider {
    this.activeRpcUrl = url;
    try {
      const polygonNetwork = ethers.Network.from(137);
      this.provider = new ethers.JsonRpcProvider(url, polygonNetwork, {
        staticNetwork: polygonNetwork,
      });
    } catch {
      this.provider = null;
    }
    return this.provider!;
  }

  public getProvider(): ethers.JsonRpcProvider {
    if (!this.provider) {
      this.initProvider(this.activeRpcUrl);
    }
    return this.provider!;
  }

  public getActiveUrl(): string {
    return this.activeRpcUrl;
  }

  public async testRpcLatency(url: string): Promise<{ latencyMs: number; blockNumber: number; success: boolean }> {
    const start = performance.now();
    try {
      const polygonNetwork = ethers.Network.from(137);
      const tempProvider = new ethers.JsonRpcProvider(url, polygonNetwork, {
        staticNetwork: polygonNetwork,
      });
      // Call blockNumber with a short timeout
      const blockPromise = tempProvider.getBlockNumber();
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('RPC Timeout')), 4000)
      );
      const blockNumber = await Promise.race([blockPromise, timeoutPromise]);
      const end = performance.now();
      const latencyMs = Math.round(end - start);
      return { latencyMs, blockNumber, success: true };
    } catch {
      // Fallback estimate
      return { latencyMs: 999, blockNumber: 0, success: false };
    }
  }

  public async fetchGasPrice(): Promise<number> {
    try {
      const prov = this.getProvider();
      const feeData = await prov.getFeeData();
      if (feeData.gasPrice) {
        const gwei = Number(ethers.formatUnits(feeData.gasPrice, 'gwei'));
        if (gwei > 0) {
          this.currentGasPriceGwei = Math.max(25, Math.min(gwei, 150));
          return this.currentGasPriceGwei;
        }
      }
    } catch {
      // simulated fluctuation
      this.currentGasPriceGwei = Number((30 + (Math.random() * 8 - 4)).toFixed(1));
    }
    return this.currentGasPriceGwei;
  }

  public getGasPriceGwei(): number {
    return this.currentGasPriceGwei;
  }

  public getPolPriceUsd(): number {
    return this.polPriceUsd;
  }

  /**
   * Calculates gas cost in native Polygon POL / MATIC tokens
   */
  public calculateGasCostPol(gasUnits: number, gasGwei: number = this.currentGasPriceGwei): number {
    // gas cost in POL = (gasUnits * gasGwei * 1e9) / 1e18 = (gasUnits * gasGwei) / 1e9
    const polCost = (gasUnits * gasGwei) / 1e9;
    return Number(polCost.toFixed(6));
  }

  /**
   * Calculates gas cost in USD based on current POL token price
   */
  public calculateGasCostUsd(gasUnits: number, gasGwei: number = this.currentGasPriceGwei): number {
    const polCost = this.calculateGasCostPol(gasUnits, gasGwei);
    return Number((polCost * this.polPriceUsd).toFixed(5));
  }

  /**
   * Returns formatted gas fee representation in both POL tokens and USD
   */
  public getGasFeeDisplay(gasUnits: number, gasGwei: number = this.currentGasPriceGwei): {
    polCost: number;
    usdCost: number;
    formatted: string;
  } {
    const polCost = this.calculateGasCostPol(gasUnits, gasGwei);
    const usdCost = this.calculateGasCostUsd(gasUnits, gasGwei);
    return {
      polCost,
      usdCost,
      formatted: `${polCost.toFixed(5)} POL ($${usdCost.toFixed(3)})`,
    };
  }

  /**
   * Queries on-chain balances for both native POL (gas token) and Polygon USDT
   * Uses multi-RPC fallback to ensure high reliability in all browser and iframe environments.
   */
  public async getLiveWalletBalance(address: string): Promise<{
    polBalance: number;
    polBalanceUsd: number;
    usdtBalance: number;
    totalBalanceUsd: number;
    meetsUsdtRequirement: boolean;
    meetsGasRequirement: boolean;
    canStartLiveTrading: boolean;
    error?: string;
  }> {
    const trimmedAddress = address.trim();
    if (!ethers.isAddress(trimmedAddress)) {
      return {
        polBalance: 0,
        polBalanceUsd: 0,
        usdtBalance: 0,
        totalBalanceUsd: 0,
        meetsUsdtRequirement: false,
        meetsGasRequirement: false,
        canStartLiveTrading: false,
        error: 'Invalid EVM Wallet Address. Please check and retry.',
      };
    }

    const rpcUrlsToTry = [
      this.activeRpcUrl,
      'https://polygon-bor-rpc.publicnode.com',
      'https://polygon.llamarpc.com',
      'https://1rpc.io/matic',
      'https://rpc.ankr.com/polygon',
      'https://polygon.drpc.org',
      'https://polygon-mainnet.public.blastapi.io',
    ];

    let lastError: string | undefined;

    for (const rpcUrl of rpcUrlsToTry) {
      try {
        const polygonNetwork = ethers.Network.from(137);
        const prov = new ethers.JsonRpcProvider(rpcUrl, polygonNetwork, {
          staticNetwork: polygonNetwork,
        });

        // 1. Fetch native POL balance with timeout
        const balanceWeiPromise = prov.getBalance(trimmedAddress);
        const timeoutPromise = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('RPC request timeout')), 5000)
        );

        const balanceWei = await Promise.race([balanceWeiPromise, timeoutPromise]);
        const pol = parseFloat(ethers.formatEther(balanceWei));
        const polUsd = Number((pol * this.polPriceUsd).toFixed(2));

        // 2. Fetch Polygon USDT ERC20 balance ((PoS) Tether USD 0xc2132D... and Native USDT)
        let usdt = 0;
        try {
          const usdtContractPoS = new ethers.Contract(POLYGON_USDT_ADDRESS, ERC20_BALANCE_ABI, prov);
          const usdtRawPoS = await usdtContractPoS.balanceOf(trimmedAddress);
          const posUsdt = parseFloat(ethers.formatUnits(usdtRawPoS, 6)); // USDT has 6 decimals on Polygon
          usdt += posUsdt;
        } catch {
          // ignore pos usdt query error
        }

        try {
          const usdtContractNative = new ethers.Contract(POLYGON_USDT_NATIVE_ADDRESS, ERC20_BALANCE_ABI, prov);
          const usdtRawNative = await usdtContractNative.balanceOf(trimmedAddress);
          const nativeUsdt = parseFloat(ethers.formatUnits(usdtRawNative, 6));
          if (nativeUsdt > 0) {
            usdt += nativeUsdt;
          }
        } catch {
          // ignore native usdt query error
        }

        const totalUsd = Number((polUsd + usdt).toFixed(2));
        const meetsUsdt = usdt >= MIN_LIVE_USDT_REQUIRED;
        const meetsGas = polUsd >= MIN_LIVE_POL_GAS_USD_REQUIRED;
        const canStart = meetsUsdt && meetsGas;

        return {
          polBalance: pol,
          polBalanceUsd: polUsd,
          usdtBalance: usdt,
          totalBalanceUsd: totalUsd,
          meetsUsdtRequirement: meetsUsdt,
          meetsGasRequirement: meetsGas,
          canStartLiveTrading: canStart,
        };
      } catch (err: any) {
        lastError = err?.message || 'RPC connection failed';
        continue; // Try next RPC endpoint
      }
    }

    return {
      polBalance: 0,
      polBalanceUsd: 0,
      usdtBalance: 0,
      totalBalanceUsd: 0,
      meetsUsdtRequirement: false,
      meetsGasRequirement: false,
      canStartLiveTrading: false,
      error: lastError || 'Failed to connect to Polygon RPC network.',
    };
  }

  public getCurrentBlock(): number {
    return this.currentBlock;
  }

  public incrementBlock() {
    this.currentBlock += 1;
  }
}

export const polygonRpc = new PolygonRpcManager();
