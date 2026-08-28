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
import { executeRealDexToDexTrade, executeRealTriangularTrade } from './services/liveTradeExecutor';
import { Header } from './components/Header';
import { BotControlPanel } from './components/BotControlPanel';
import { DexToDexScanner } from './components/DexToDexScanner';
import { TriangularScanner } from './components/TriangularScanner';
import { LiveOpportunitiesFeed, LogEntry } from './components/LiveOpportunitiesFeed';
import { TradeHistoryLedger } from './components/TradeHistoryLedger';
import { RpcConfigModal } from './components/RpcConfigModal';
import { PythonScriptModal } from './components/PythonScriptModal';
import { DownloadZipModal } from './components/DownloadZipModal';
import { WalletConnectModal } from './components/WalletConnectModal';
import { LiveTradeSafetyModal } from './components/LiveTradeSafetyModal';

export default function App() {
  // Config
  const [config, setConfig] = useState<BotConfig>({
    scanIntervalMs: 250, // 250ms default high-frequency scan
    tradeAmountUsd: 50, // $50 default capital
    minProfitMarginUsd: 0.01, // Minimum $0.01 net profit after all fees
    minSpreadPercent: 0.40, // 0.40% minimum gross spread
    maxGasGwei: 80, // 80 Gwei gas ceiling
    slippageTolerancePercent: 0.20, // 0.2% slippage
    activeStrategy: 'dex_to_dex', // 'dex_to_dex' | 'triangular'
    autoTradeEnabled: false,
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
  const [downloadModalOpen, setDownloadModalOpen] = useState(false);
  const [walletModalOpen, setWalletModalOpen] = useState(false);
  const [liveModalOpen, setLiveModalOpen] = useState(false);
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
  const [dexToDexOpps, setDexToDexOpps] = useState<DexToDexOpportunity[]>([]);
  const [triangularOpps, setTriangularOpps] = useState<TriangularOpportunity[]>([]);
  const [executingId, setExecutingId] = useState<string | null>(null);

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
      setExecutingId(opp.id);
      const isLive = config.executionMode === 'LIVE';

      addLog(
        'TRADE',
        `${isLive ? '[REAL LIVE TRADE]' : '[PAPER TRADE]'} Executing DEX-to-DEX: Buy ${opp.tokenPair} on ${opp.buyDex.name} ($${opp.buyPrice.toFixed(2)}) ➔ Sell on ${opp.sellDex.name} ($${opp.sellPrice.toFixed(2)}) [Size: $${opp.tradeAmountUsd}]`,
        true
      );

      let txHash: string | undefined;
      let actualGasFee = opp.gasFeeUsd;
      let actualNetProfit = opp.netProfitUsd;

      if (isLive) {
        const liveRes = await executeRealDexToDexTrade(
          opp,
          connectedAddress,
          config.slippageTolerancePercent,
          config.tradeCapitalUsd
        );
        
        if (!liveRes.success) {
          addLog('WARN', `[TRADE CANCELLED] ${liveRes.error || 'Transaction rejected in Trust Wallet'}`);
          setExecutingId(null);
          return;
        }

        txHash = liveRes.txHash;
        actualGasFee = liveRes.actualGasCostUsd;
        actualNetProfit = liveRes.actualNetProfitUsd;

        // Auto-refresh real on-chain balances after broadcast
        setTimeout(() => {
          refreshWalletBalances();
        }, 1500);
      } else {
        await new Promise((r) => setTimeout(r, 180));
      }

      const newRecord: TradeRecord = {
        id: `tx-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        type: 'DEX_TO_DEX',
        timestamp: Date.now(),
        routeSummary: `${opp.tokenPair} (${opp.buyDex.name.split(' ')[0]} ➔ ${opp.sellDex.name.split(' ')[0]})`,
        tradeAmountUsd: opp.tradeAmountUsd,
        grossProfitUsd: opp.grossProfitUsd,
        dexFeesUsd: opp.dexFeesUsd,
        gasFeePol: opp.gasFeePol || (actualGasFee / 0.42),
        gasFeeUsd: actualGasFee,
        netProfitUsd: actualNetProfit,
        netRoiPercent: opp.netProfitPercent,
        status: 'FILLED',
        txHash,
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

      setExecutingId(null);
    },
    [addLog, config.executionMode, config.slippageTolerancePercent, config.tradeCapitalUsd, connectedAddress, refreshWalletBalances]
  );

  // Execute Triangular trade handler
  const handleExecuteTriangular = useCallback(
    async (opp: TriangularOpportunity) => {
      setExecutingId(opp.id);
      const isLive = config.executionMode === 'LIVE';
      const [t0, t1, t2] = opp.route;

      addLog(
        'TRADE',
        `${isLive ? '[REAL LIVE 3-HOP]' : '[PAPER 3-HOP]'} Executing on ${opp.dex.name}: ${t0.symbol} ➔ ${t1.symbol} ➔ ${t2.symbol} ➔ ${t0.symbol} (Multiplier: ${opp.cycleMultiplier}x) [Size: $${opp.tradeAmountUsd}]`,
        true
      );

      let txHash: string | undefined;
      let actualGasFee = opp.gasFeeUsd;
      let actualNetProfit = opp.netProfitUsd;

      if (isLive) {
        const liveRes = await executeRealTriangularTrade(opp, connectedAddress, config.tradeCapitalUsd);
        if (!liveRes.success) {
          addLog('WARN', `[3-HOP CANCELLED] ${liveRes.error || 'Transaction rejected in Trust Wallet'}`);
          setExecutingId(null);
          return;
        }

        txHash = liveRes.txHash;
        actualGasFee = liveRes.actualGasCostUsd;
        actualNetProfit = liveRes.actualNetProfitUsd;

        setTimeout(() => {
          refreshWalletBalances();
        }, 1500);
      } else {
        await new Promise((r) => setTimeout(r, 220));
      }

      const newRecord: TradeRecord = {
        id: `tx-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        type: 'TRIANGULAR',
        timestamp: Date.now(),
        routeSummary: `${t0.symbol} ➔ ${t1.symbol} ➔ ${t2.symbol} ➔ ${t0.symbol} (${opp.dex.name.split(' ')[0]})`,
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

      setExecutingId(null);
    },
    [addLog, config.executionMode, connectedAddress]
  );

  // Main Millisecond Scanning Loop
  useEffect(() => {
    if (!isScanning) return;

    const interval = setInterval(async () => {
      // Fluctuate gas slightly
      const gas = polygonRpc.fetchGasPrice ? await polygonRpc.fetchGasPrice() : 32.4;
      setCurrentGasGwei(gas);

      // Scan opportunities
      const d2d = arbitrageScanner.scanDexToDex(config);
      const tri = arbitrageScanner.scanTriangular(config);

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

      // Auto-Trade Trigger if enabled
      if (config.autoTradeEnabled && !executingId) {
        if (config.activeStrategy === 'dex_to_dex' && profitableD2D.length > 0) {
          const topOpp = profitableD2D[0];
          handleExecuteDexToDex(topOpp);
        } else if (config.activeStrategy === 'triangular' && profitableTri.length > 0) {
          const topOpp = profitableTri[0];
          handleExecuteTriangular(topOpp);
        }
      }
    }, config.scanIntervalMs);

    return () => clearInterval(interval);
  }, [
    isScanning,
    config,
    executingId,
    handleExecuteDexToDex,
    handleExecuteTriangular,
    playChime,
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
          openDownloadModal={() => setDownloadModalOpen(true)}
          openWalletModal={() => setWalletModalOpen(true)}
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
      </main>

      {/* Modals */}
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

      <DownloadZipModal
        isOpen={downloadModalOpen}
        onClose={() => setDownloadModalOpen(false)}
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
    </div>
  );
}
