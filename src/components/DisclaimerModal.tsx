import React, { useState } from 'react';
import {
  AlertTriangle,
  ShieldAlert,
  CheckCircle2,
  Lock,
  Coins,
  Scale,
  Zap,
  ExternalLink,
  Info,
  ShieldCheck,
} from 'lucide-react';

interface DisclaimerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const DisclaimerModal: React.FC<DisclaimerModalProps> = ({ isOpen, onClose }) => {
  const [hasAcknowledged, setHasAcknowledged] = useState(false);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-lg animate-fade-in">
      <div className="bg-[#0b0c16]/98 backdrop-blur-2xl border border-amber-500/40 rounded-3xl w-full max-w-2xl overflow-hidden shadow-[0_0_50px_rgba(245,158,11,0.2)] flex flex-col ring-1 ring-white/10 max-h-[92vh]">
        {/* Modal Header */}
        <div className="px-6 py-5 border-b border-white/10 flex items-center justify-between bg-gradient-to-r from-amber-950/50 via-purple-950/30 to-black/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-400/40 p-2 flex items-center justify-center shadow-[0_0_15px_rgba(245,158,11,0.3)]">
              <ShieldAlert className="w-6 h-6 text-amber-400" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white tracking-wide flex items-center gap-2">
                Risk Warning & Financial Disclaimer
              </h3>
              <p className="text-xs text-amber-300/80 font-medium">
                Mandatory Notice: High-Risk Automated DEX Arbitrage
              </p>
            </div>
          </div>
          <span className="px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/30 text-[10px] font-mono font-bold">
            REQUIRED NOTICE
          </span>
        </div>

        {/* Modal Content */}
        <div className="p-6 space-y-4 overflow-y-auto text-xs text-slate-300 leading-relaxed max-h-[62vh]">
          {/* Main Attention Callout */}
          <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <h4 className="font-bold text-amber-200 text-sm">
                Trading Carries High Risk — Profits Are NOT Guaranteed
              </h4>
              <p className="text-slate-300 text-[11px] leading-relaxed">
                This automated arbitrage bot is an algorithmic software tool designed for decentralized exchanges (QuickSwap, SushiSwap, ApeSwap, Dfyn) on the Polygon PoS Mainnet. <strong>There is absolutely NO guarantee of profit</strong>. You may experience financial losses due to market volatility, MEV front-running, network latency, or smart contract liquidity changes.
              </p>
            </div>
          </div>

          {/* Sectioned Bullet Points */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
            {/* Box 1: PnL & Volatility */}
            <div className="p-3.5 rounded-xl bg-white/5 border border-white/10 space-y-1.5">
              <div className="flex items-center gap-2 text-indigo-300 font-bold text-xs">
                <Scale className="w-4 h-4 text-indigo-400" />
                <span>Profit & Loss Disclosure</span>
              </div>
              <p className="text-[11px] text-slate-400">
                Arbitrage opportunities occur in fractions of a second. Price spreads displayed by scanners reflect live mempool estimates and may narrow or invert before on-chain execution finalizes.
              </p>
            </div>

            {/* Box 2: Non-refundable Gas Fees */}
            <div className="p-3.5 rounded-xl bg-white/5 border border-white/10 space-y-1.5">
              <div className="flex items-center gap-2 text-purple-300 font-bold text-xs">
                <Coins className="w-4 h-4 text-purple-400" />
                <span>Polygon Gas Fees (POL)</span>
              </div>
              <p className="text-[11px] text-slate-400">
                All transactions executed on Polygon PoS consume native POL/MATIC gas fees paid to network validators. Gas fees are non-refundable regardless of whether a swap succeeds or reverts.
              </p>
            </div>

            {/* Box 3: 25% Developer Fee */}
            <div className="p-3.5 rounded-xl bg-emerald-950/30 border border-emerald-500/30 space-y-1.5">
              <div className="flex items-center gap-2 text-emerald-300 font-bold text-xs">
                <Zap className="w-4 h-4 text-emerald-400" />
                <span>25% Developer Profit Share</span>
              </div>
              <p className="text-[11px] text-slate-300">
                When the bot generates net realized profit, <strong>25% of the net profit</strong> is automatically routed to developer wallet <code className="text-emerald-300 font-mono text-[10px] bg-black/40 px-1 py-0.5 rounded">0x6981Be93...12f1</code> as a usage fee. Your original trade capital remains 100% untouched.
              </p>
            </div>

            {/* Box 4: Master License Key */}
            <div className="p-3.5 rounded-xl bg-indigo-950/30 border border-indigo-500/30 space-y-1.5">
              <div className="flex items-center gap-2 text-indigo-300 font-bold text-xs">
                <Lock className="w-4 h-4 text-indigo-400" />
                <span>Master Activation Key Required</span>
              </div>
              <p className="text-[11px] text-slate-300">
                Wallet connection and automated trading are protected by a private protocol license key. Access is restricted exclusively to authorized users provided with the key by the bot owner.
              </p>
            </div>
          </div>

          {/* Non-Custodial Legal Notice */}
          <div className="p-3.5 rounded-xl bg-black/40 border border-white/5 space-y-1.5 text-[11px] text-slate-400">
            <span className="font-bold text-slate-300 block">Non-Custodial Architecture & User Responsibility:</span>
            <p>
              You maintain exclusive custody of your funds and private keys. The developers and contributors of this software accept no liability for any direct, indirect, incidental, or consequential losses incurred through the use of this trading software.
            </p>
          </div>

          {/* Checkbox Acknowledgment */}
          <label className="flex items-start gap-3 p-3.5 rounded-xl bg-white/5 border border-white/10 hover:border-amber-500/40 cursor-pointer transition-all">
            <input
              type="checkbox"
              id="checkbox-disclaimer-acknowledgment"
              checked={hasAcknowledged}
              onChange={(e) => setHasAcknowledged(e.target.checked)}
              className="mt-0.5 w-4 h-4 rounded text-amber-500 bg-black/50 border-white/20 focus:ring-amber-400 focus:ring-offset-0"
            />
            <span className="text-[11px] text-slate-200 select-none">
              I have read, understood, and accept the risks associated with cryptocurrency arbitrage. I understand that profits are not guaranteed, gas fees are non-refundable, and I agree to the 25% developer profit fee and protocol terms.
            </span>
          </label>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 bg-white/5 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-[11px] text-slate-400 font-mono">
            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>Master Protocol Protection Active</span>
          </div>

          <button
            id="btn-accept-disclaimer"
            onClick={onClose}
            disabled={!hasAcknowledged}
            className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 via-amber-600 to-indigo-600 hover:opacity-95 text-white font-bold text-xs shadow-[0_0_20px_rgba(245,158,11,0.3)] transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            <CheckCircle2 className="w-4 h-4 text-white" />
            <span>I Understand & Accept — Enter Trading Floor</span>
          </button>
        </div>
      </div>
    </div>
  );
};
