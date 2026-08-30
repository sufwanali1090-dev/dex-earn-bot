import React from 'react';
import {
  Zap,
  Activity,
  Sliders,
  Terminal,
  Volume2,
  VolumeX,
  Code2,
  RefreshCw,
  Wallet,
  ShieldCheck,
  Key,
} from 'lucide-react';
import { BotConfig, RpcEndpoint } from '../types';

interface HeaderProps {
  config: BotConfig;
  setConfig: React.Dispatch<React.SetStateAction<BotConfig>>;
  activeRpc: RpcEndpoint;
  currentGasGwei: number;
  walletBalanceUsd: number;
  polBalance?: number;
  usdtBalance?: number;
  connectedAddress: string | null;
  openRpcModal: () => void;
  openPythonModal: () => void;
  openWalletModal: () => void;
  openPrivateKeyModal: () => void;
  isScanning: boolean;
  totalScans: number;
}

export const Header: React.FC<HeaderProps> = ({
  config,
  setConfig,
  activeRpc,
  currentGasGwei,
  walletBalanceUsd,
  polBalance = 0,
  usdtBalance = 0,
  connectedAddress,
  openRpcModal,
  openPythonModal,
  openWalletModal,
  openPrivateKeyModal,
  isScanning,
  totalScans,
}) => {
  return (
    <header className="border-b border-white/10 bg-white/5 backdrop-blur-xl sticky top-0 z-40 shadow-[0_4px_30px_rgba(0,0,0,0.5)]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3.5">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          {/* Logo and Network Status */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-600/30 backdrop-blur-md border border-indigo-400/30 flex items-center justify-center shadow-[0_0_15px_rgba(99,102,241,0.3)] ring-1 ring-white/10">
              <Zap className="w-5 h-5 text-indigo-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 bg-green-500 rounded-full shadow-[0_0_10px_#22c55e] animate-pulse" />
                <h1 className="text-lg font-bold tracking-tight text-white uppercase flex items-center gap-2">
                  DexEarn <span className="text-indigo-400 font-extrabold">Polygon v2.4</span>
                </h1>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/5 text-indigo-300 border border-white/10 font-mono font-medium backdrop-blur-sm">
                  Chain 137
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-medium">
                High-frequency DEX-to-DEX & 3-Hop Triangular cycle scanner
              </p>
            </div>
          </div>

          {/* Strategy Tabs: DEX-to-DEX and Triangular */}
          <div className="flex items-center bg-white/5 backdrop-blur-lg p-1 rounded-2xl border border-white/10">
            <button
              id="tab-dex-to-dex"
              onClick={() => setConfig((prev) => ({ ...prev, activeStrategy: 'dex_to_dex' }))}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
                config.activeStrategy === 'dex_to_dex'
                  ? 'bg-indigo-600/40 text-white border border-indigo-400/50 shadow-lg shadow-indigo-950/50'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-white/5 border border-transparent'
              }`}
            >
              <Activity className="w-3.5 h-3.5 text-indigo-300" />
              <span>DEX TO DEX</span>
              <div
                className={`w-2 h-2 rounded-full ${
                  config.activeStrategy === 'dex_to_dex' ? 'bg-white shadow-[0_0_6px_#fff]' : 'border border-white/30'
                }`}
              />
            </button>
            <button
              id="tab-triangular"
              onClick={() => setConfig((prev) => ({ ...prev, activeStrategy: 'triangular' }))}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
                config.activeStrategy === 'triangular'
                  ? 'bg-indigo-600/40 text-white border border-indigo-400/50 shadow-lg shadow-indigo-950/50'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-white/5 border border-transparent'
              }`}
            >
              <RefreshCw className="w-3.5 h-3.5 text-indigo-300" />
              <span>TRIANGLE TRADE</span>
              <div
                className={`w-2 h-2 rounded-full ${
                  config.activeStrategy === 'triangular' ? 'bg-white shadow-[0_0_6px_#fff]' : 'border border-white/30'
                }`}
              />
            </button>
          </div>

          {/* RPC Latency, Gas, Mode, and Action Controls */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* RPC Indicator */}
            <button
              id="btn-rpc-settings"
              onClick={openRpcModal}
              title="Click to change or test Polygon RPC node"
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/5 backdrop-blur-md border border-white/10 text-xs text-slate-300 hover:bg-white/10 hover:border-white/20 transition-all shadow-sm"
            >
              <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_6px_#34d399] animate-pulse"></span>
              <div className="flex flex-col items-start leading-tight">
                <span className="text-[9px] uppercase tracking-wider text-slate-400">RPC</span>
                <span className="font-mono text-[11px] max-w-[110px] truncate text-indigo-300 font-medium">
                  {activeRpc.name.split(' ')[0]}
                </span>
              </div>
              <span className="px-1.5 py-0.5 rounded-md bg-indigo-500/20 text-[10px] font-mono text-indigo-300 border border-indigo-500/30">
                {activeRpc.latencyMs > 0 ? `${activeRpc.latencyMs}ms` : '18ms'}
              </span>
            </button>

            {/* Realtime Live Price Stream Badge */}
            <div
              title="Binance WebSocket & DexScreener Ultra-Fast Live Stream Active"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-cyan-500/10 backdrop-blur-md border border-cyan-500/20 text-xs text-cyan-300"
            >
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-400"></span>
              </span>
              <span className="font-mono text-[11px] font-semibold tracking-wide">
                ⚡ 100+ LIVE FEEDS
              </span>
            </div>

            {/* Polygon Gas Badge */}
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 backdrop-blur-md border border-white/10 text-xs text-slate-300">
              <span className="text-amber-400 font-mono font-medium">
                ⛽ {currentGasGwei.toFixed(1)} Gwei
              </span>
              <span className="text-[10px] text-indigo-300 font-mono hidden sm:inline">
                ({((currentGasGwei * 260000) / 1e9).toFixed(4)} POL)
              </span>
            </div>

            {/* Trust Wallet Connect Button */}
            <button
              id="btn-trust-wallet-connect"
              onClick={openWalletModal}
              title={connectedAddress ? `Connected: ${connectedAddress}` : 'Connect Trust Wallet on Polygon'}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold transition-all shadow-sm ${
                connectedAddress
                  ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/25'
                  : 'bg-gradient-to-r from-[#0500FF]/40 to-[#00D2FF]/40 border-cyan-400/40 hover:border-cyan-300 text-white shadow-[0_0_12px_rgba(0,210,255,0.25)]'
              }`}
            >
              <ShieldCheck className={`w-3.5 h-3.5 ${connectedAddress ? 'text-emerald-400' : 'text-cyan-300'}`} />
              <span className="font-mono text-[11px]">
                {connectedAddress
                  ? `${connectedAddress.slice(0, 6)}...${connectedAddress.slice(-4)}`
                  : 'Connect Trust Wallet'}
              </span>
            </button>

            {/* Balance & Mode Badge */}
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/5 backdrop-blur-md border border-white/10 text-xs">
              <span
                className={`font-semibold px-2 py-0.5 rounded-md text-[10px] uppercase font-mono ${
                  config.executionMode === 'LIVE'
                    ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30 shadow-[0_0_8px_rgba(244,63,94,0.3)]'
                    : 'bg-green-500/20 text-green-400 border border-green-500/30 shadow-[0_0_8px_rgba(34,197,94,0.3)]'
                }`}
              >
                {config.executionMode}
              </span>
              <div className="flex flex-col items-end leading-tight">
                <span className="font-mono text-white font-bold">
                  ${walletBalanceUsd.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
                {connectedAddress && (
                  <span className="text-[9px] text-emerald-300 font-mono">
                    {usdtBalance > 0 ? `${usdtBalance.toFixed(2)} USDT` : ''}
                    {usdtBalance > 0 && polBalance > 0 ? ' • ' : ''}
                    {polBalance > 0 ? `${polBalance.toFixed(2)} POL` : ''}
                  </span>
                )}
              </div>
            </div>

            {/* Sound Alert Toggle */}
            <button
              id="btn-sound-toggle"
              onClick={() => setConfig((prev) => ({ ...prev, soundAlerts: !prev.soundAlerts }))}
              title={config.soundAlerts ? 'Sound Alerts: ON' : 'Sound Alerts: OFF'}
              className="p-2 rounded-xl bg-white/5 backdrop-blur-md border border-white/10 text-slate-400 hover:text-white hover:bg-white/10 transition-all"
            >
              {config.soundAlerts ? <Volume2 className="w-4 h-4 text-indigo-400" /> : <VolumeX className="w-4 h-4" />}
            </button>

            {/* Private Key Automated Bot Config */}
            <button
              id="btn-open-private-key"
              onClick={openPrivateKeyModal}
              title={config.privateKey ? 'Private Key Auto-Trader Active (Zero Popup)' : 'Configure Private Key for automated zero-popup trading'}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-semibold transition-all shadow-sm ${
                config.privateKey
                  ? 'bg-amber-500/20 text-amber-300 border-amber-400/50 shadow-[0_0_12px_rgba(245,158,11,0.3)] animate-pulse'
                  : 'bg-white/5 hover:bg-white/10 text-slate-300 border-white/10'
              }`}
            >
              <Key className={`w-3.5 h-3.5 ${config.privateKey ? 'text-amber-400' : 'text-slate-400'}`} />
              <span>{config.privateKey ? 'Auto-Key: Set' : 'Private Key'}</span>
            </button>

            {/* Python Bot Script Modal */}
            <button
              id="btn-open-python-code"
              onClick={openPythonModal}
              title="Get updated standalone Python bot script with Ankr Polygon RPC"
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs text-slate-300 font-semibold transition-all shadow-sm"
            >
              <Code2 className="w-3.5 h-3.5 text-amber-400" />
              <span>Python Bot</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
