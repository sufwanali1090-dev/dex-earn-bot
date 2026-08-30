import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  BotConfig,
  BotStats,
  DexToDexOpportunity,
  TriangularOpportunity,
  TradeRecord,
  RpcEndpoint,
} from './types';
import { DEFAULT_POLYGON_RPCS, polygonRpc } from './services/polygonRpc';
import { arbitrageScanner } from './services/arbitrageScanner';
import { livePriceService } from './services/livePriceService';
import {
  executeRealDexToDexTrade,
  executeRealTriangularTrade,
} from './services/liveTradeExecutor';
import { Header } from './components/Header';
import { BotControlPanel } from './components/BotControlPanel';
import { DexToDexScanner } from './components/DexToDexScanner';
import { TriangularScanner } from './components/TriangularScanner';
import { LiveOpportunitiesFeed, LogEntry } from './components/LiveOpportunitiesFeed';
import { TradeHistoryLedger } from './components/TradeHistoryLedger';
import { RpcConfigModal } from './components/RpcConfigModal';
import { PythonScriptModal } from './components/PythonScriptModal';
import { WalletConnectModal } from './components/WalletConnectModal';
import { LiveTradeSafetyModal } from './components/LiveTradeSafetyModal';
import { PrivateKeyModal } from './components/PrivateKeyModal';
import { DisclaimerModal } from './components/DisclaimerModal';
import { DEVELOPER_FEE_WALLET, DEVELOPER_FEE_PERCENT, MASTER_ACTIVATION_KEY } from './services/liveTradeExecutor';
import { ShieldCheck, AlertTriangle, Key, ExternalLink, Lock } from 'lucide-react';

export default function App() {
  // Disclaimer state: displayed on every website reload as requested
  const [disclaimerModalOpen, setDisclaimerModalOpen] = useState(true);

  // Config
  const [config, setConfig] = useState<BotConfig>({
    scanIntervalMs: 250, // 250ms default high-frequency scan
    tradeAmountUsd: 50, // $50 default capital
    minProfitMarginUsd: 0.01, // Minimum $0.01 net profit after all fees
    minSpreadPercent: 0.20, // 0.20% minimum gross spread
    maxGasGwei: 80, // 80 Gwei gas ceiling
    slippageTolerancePercent: 0.20, // 0.2% slippage
    activeStrategy: 'dex_to_dex', // 'dex_to_dex' | 'triangular'
    autoTradeEnabled: true, // Default ON: Automatically executes profitable orders matching threshold
    mevProtection: true,
    strictGasShield: true, // Gas Guard: Ensure Gross Profit strictly exceeds Gas + LP fees
    soundAlerts: true,
    executionMode: 'PAPER',
    selectedTokens: [],
    selectedDexes: [],
  });

  // RPC and Wallet State
  const [activeRpc, setActiveRpc] = useState<RpcEndpoint>(DEFAULT_POLYGON_RPCS[0]);
  const [rpcModalOpen, setRpcModalOpen] = useState(false);
  const [pythonModalOpen, setPythonModalOpen] = useState(false);
  const [walletModalOpen, setWalletModalOpen] = useState(false);
  const [liveModalOpen, setLiveModalOpen] = useState(false);
  const [privateKeyModalOpen, setPrivateKeyModalOpen] = useState(false);
  const [connectedAddress, setConnectedAddress] = useState<string | null>(null);
  const [paperBalanceUsd, setPaperBalanceUsd] = useState(100.0);
  const [realWalletBalanceUsd, setRealWalletBalanceUsd] = useState<number | null>(null);
  const [polBalance, setPolBalance] = useState<number>(0.0);
  const [usdtBalance, setUsdtBalance] = useState<number>(0.0);
  const [currentGasGwei, setCurrentGasGwei] = useState(32.4);

  // Active displayed balance: real balance if wallet connected, otherwise paper balance ($100 default)
  const walletBalanceUsd = connectedAddress && realWalletBalanceUsd !== null ? realWalletBalanceUsd : paperBalanceUsd;

  const refreshWalletBalances = useCallback(async (addressOverride?: string) => {
    const targetAddr = addressOverride || connectedAddress;
    if (!targetAddr) return;
    try {
      const res = await polygonRpc.getLiveWalletBalance(targetAddr);
      setRealWalletBalanceUsd(res.totalBalanceUsd);
      setPolBalance(res.polBalance);
      setUsdtBalance(res.usdtBalance);
    } catch (err) {
      console.warn('Error refreshing balances:', err);
    }
  }, [connectedAddress]);

  // Scanner State
  const [isScanning, setIsScanning] = useState(true);
  const [isRescanningPrices, setIsRescanningPrices] = useState(false);
  const [lastPriceRescanTime, setLastPriceRescanTime] = useState<number>(Date.now());
  const [dexToDexOpps, setDexToDexOpps] = useState<DexToDexOpportunity[]>([]);
  const [triangularOpps, setTriangularOpps] = useState<TriangularOpportunity[]>([]);
  const [executingId, setExecutingId] = useState<string | null>(null);
  const isTradeLockedRef = useRef<boolean>(false);
  const autoTradeQueueIndexRef = useRef<number>(0);

  // Bot Statistics & Ledger
  const [stats, setStats] = useState<BotStats>({
    totalScans: 0,
    opportunitiesFound: 0,
    tradesExecuted: 0,
    totalVolumeUsd: 0,
    grossProfitUsd: 0,
    totalGasFeesPol: 0,
    totalGasFeesUsd: 0,
    totalDexFeesUsd: 0,
    netProfitUsd: 0,
    winRate: 100,
    bestTradeUsd: 0,
  });

  const [tradeHistory, setTradeHistory] = useState<TradeRecord[]>([]);
  const [logs, setLogs] = useState<LogEntry[]>([]);

  // Sound Synth Ref
  const audioCtxRef = useRef<AudioContext | null>(null);
  const lastSoundTimeRef = useRef<number>(0);

  const playChime = useCallback(() => {
    if (!config.soundAlerts) return;
    const now = Date.now();
    if (now - lastSoundTimeRef.current < 2500) return; // debounce sound
    lastSoundTimeRef.current = now;

    try {
      if (!audioCtxRef.current) {
        audioCtxRef.current = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      }
      const ctx = audioCtxRef.current;
      if (ctx.state === 'suspended') ctx.resume();

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
      osc.frequency.exponentialRampToValueAtTime(880.0, ctx.currentTime + 0.15); // A5
      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.3);
    } catch {
      // Audio not supported or blocked by browser policy
    }
  }, [config.soundAlerts]);

  const addLog = useCallback((type: LogEntry['type'], message: string, highlight?: boolean) => {
    const timeStr = new Date().toLocaleTimeString();
    setLogs((prev) => [
      {
        id: `log-${Date.now()}-${Math.random()}`,
        timestamp: timeStr,
        type,
        message,
        highlight,
      },
      ...prev.slice(0, 150),
    ]);
  }, []);

  // Auto-detect Trust Wallet / Injected Web3 Provider on load
  useEffect(() => {
    const checkInjectedWallet = async () => {
      if (typeof window !== 'undefined' && (window as any).ethereum) {
        try {
          const accounts = await (window as any).ethereum.request({ method: 'eth_accounts' });
          if (accounts && accounts.length > 0) {
            const addr = accounts[0];
            setConnectedAddress(addr);
            refreshWalletBalances(addr);
            addLog('SYSTEM', `Trust Wallet DApp Browser detected! Auto-connected: ${addr.slice(0, 6)}...${addr.slice(-4)}`, true);
          }
        } catch (err) {
          console.warn('Auto injected check note:', err);
        }
      }
    };
    checkInjectedWallet();
  }, [addLog, refreshWalletBalances]);

  // Initial greeting log
  useEffect(() => {
    addLog(
      'SCAN',
      `Polygon Arbitrage Core active on ${DEFAULT_POLYGON_RPCS[0].url} (Chain 137). Scanning all official tokens...`
    );
  }, [addLog]);

  // Execute DEX-to-DEX trade handler
  const handleExecuteDexToDex = useCallback(
    async (opp: DexToDexOpportunity) => {
      if (isTradeLockedRef.current) {
        console.log('[Lock Guard] A trade is currently executing. Waiting for complete round-trip settlement before accepting new signals.');
        return;
      }
      isTradeLockedRef.current = true;
      setExecutingId(opp.id);
      const isLive = config.executionMode === 'LIVE';

      try {
        addLog(
          'TRADE',
          `${isLive ? '[REAL LIVE TRADE]' : '[PAPER TRADE]'} Executing DEX-to-DEX: Buy ${opp.tokenPair} on ${opp.buyDex.name} ($${opp.buyPrice.toFixed(2)}) ➔ Sell on ${opp.sellDex.name} ($${opp.sellPrice.toFixed(2)}) [Size: $${opp.tradeAmountUsd}]`,
          true
        );

        let txHash: string | undefined;
        let buyTxHash: string | undefined;
        let sellTxHash: string | undefined;
        let actualGasFee = opp.gasFeeUsd;
        let actualNetProfit = opp.netProfitUsd;

        if (isLive) {
          const liveRes = await executeRealDexToDexTrade(
            opp,
            connectedAddress,
            config.slippageTolerancePercent,
            config.tradeAmountUsd,
            config.privateKey,
            (phase, message) => {
              addLog('TRADE', message, phase === 'SETTLED' || phase === 'BOUGHT' || phase === 'SOLD');
            }
          );
          
          if (!liveRes.success) {
            addLog('WARN', `[TRADE NOTICE] ${liveRes.error || 'Transaction failed or rejected'}`);
            return;
          }

          txHash = liveRes.txHash;
          buyTxHash = liveRes.buyTxHash;
          sellTxHash = liveRes.sellTxHash;
          actualGasFee = liveRes.actualGasCostUsd;
          actualNetProfit = liveRes.actualNetProfitUsd;

          // Auto-refresh real on-chain balances after broadcast
          await refreshWalletBalances();
        } else {
          await new Promise((r) => setTimeout(r, 180));
        }

        const newRecord: TradeRecord = {
          id: `tx-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          type: 'DEX_TO_DEX',
          timestamp: Date.now(),
          routeSummary: `${opp.tokenPair} (${opp.buyDex.name.split(' ')[0]} ➔ ${opp.sellDex.name.split(' ')[0]})`,
          buyPrice: opp.buyPrice,
          sellPrice: opp.sellPrice,
          tradeAmountUsd: opp.tradeAmountUsd,
          grossProfitUsd: opp.grossProfitUsd,
          dexFeesUsd: opp.dexFeesUsd,
          gasFeePol: opp.gasFeePol || (actualGasFee / 0.42),
          gasFeeUsd: actualGasFee,
          netProfitUsd: actualNetProfit,
          netRoiPercent: opp.netProfitPercent,
          status: 'FILLED',
          txHash,
          buyTxHash,
          sellTxHash,
          executionTimeMs: isLive ? 350 : 180,
          mode: config.executionMode,
        };

        setTradeHistory((prev) => [newRecord, ...prev]);
        if (isLive) {
          setRealWalletBalanceUsd((prev) => (prev !== null ? prev + actualNetProfit : actualNetProfit));
        } else {
          setPaperBalanceUsd((prev) => prev + actualNetProfit);
        }

        setStats((prev) => ({
          ...prev,
          tradesExecuted: prev.tradesExecuted + 1,
          totalVolumeUsd: prev.totalVolumeUsd + opp.tradeAmountUsd,
          grossProfitUsd: prev.grossProfitUsd + opp.grossProfitUsd,
          totalGasFeesPol: prev.totalGasFeesPol + (opp.gasFeePol || 0),
          totalGasFeesUsd: prev.totalGasFeesUsd + actualGasFee,
          totalDexFeesUsd: prev.totalDexFeesUsd + opp.dexFeesUsd,
          netProfitUsd: prev.netProfitUsd + actualNetProfit,
          bestTradeUsd: Math.max(prev.bestTradeUsd, actualNetProfit),
        }));

        addLog(
          'TRADE',
          `[FILLED ${isLive ? 'REAL ON-CHAIN' : 'PAPER'}] Net Profit +$${actualNetProfit.toFixed(3)} (+${opp.netProfitPercent.toFixed(2)}% ROI) after gas ($${actualGasFee.toFixed(3)}) & DEX fees ($${opp.dexFeesUsd.toFixed(2)})${txHash ? ` | Tx: ${txHash.slice(0, 10)}...` : ''}`,
          true
        );
      } catch (err: any) {
        addLog('WARN', `[EXECUTION ERROR] ${err?.message || 'Trade execution failed'}`);
      } finally {
        isTradeLockedRef.current = false;
        setExecutingId(null);
      }
    },
    [addLog, config.executionMode, config.slippageTolerancePercent, config.tradeAmountUsd, config.privateKey, connectedAddress, refreshWalletBalances]
  );

  // Execute Triangular trade handler
  const handleExecuteTriangular = useCallback(
    async (opp: TriangularOpportunity) => {
      if (isTradeLockedRef.current) {
        console.log('[Lock Guard] A trade is currently executing. Waiting for complete settlement before accepting new signals.');
        return;
      }
      isTradeLockedRef.current = true;
      setExecutingId(opp.id);
      const isLive = config.executionMode === 'LIVE';
      const [t0, t1, t2] = opp.route;

      try {
        addLog(
          'TRADE',
          `${isLive ? '[REAL LIVE 3-HOP]' : '[PAPER 3-HOP]'} Executing on ${opp.dex.name}: ${t0.symbol} ➔ ${t1.symbol} ➔ ${t2.symbol} ➔ ${t0.symbol} (Multiplier: ${opp.cycleMultiplier}x) [Size: $${opp.tradeAmountUsd}]`,
          true
        );

        let txHash: string | undefined;
        let actualGasFee = opp.gasFeeUsd;
        let actualNetProfit = opp.netProfitUsd;

        if (isLive) {
          const liveRes = await executeRealTriangularTrade(
            opp,
            connectedAddress,
            config.tradeAmountUsd,
            config.privateKey,
            (phase, message) => {
              addLog('TRADE', message, phase === 'SETTLED' || phase === 'BOUGHT' || phase === 'SOLD');
            }
          );
          if (!liveRes.success) {
            addLog('WARN', `[3-HOP NOTICE] ${liveRes.error || 'Transaction failed or rejected'}`);
            return;
          }

          txHash = liveRes.txHash;
          actualGasFee = liveRes.actualGasCostUsd;
          actualNetProfit = liveRes.actualNetProfitUsd;

          await refreshWalletBalances();
        } else {
          await new Promise((r) => setTimeout(r, 220));
        }

        const newRecord: TradeRecord = {
          id: `tx-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          type: 'TRIANGULAR',
          timestamp: Date.now(),
          routeSummary: `${t0.symbol} ➔ ${t1.symbol} ➔ ${t2.symbol} ➔ ${t0.symbol} (${opp.dex.name.split(' ')[0]})`,
          buyPrice: livePriceService.getTokenPriceUsd(t1.symbol) || 1.0,
          sellPrice: livePriceService.getTokenPriceUsd(t2.symbol) || 1.0,
          tradeAmountUsd: opp.tradeAmountUsd,
          grossProfitUsd: opp.grossProfitUsd,
          dexFeesUsd: opp.dexFeesUsd,
          gasFeePol: opp.gasFeePol || (actualGasFee / 0.42),
          gasFeeUsd: actualGasFee,
          netProfitUsd: actualNetProfit,
          netRoiPercent: opp.netProfitPercent,
          status: 'FILLED',
          txHash,
          executionTimeMs: isLive ? 400 : 220,
          mode: config.executionMode,
        };

        setTradeHistory((prev) => [newRecord, ...prev]);
        if (isLive) {
          setRealWalletBalanceUsd((prev) => (prev !== null ? prev + actualNetProfit : actualNetProfit));
        } else {
          setPaperBalanceUsd((prev) => prev + actualNetProfit);
        }

        setStats((prev) => ({
          ...prev,
          tradesExecuted: prev.tradesExecuted + 1,
          totalVolumeUsd: prev.totalVolumeUsd + opp.tradeAmountUsd,
          grossProfitUsd: prev.grossProfitUsd + opp.grossProfitUsd,
          totalGasFeesPol: prev.totalGasFeesPol + (opp.gasFeePol || 0),
          totalGasFeesUsd: prev.totalGasFeesUsd + actualGasFee,
          totalDexFeesUsd: prev.totalDexFeesUsd + opp.dexFeesUsd,
          netProfitUsd: prev.netProfitUsd + actualNetProfit,
          bestTradeUsd: Math.max(prev.bestTradeUsd, actualNetProfit),
        }));

        addLog(
          'TRADE',
          `[FILLED 3-HOP ${isLive ? 'REAL ON-CHAIN' : 'PAPER'}] Net Profit +$${actualNetProfit.toFixed(3)} (+${opp.netProfitPercent.toFixed(2)}% ROI) after 3-hop fees ($${opp.totalFeesUsd.toFixed(3)})${txHash ? ` | Tx: ${txHash.slice(0, 10)}...` : ''}`,
          true
        );
      } catch (err: any) {
        addLog('WARN', `[3-HOP EXECUTION ERROR] ${err?.message || 'Triangular trade failed'}`);
      } finally {
        isTradeLockedRef.current = false;
        setExecutingId(null);
      }
    },
    [addLog, config.executionMode, config.tradeAmountUsd, config.privateKey, connectedAddress, refreshWalletBalances]
  );

  // Main Millisecond Scanning Loop
  useEffect(() => {
    if (!isScanning) return;

    let isMounted = true;
    let isTickRunning = false;

    // Scan tick with guard against overlapping async executions
    const runScanTick = async () => {
      if (isTickRunning || !isMounted) return;
      isTickRunning = true;

      try {
        // Fetch/fluctuate gas
        const gas = polygonRpc.fetchGasPrice ? await polygonRpc.fetchGasPrice() : 32.4;
        if (!isMounted) return;
        setCurrentGasGwei(gas);

        // Scan opportunities
        const d2d = arbitrageScanner.scanDexToDex(config);
        const tri = arbitrageScanner.scanTriangular(config);

        if (!isMounted) return;
        setDexToDexOpps(d2d);
        setTriangularOpps(tri);

        const profitableD2D = d2d.filter((o) => o.isProfitable);
        const profitableTri = tri.filter((o) => o.isProfitable);
        const newOpportunities = profitableD2D.length + profitableTri.length;

        setStats((prev) => ({
          ...prev,
          totalScans: prev.totalScans + 1,
          opportunitiesFound: prev.opportunitiesFound + newOpportunities,
        }));

        // Sound notification on top opportunity
        if (profitableD2D.length > 0 || profitableTri.length > 0) {
          playChime();
        }

        // Auto-Trade Trigger: Auto-execute profitable trades sequentially (Completing 1st, then 2nd, 3rd, 4th, or repeating single opp)
        if (config.autoTradeEnabled && !config.emergencyStop && !executingId && !isTradeLockedRef.current) {
          const targetMinProfit = config.minProfitMarginUsd !== undefined ? config.minProfitMarginUsd : 0.01;
          
          const candidateD2D = d2d
            .filter((o) => o.netProfitUsd >= targetMinProfit && o.netProfitUsd > 0 && o.grossProfitUsd > (o.gasFeeUsd + o.dexFeesUsd))
            .sort((a, b) => b.netProfitUsd - a.netProfitUsd);

          const candidateTri = tri
            .filter((o) => o.netProfitUsd >= targetMinProfit && o.netProfitUsd > 0 && o.grossProfitUsd > (o.gasFeeUsd + o.dexFeesUsd))
            .sort((a, b) => b.netProfitUsd - a.netProfitUsd);

          if (config.activeStrategy === 'triangular') {
            if (candidateTri.length > 0) {
              const count = candidateTri.length;
              const idx = autoTradeQueueIndexRef.current % count;
              const selectedOpp = candidateTri[idx];
              // Advance index for next cycle (if 1 opp, idx is always 0 and executes again and again)
              autoTradeQueueIndexRef.current = (idx + 1) % count;

              addLog('INFO', `🤖 [AUTO-TRADE QUEUE #${idx + 1}/${count}] 3-Hop profit +$${selectedOpp.netProfitUsd.toFixed(3)} • Executing all 3 legs until complete...`);
              handleExecuteTriangular(selectedOpp);
            }
          } else if (config.activeStrategy === 'dex_to_dex') {
            if (candidateD2D.length > 0) {
              const count = candidateD2D.length;
              const idx = autoTradeQueueIndexRef.current % count;
              const selectedOpp = candidateD2D[idx];
              // Advance index for next cycle (if 1 opp, idx is always 0 and executes again and again)
              autoTradeQueueIndexRef.current = (idx + 1) % count;

              addLog('INFO', `🤖 [AUTO-TRADE QUEUE #${idx + 1}/${count}] DEX-to-DEX profit +$${selectedOpp.netProfitUsd.toFixed(3)} (${selectedOpp.tokenPair}) • Executing buy & sell legs until complete...`);
              handleExecuteDexToDex(selectedOpp);
            }
          } else {
            // Both strategies: cycle across all profitable routes
            const allCandidates: Array<{ type: 'D2D' | 'TRI'; opp: DexToDexOpportunity | TriangularOpportunity; netProfitUsd: number }> = [
              ...candidateD2D.map((o) => ({ type: 'D2D' as const, opp: o, netProfitUsd: o.netProfitUsd })),
              ...candidateTri.map((o) => ({ type: 'TRI' as const, opp: o, netProfitUsd: o.netProfitUsd })),
            ].sort((a, b) => b.netProfitUsd - a.netProfitUsd);

            if (allCandidates.length > 0) {
              const count = allCandidates.length;
              const idx = autoTradeQueueIndexRef.current % count;
              const selected = allCandidates[idx];
              autoTradeQueueIndexRef.current = (idx + 1) % count;

              if (selected.type === 'D2D') {
                const opp = selected.opp as DexToDexOpportunity;
                addLog('INFO', `🤖 [AUTO-TRADE QUEUE #${idx + 1}/${count}] DEX-to-DEX profit +$${opp.netProfitUsd.toFixed(3)} (${opp.tokenPair}) • Executing buy & sell legs until complete...`);
                handleExecuteDexToDex(opp);
              } else {
                const opp = selected.opp as TriangularOpportunity;
                addLog('INFO', `🤖 [AUTO-TRADE QUEUE #${idx + 1}/${count}] 3-Hop profit +$${opp.netProfitUsd.toFixed(3)} • Executing all legs until complete...`);
                handleExecuteTriangular(opp);
              }
            }
          }
        }
      } catch (err) {
        console.warn('Scan tick notice:', err);
      } finally {
        isTickRunning = false;
      }
    };

    const interval = setInterval(runScanTick, Math.max(300, config.scanIntervalMs));
    const unsubscribe = livePriceService.subscribe(() => {
      runScanTick();
    });

    return () => {
      isMounted = false;
      clearInterval(interval);
      unsubscribe();
    };
  }, [
    isScanning,
    config,
    executingId,
    polBalance,
    connectedAddress,
    handleExecuteDexToDex,
    handleExecuteTriangular,
    playChime,
    addLog,
    refreshWalletBalances,
  ]);

  const handleSelectRpc = (rpc: RpcEndpoint) => {
    setActiveRpc(rpc);
    polygonRpc.initProvider(rpc.url);
    addLog('BOT', `Switched Polygon RPC to ${rpc.name} (${rpc.url})`, true);
  };

  const handleResetStats = () => {
    setStats({
      totalScans: 0,
      opportunitiesFound: 0,
      tradesExecuted: 0,
      totalVolumeUsd: 0,
      grossProfitUsd: 0,
      totalGasFeesPol: 0,
      totalGasFeesUsd: 0,
      totalDexFeesUsd: 0,
      netProfitUsd: 0,
      winRate: 100,
      bestTradeUsd: 0,
    });
    setTradeHistory([]);
    setPaperBalanceUsd(100.0);
    addLog('BOT', 'Statistics and paper ledger balance reset to $100.00.');
  };

  const handleForceRescanPrices = useCallback(async () => {
    if (isRescanningPrices) return;
    setIsRescanningPrices(true);
    try {
      addLog('SCAN', '⚡ [FORCE RESCAN] Requesting live quotes from Binance, DexScreener & Polygon AMMs...', true);
      const res = await livePriceService.forceRescanAllPrices();
      const gas = polygonRpc.fetchGasPrice ? await polygonRpc.fetchGasPrice() : 32.4;
      setCurrentGasGwei(gas);

      const d2d = arbitrageScanner.scanDexToDex(config);
      const tri = arbitrageScanner.scanTriangular(config);
      setDexToDexOpps(d2d);
      setTriangularOpps(tri);
      setLastPriceRescanTime(Date.now());

      const profitableD2D = d2d.filter((o) => o.isProfitable).length;
      addLog('SCAN', `✓ [FORCE RESCAN COMPLETE] 100% refreshed ${res.tokenCount} tokens across ${res.dexCount} Polygon DEXes! Found ${profitableD2D} profitable D2D spreads.`, true);
    } catch (err: any) {
      addLog('WARN', `[RESCAN NOTICE] ${err?.message || 'Price rescan update completed'}`);
    } finally {
      setIsRescanningPrices(false);
    }
  }, [config, isRescanningPrices, addLog]);

  return (
    <div className="min-h-screen bg-[#0c0c14] text-slate-100 flex flex-col font-sans selection:bg-indigo-600 selection:text-white relative overflow-x-hidden">
      {/* Ambient background glows */}
      <div className="fixed inset-0 bg-gradient-to-br from-indigo-950/30 via-transparent to-purple-950/30 pointer-events-none z-0" />
      <div className="fixed top-[-10%] left-[20%] w-[500px] h-[500px] bg-indigo-600/10 rounded-full blur-3xl pointer-events-none z-0" />
      <div className="fixed bottom-[-10%] right-[15%] w-[600px] h-[600px] bg-purple-600/10 rounded-full blur-3xl pointer-events-none z-0" />

      {/* Top Header Navigation */}
      <div className="relative z-10">
        <Header
          config={config}
          setConfig={setConfig}
          activeRpc={activeRpc}
          currentGasGwei={currentGasGwei}
          walletBalanceUsd={walletBalanceUsd}
          polBalance={polBalance}
          usdtBalance={usdtBalance}
          connectedAddress={connectedAddress}
          openRpcModal={() => setRpcModalOpen(true)}
          openPythonModal={() => setPythonModalOpen(true)}
          openWalletModal={() => setWalletModalOpen(true)}
          openPrivateKeyModal={() => setPrivateKeyModalOpen(true)}
          isScanning={isScanning}
          totalScans={stats.totalScans}
        />
      </div>

      {/* Main Trading Floor */}
      <main className="relative z-10 flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Bot Master Controls & Configuration */}
        <BotControlPanel
          config={config}
          setConfig={setConfig}
          stats={stats}
          isScanning={isScanning}
          onToggleScan={() => setIsScanning((prev) => !prev)}
          onResetStats={handleResetStats}
          openLiveModal={() => setLiveModalOpen(true)}
          openPrivateKeyModal={() => setPrivateKeyModalOpen(true)}
          connectedAddress={connectedAddress}
        />

        {/* Strategy Workspace: DEX-to-DEX or Triangular */}
        <div className="transition-all duration-200">
          {config.activeStrategy === 'dex_to_dex' ? (
            <DexToDexScanner
              opportunities={dexToDexOpps}
              config={config}
              onExecuteTrade={handleExecuteDexToDex}
              executingId={executingId}
              onForceRescan={handleForceRescanPrices}
              isRescanning={isRescanningPrices}
              lastRescanTime={lastPriceRescanTime}
            />
          ) : (
            <TriangularScanner
              opportunities={triangularOpps}
              config={config}
              onExecuteTriangular={handleExecuteTriangular}
              executingId={executingId}
            />
          )}
        </div>

        {/* Bottom Section: Live Activity Log & Trade History */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <LiveOpportunitiesFeed logs={logs} onClearLogs={() => setLogs([])} />
          <TradeHistoryLedger
            trades={tradeHistory}
            stats={stats}
            onClearHistory={() => setTradeHistory([])}
          />
        </div>

        {/* Footer & Copyrights Section */}
        <footer className="mt-12 pt-8 pb-12 border-t border-white/10 text-slate-400 space-y-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 text-xs">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-[#0500FF] to-[#00D2FF] flex items-center justify-center shadow-[0_0_12px_rgba(0,210,255,0.4)]">
                <ShieldCheck className="w-4 h-4 text-white" />
              </div>
              <div>
                <span className="font-bold text-white tracking-wide block">
                  POLYGON DEX MULTI-HOP ARBITRAGE BOT
                </span>
                <span className="text-[11px] text-slate-400 font-mono">
                  Master Protocol Engine • Non-Custodial Multi-DEX Flash Arb
                </span>
              </div>
            </div>

            {/* License & Fee Badges */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-indigo-950/60 border border-indigo-500/30 text-indigo-300 font-mono text-[11px]">
                <Lock className="w-3 h-3 text-cyan-400" />
                <span>Protocol Security: <strong>Authorized Key Required</strong></span>
              </div>
              <div className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-emerald-950/60 border border-emerald-500/30 text-emerald-300 text-[11px]">
                <span>25% Dev Profit Share: </span>
                <a
                  href={`https://polygonscan.com/address/${DEVELOPER_FEE_WALLET}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-mono text-cyan-300 hover:underline flex items-center gap-0.5"
                >
                  {DEVELOPER_FEE_WALLET.slice(0, 6)}...{DEVELOPER_FEE_WALLET.slice(-4)}
                  <ExternalLink className="w-2.5 h-2.5" />
                </a>
              </div>
              <button
                onClick={() => setDisclaimerModalOpen(true)}
                className="px-3 py-1 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[11px] font-semibold transition-all flex items-center gap-1"
              >
                <AlertTriangle className="w-3 h-3" />
                <span>Risk Disclaimer</span>
              </button>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-2 pt-2 border-t border-white/5 text-[11px] text-slate-400">
            <p>
              © {new Date().getFullYear()} DEX Multi-Hop Arbitrage Protocol. All rights reserved. Built for Polygon Mainnet.
            </p>
            <p className="text-slate-400">
              Disclaimer: Cryptocurrency arbitrage trading carries inherent market risks. Trading capital remains in your wallet; net profits share 25% protocol developer fee.
            </p>
          </div>
        </footer>
      </main>

      {/* Modals */}
      <DisclaimerModal
        isOpen={disclaimerModalOpen}
        onClose={() => setDisclaimerModalOpen(false)}
      />
      <RpcConfigModal
        isOpen={rpcModalOpen}
        onClose={() => setRpcModalOpen(false)}
        rpcEndpoints={DEFAULT_POLYGON_RPCS}
        activeRpc={activeRpc}
        onSelectRpc={handleSelectRpc}
        config={config}
        setConfig={setConfig}
      />

      <PythonScriptModal
        isOpen={pythonModalOpen}
        onClose={() => setPythonModalOpen(false)}
      />

      <WalletConnectModal
        isOpen={walletModalOpen}
        onClose={() => setWalletModalOpen(false)}
        connectedAddress={connectedAddress}
        polBalance={polBalance}
        usdtBalance={usdtBalance}
        realBalanceUsd={realWalletBalanceUsd || 0}
        onConnectAddress={(addr, balanceUsd, polAmt, usdtAmt) => {
          setConnectedAddress(addr);
          if (balanceUsd !== undefined) setRealWalletBalanceUsd(balanceUsd);
          if (polAmt !== undefined) setPolBalance(polAmt);
          if (usdtAmt !== undefined) setUsdtBalance(usdtAmt);
          if (!addr) {
            setRealWalletBalanceUsd(null);
            setPolBalance(0);
            setUsdtBalance(0);
          }
        }}
      />

      <LiveTradeSafetyModal
        isOpen={liveModalOpen}
        onClose={() => setLiveModalOpen(false)}
        config={config}
        setConfig={setConfig}
        connectedAddress={connectedAddress}
        openWalletModal={() => setWalletModalOpen(true)}
        usdtBalance={usdtBalance}
        polBalance={polBalance}
        polPriceUsd={polygonRpc.getPolPriceUsd()}
        onRefreshBalances={refreshWalletBalances}
        onConnectAddress={(addr, balanceUsd, polAmt, usdtAmt) => {
          setConnectedAddress(addr);
          if (balanceUsd !== undefined) setRealWalletBalanceUsd(balanceUsd);
          if (polAmt !== undefined) setPolBalance(polAmt);
          if (usdtAmt !== undefined) setUsdtBalance(usdtAmt);
          if (!addr) {
            setRealWalletBalanceUsd(null);
            setPolBalance(0);
            setUsdtBalance(0);
          }
        }}
      />

      <PrivateKeyModal
        isOpen={privateKeyModalOpen}
        onClose={() => setPrivateKeyModalOpen(false)}
        savedPrivateKey={config.privateKey}
        onSavePrivateKey={(key) => {
          setConfig((prev) => ({ ...prev, privateKey: key }));
          if (key) {
            addLog('BOT', '[PRIVATE KEY CONFIGURED] Automated zero-popup execution mode ready.');
          } else {
            addLog('BOT', '[PRIVATE KEY REMOVED] Bot reverted to standard wallet prompt mode.');
          }
        }}
        onConnectAddress={(addr, balanceUsd, polAmt, usdtAmt) => {
          setConnectedAddress(addr);
          if (balanceUsd !== undefined) setRealWalletBalanceUsd(balanceUsd);
          if (polAmt !== undefined) setPolBalance(polAmt);
          if (usdtAmt !== undefined) setUsdtBalance(usdtAmt);
        }}
        onEnableAutoTrade={() => {
          setConfig((prev) => ({
            ...prev,
            autoTradeEnabled: true,
            executionMode: 'LIVE',
          }));
          addLog('TRADE', '[AUTO-TRADE ACTIVATED] Automated live trading engine initialized on Polygon DEXes (QuickSwap + SushiSwap).', true);
        }}
      />
    </div>
  );
}
