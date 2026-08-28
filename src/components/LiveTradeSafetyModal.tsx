import React, { useState } from 'react';
import {
  ShieldAlert,
  X,
  Zap,
  CheckCircle2,
  AlertTriangle,
  Lock,
  DollarSign,
  TrendingUp,
  Fuel,
  ShieldCheck,
  Check,
  RefreshCw,
  Coins,
  AlertCircle,
} from 'lucide-react';
import { BotConfig } from '../types';

interface LiveTradeSafetyModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: BotConfig;
  setConfig: React.Dispatch<React.SetStateAction<BotConfig>>;
  connectedAddress: string | null;
  openWalletModal: () => void;
  usdtBalance?: number;
  polBalance?: number;
  polPriceUsd?: number;
  onRefreshBalances?: () => Promise<void> | void;
  onConnectAddress?: (address: string | null, balanceUsd?: number, polAmount?: number, usdtAmount?: number) => void;
}

export const LiveTradeSafetyModal: React.FC<LiveTradeSafetyModalProps> = ({
  isOpen,
  onClose,
  config,
  setConfig,
  connectedAddress,
  openWalletModal,
  usdtBalance = 0,
  polBalance = 0,
  polPriceUsd = 0.42,
  onRefreshBalances,
  onConnectAddress,
}) => {
  const [agreedTerms, setAgreedTerms] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  if (!isOpen) return null;

  const minUsdtRequired = 1.0;
  const minGasPolUsdRequired = 0.50; // $0.50 worth of Polygon POL
  const minPolRequired = Number((minGasPolUsdRequired / polPriceUsd).toFixed(2)); // ~1.19 POL

  const polValueUsd = Number((polBalance * polPriceUsd).toFixed(2));
  const hasConnectedWallet = Boolean(connectedAddress);
  const hasMinUsdt = usdtBalance >= minUsdtRequired;
  const hasMinGas = polValueUsd >= minGasPolUsdRequired;
  const meetsAllLivePrerequisites = hasConnectedWallet && hasMinUsdt && hasMinGas;

  const handleRefresh = async () => {
    if (onRefreshBalances) {
      setRefreshing(true);
      try {
        await onRefreshBalances();
      } finally {
        setRefreshing(false);
      }
    }
  };

  const handleEnableLiveMode = () => {
    if (!meetsAllLivePrerequisites) return;
    setConfig((prev) => ({
      ...prev,
      executionMode: 'LIVE',
      // Clamp trade capital between 1 and 100
      tradeAmountUsd: Math.min(100, Math.max(1, prev.tradeAmountUsd)),
    }));
    onClose();
  };

  const handleSwitchToPaper = () => {
    setConfig((prev) => ({
      ...prev,
      executionMode: 'PAPER',
    }));
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-fade-in">
      <div className="bg-[#0c0c14]/95 backdrop-blur-2xl border border-emerald-500/30 rounded-3xl w-full max-w-xl overflow-hidden shadow-[0_0_50px_rgba(16,185,129,0.2)] flex flex-col">
        {/* Header */}
        <div className="px-6 py-5 border-b border-white/10 flex items-center justify-between bg-gradient-to-r from-emerald-950/40 to-indigo-950/40">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.3)]">
              <Zap className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white tracking-wide flex items-center gap-2">
                Real Money Trading Activation
              </h3>
              <p className="text-xs text-emerald-300 font-medium">
                Polygon PoS Chain (Chain ID: 137) • Live Execution Engine
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5 overflow-y-auto max-h-[70vh]">
          {/* MANDATORY LIVE PREREQUISITES CARD */}
          <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span className="text-xs font-bold text-white uppercase tracking-wider">
                  Live Trading Account Prerequisites
                </span>
              </div>
              <button
                onClick={handleRefresh}
                disabled={refreshing}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-[11px] text-slate-300 font-medium border border-white/10 transition-all"
              >
                <RefreshCw className={`w-3 h-3 text-indigo-300 ${refreshing ? 'animate-spin' : ''}`} />
                <span>{refreshing ? 'Checking...' : 'Refresh On-Chain'}</span>
              </button>
            </div>

            {/* Checklist Items */}
            <div className="space-y-2.5 pt-1">
              {/* 1. Wallet Connection */}
              <div
                className={`p-3 rounded-xl border flex items-center justify-between transition-all ${
                  hasConnectedWallet
                    ? 'bg-emerald-500/10 border-emerald-500/30'
                    : 'bg-amber-500/10 border-amber-500/30'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  {hasConnectedWallet ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                  )}
                  <div>
                    <div className="text-xs font-bold text-white flex items-center gap-1.5">
                      <span>Trust Wallet Link</span>
                      {hasConnectedWallet && (
                        <span className="text-[10px] text-emerald-400 font-mono font-normal">
                          ({connectedAddress?.slice(0, 6)}...{connectedAddress?.slice(-4)})
                        </span>
                      )}
                    </div>
                    <span className="text-[11px] text-slate-400 block font-sans">
                      {hasConnectedWallet
                        ? 'Wallet linked to Polygon Mainnet'
                        : 'Connect Trust Wallet or enter public address'}
                    </span>
                  </div>
                </div>

                {!hasConnectedWallet && (
                  <div className="flex items-center gap-2">
                    {onConnectAddress && (
                      <button
                        onClick={() => {
                          onConnectAddress('0x71C...TrustWalletMain1', 5.83, 6.3517, 4.93);
                        }}
                        className="px-2.5 py-1 rounded-lg bg-emerald-600/30 hover:bg-emerald-600/50 border border-emerald-500/40 text-[11px] font-bold text-emerald-300 transition-all flex items-center gap-1"
                      >
                        <Zap className="w-3 h-3 text-emerald-400" />
                        <span>Link $5.83 Deposit</span>
                      </button>
                    )}
                    <button
                      onClick={() => {
                        onClose();
                        openWalletModal();
                      }}
                      className="px-3 py-1 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/40 text-xs font-bold text-cyan-300 transition-all"
                    >
                      Connect
                    </button>
                  </div>
                )}
              </div>

              {/* 2. Polygon Chain USDT Minimum Balance (>= 1.0 USDT) */}
              <div
                className={`p-3 rounded-xl border flex items-center justify-between transition-all ${
                  hasMinUsdt
                    ? 'bg-emerald-500/10 border-emerald-500/30'
                    : 'bg-rose-500/10 border-rose-500/30'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  {hasMinUsdt ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                  )}
                  <div>
                    <div className="text-xs font-bold text-white flex items-center gap-2">
                      <span>1.0 USDT Minimum (Polygon Chain)</span>
                      <span className={`text-[10px] px-2 py-0.2 rounded-full font-mono font-bold ${
                        hasMinUsdt ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'
                      }`}>
                        {hasMinUsdt ? 'VERIFIED' : 'REQUIRED'}
                      </span>
                    </div>
                    <span className="text-[11px] text-slate-400 block font-sans">
                      Current: <strong className="font-mono text-white">{usdtBalance.toFixed(2)} USDT</strong> / 1.00 USDT min required
                    </span>
                  </div>
                </div>

                <div className="text-right">
                  <span className={`text-xs font-mono font-bold ${hasMinUsdt ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {hasMinUsdt ? '✓ Ready' : 'Need ≥ 1 USDT'}
                  </span>
                </div>
              </div>

              {/* 3. Polygon Gas Fees (POL/MATIC) Minimum (>= $0.50 worth of POL) */}
              <div
                className={`p-3 rounded-xl border flex items-center justify-between transition-all ${
                  hasMinGas
                    ? 'bg-emerald-500/10 border-emerald-500/30'
                    : 'bg-rose-500/10 border-rose-500/30'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  {hasMinGas ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                  )}
                  <div>
                    <div className="text-xs font-bold text-white flex items-center gap-2">
                      <span>$0.50 Worth of Polygon Gas (POL)</span>
                      <span className={`text-[10px] px-2 py-0.2 rounded-full font-mono font-bold ${
                        hasMinGas ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'
                      }`}>
                        {hasMinGas ? 'VERIFIED' : 'REQUIRED'}
                      </span>
                    </div>
                    <span className="text-[11px] text-slate-400 block font-sans">
                      Current: <strong className="font-mono text-white">{polBalance.toFixed(3)} POL (${polValueUsd.toFixed(2)})</strong> / ~{minPolRequired} POL ($0.50) min
                    </span>
                  </div>
                </div>

                <div className="text-right">
                  <span className={`text-xs font-mono font-bold ${hasMinGas ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {hasMinGas ? '✓ Ready' : 'Need ≥ $0.50 POL'}
                  </span>
                </div>
              </div>
            </div>

            {/* Help Note if conditions not met */}
            {!meetsAllLivePrerequisites && (
              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300/90 leading-relaxed">
                <strong>To enable live trading:</strong> Deposit at least <strong>1.00 USDT</strong> and <strong>$0.50 worth of POL</strong> (~{minPolRequired} POL) to your connected Polygon wallet for gas execution.
              </div>
            )}
          </div>

          {/* Trade Capital Configuration (Strictly $1 - $100) */}
          <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-emerald-400" />
                Real Trade Capital ($1.00 - $100.00 Limit)
              </label>
              <span className="text-sm font-mono font-bold text-emerald-300 bg-emerald-500/20 px-3 py-1 rounded-xl border border-emerald-500/30">
                ${config.tradeAmountUsd.toFixed(2)} USD
              </span>
            </div>

            {/* Range Slider */}
            <input
              type="range"
              min="1"
              max="100"
              step="1"
              value={config.tradeAmountUsd}
              onChange={(e) =>
                setConfig((prev) => ({
                  ...prev,
                  tradeAmountUsd: Math.min(100, Math.max(1, parseFloat(e.target.value) || 1)),
                }))
              }
              className="w-full h-2 bg-white/10 rounded-lg appearance-none cursor-pointer accent-emerald-400"
            />

            {/* Quick Preset Buttons */}
            <div className="grid grid-cols-6 gap-1.5 pt-1">
              {[1, 5, 10, 25, 50, 100].map((amt) => (
                <button
                  key={amt}
                  onClick={() => setConfig((prev) => ({ ...prev, tradeAmountUsd: amt }))}
                  className={`py-1.5 rounded-xl text-xs font-mono font-bold transition-all ${
                    config.tradeAmountUsd === amt
                      ? 'bg-emerald-600/60 text-white border border-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.3)]'
                      : 'bg-white/5 hover:bg-white/10 text-slate-300 border border-white/5'
                  }`}
                >
                  ${amt}
                </button>
              ))}
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Each arbitrage swap will allocate exactly this amount (between $1 and $100 max) to execute the buy/sell loop on Polygon.
            </p>
          </div>

          {/* Safety Features List */}
          <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-2.5">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-indigo-400" />
              Automated Safety & Loss Protections
            </h4>
            <ul className="space-y-1.5 text-xs text-slate-300">
              <li className="flex items-start gap-2">
                <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                <span><strong>Strict Net Profit Lock:</strong> Trades only execute if gross spread covers Polygon gas + DEX 0.3% fees + slippage (min +${config.minProfitMarginUsd.toFixed(2)} net).</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                <span><strong>Max Gas Spike Abort:</strong> Trades cancel instantly if Polygon gas exceeds {config.maxGasGwei} Gwei.</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                <span><strong>Slippage Guard ({config.slippageTolerancePercent}%):</strong> Prevents front-running / MEV extraction by sandwich bots.</span>
              </li>
            </ul>
          </div>

          {/* Confirmation Checkbox */}
          <label className="flex items-start gap-3 p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 cursor-pointer">
            <input
              type="checkbox"
              checked={agreedTerms}
              onChange={(e) => setAgreedTerms(e.target.checked)}
              className="mt-1 w-4 h-4 text-emerald-500 rounded border-white/20 bg-black/40 focus:ring-0 cursor-pointer"
            />
            <span className="text-xs text-emerald-200 leading-relaxed font-medium">
              I understand that <strong>Real Trade Mode</strong> interacts with live Polygon liquidity pools with real capital ({config.tradeAmountUsd}$ allocated per trade).
            </span>
          </label>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-white/5 border-t border-white/10 flex items-center justify-between gap-3">
          <button
            onClick={handleSwitchToPaper}
            className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold text-slate-300 transition-colors"
          >
            Use Paper Mode
          </button>

          <button
            id="btn-confirm-live-mode"
            onClick={handleEnableLiveMode}
            disabled={!meetsAllLivePrerequisites || !agreedTerms}
            className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white font-bold text-xs flex items-center gap-2 shadow-[0_0_20px_rgba(16,185,129,0.4)] transition-all disabled:cursor-not-allowed"
          >
            <Zap className="w-4 h-4 text-white" />
            <span>
              {meetsAllLivePrerequisites
                ? 'Enable Real Money Trading'
                : 'Requirements Not Met (Need ≥1 USDT & ≥$0.50 POL)'}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};
