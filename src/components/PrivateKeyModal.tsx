import React, { useState, useEffect } from 'react';
import {
  Key,
  Shield,
  ShieldCheck,
  ShieldAlert,
  Eye,
  EyeOff,
  Zap,
  Lock,
  Unlock,
  AlertTriangle,
  CheckCircle2,
  Trash2,
  Copy,
  Check,
  X,
  Play,
  Terminal,
  ExternalLink,
} from 'lucide-react';
import { ethers, Wallet } from 'ethers';
import { polygonRpc } from '../services/polygonRpc';

interface PrivateKeyModalProps {
  isOpen: boolean;
  onClose: () => void;
  savedPrivateKey?: string;
  onSavePrivateKey: (privateKey: string | undefined) => void;
  onConnectAddress: (address: string | null, balanceUsd?: number, polAmount?: number, usdtAmount?: number) => void;
  onEnableAutoTrade: () => void;
}

export const PrivateKeyModal: React.FC<PrivateKeyModalProps> = ({
  isOpen,
  onClose,
  savedPrivateKey,
  onSavePrivateKey,
  onConnectAddress,
  onEnableAutoTrade,
}) => {
  const [inputKey, setInputKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [derivedAddress, setDerivedAddress] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [copied, setCopied] = useState(false);
  const [walletBalance, setWalletBalance] = useState<{ pol: number; usdt: number; usd: number } | null>(null);

  useEffect(() => {
    if (savedPrivateKey) {
      setInputKey(savedPrivateKey);
      validateAndDerive(savedPrivateKey, false);
    } else {
      setInputKey('');
      setDerivedAddress(null);
      setWalletBalance(null);
    }
  }, [savedPrivateKey, isOpen]);

  const validateAndDerive = async (key: string, fetchBal: boolean = true) => {
    setValidationError(null);
    setSavedSuccess(false);

    let clean = key.trim();
    if (!clean) {
      setDerivedAddress(null);
      setWalletBalance(null);
      return;
    }

    if (!clean.startsWith('0x')) {
      clean = '0x' + clean;
    }

    if (clean.length !== 66) {
      setDerivedAddress(null);
      setValidationError('Private key must be a 64-character hex string (with or without 0x prefix).');
      return;
    }

    try {
      setIsValidating(true);
      const wallet = new Wallet(clean);
      setDerivedAddress(wallet.address);

      if (fetchBal) {
        const bal = await polygonRpc.getLiveWalletBalance(wallet.address);
        setWalletBalance({
          pol: bal.polBalance,
          usdt: bal.usdtBalance,
          usd: bal.totalBalanceUsd,
        });
      }
    } catch (err: any) {
      setDerivedAddress(null);
      setValidationError('Invalid private key format: ' + (err.message || 'Verification failed'));
    } finally {
      setIsValidating(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setInputKey(val);
    validateAndDerive(val, true);
  };

  const handleSaveAndActivate = async () => {
    if (!inputKey.trim() || !derivedAddress) {
      setValidationError('Please enter a valid Polygon private key before activating.');
      return;
    }

    let clean = inputKey.trim();
    if (!clean.startsWith('0x')) {
      clean = '0x' + clean;
    }

    try {
      setIsValidating(true);
      const bal = await polygonRpc.getLiveWalletBalance(derivedAddress);
      onSavePrivateKey(clean);
      onConnectAddress(derivedAddress, bal.totalBalanceUsd, bal.polBalance, bal.usdtBalance);
      onEnableAutoTrade();
      setSavedSuccess(true);
      setTimeout(() => {
        onClose();
      }, 1200);
    } catch (err: any) {
      setValidationError('Failed to sync wallet: ' + err.message);
    } finally {
      setIsValidating(false);
    }
  };

  const handleClearKey = () => {
    onSavePrivateKey(undefined);
    setInputKey('');
    setDerivedAddress(null);
    setWalletBalance(null);
    setSavedSuccess(false);
    setValidationError(null);
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="bg-[#0b0c16]/95 backdrop-blur-2xl border border-indigo-500/30 rounded-3xl w-full max-w-xl overflow-hidden shadow-2xl flex flex-col ring-1 ring-white/10">
        {/* Header */}
        <div className="px-6 py-5 border-b border-white/10 flex items-center justify-between bg-gradient-to-r from-indigo-950/60 via-purple-950/40 to-black/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-500 to-indigo-600 p-2.5 flex items-center justify-center shadow-[0_0_20px_rgba(245,158,11,0.3)]">
              <Key className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white tracking-wide">
                  Private Key Auto-Trader Mode
                </h3>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 font-bold uppercase">
                  Zero Popup
                </span>
              </div>
              <p className="text-xs text-slate-400 font-medium">
                Enables instantaneous 100% automated on-chain arbitrage execution
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

        {/* Content Body */}
        <div className="p-6 space-y-5 overflow-y-auto max-h-[75vh]">
          {/* How Private Key Auto-Trading Works */}
          <div className="p-4 rounded-2xl bg-indigo-950/40 border border-indigo-500/30 space-y-2">
            <div className="flex items-center gap-2 text-xs font-bold text-indigo-300">
              <Zap className="w-4 h-4 text-amber-400" />
              <span>Why add a Private Key?</span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Standard browser wallets (like Trust Wallet / MetaMask) require manual clicking on popups for every single swap.
              Adding a dedicated Polygon private key allows the bot to <strong>sign and broadcast profitable swap transactions instantly</strong> to QuickSwap & SushiSwap without waiting for manual confirmation clicks.
            </p>
          </div>

          {/* Key Input Section */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-200 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-amber-400" />
                <span>Polygon Wallet Private Key (Hex)</span>
              </span>
              <span className="text-[11px] text-slate-400 font-mono">
                {inputKey.trim().length > 0 ? `${inputKey.trim().length} chars` : '64 hex characters'}
              </span>
            </label>

            <div className="relative">
              <input
                type={showKey ? 'text' : 'password'}
                value={inputKey}
                onChange={handleInputChange}
                placeholder="e.g. 0x4f3edf983ac636a65a842ce7c78d9aa706d3b113bce9c46f30d7d21715b23b1d"
                className="w-full bg-black/50 border border-white/15 focus:border-amber-400/80 rounded-2xl px-4 py-3 text-xs font-mono text-white placeholder:text-slate-600 focus:outline-none pr-24 transition-all shadow-inner"
              />
              <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setShowKey(!showKey)}
                  className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
                  title={showKey ? 'Hide key' : 'Reveal key'}
                >
                  {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
                {inputKey && (
                  <button
                    type="button"
                    onClick={() => {
                      setInputKey('');
                      setDerivedAddress(null);
                      setWalletBalance(null);
                      setValidationError(null);
                    }}
                    className="p-1.5 rounded-lg bg-white/5 hover:bg-rose-500/20 text-slate-400 hover:text-rose-300 transition-colors"
                    title="Clear input"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            {/* Validation / Error Display */}
            {validationError && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-start gap-2 text-xs text-rose-300">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
                <span>{validationError}</span>
              </div>
            )}
          </div>

          {/* Derived Public Address and Live Balances */}
          {derivedAddress && (
            <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-950/40 via-indigo-950/30 to-black/50 border border-emerald-500/40 space-y-3 shadow-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-[0_0_8px_#34d399] animate-pulse" />
                  <span className="text-xs font-bold text-emerald-300 uppercase tracking-wider">
                    Derived On-Chain Address
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => handleCopy(derivedAddress)}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/15 text-[11px] text-slate-200 font-mono transition-all"
                  >
                    {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    <span>{copied ? 'Copied' : 'Copy'}</span>
                  </button>
                  <a
                    href={`https://polygonscan.com/address/${derivedAddress}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-1 rounded-lg bg-white/10 hover:bg-white/15 text-cyan-400 hover:text-cyan-300 transition-colors"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>

              <div className="p-2.5 rounded-xl bg-black/40 border border-white/10 font-mono text-xs text-white truncate">
                {derivedAddress}
              </div>

              {/* Wallet On-Chain Balances */}
              {walletBalance && (
                <div className="grid grid-cols-3 gap-2 pt-1">
                  <div className="p-2.5 rounded-xl bg-black/40 border border-white/10">
                    <span className="text-[10px] text-slate-400 uppercase font-bold block">USDT</span>
                    <span className="text-sm font-bold font-mono text-emerald-400">
                      {walletBalance.usdt.toFixed(2)}
                    </span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-black/40 border border-white/10">
                    <span className="text-[10px] text-slate-400 uppercase font-bold block">Gas POL</span>
                    <span className="text-sm font-bold font-mono text-white">
                      {walletBalance.pol.toFixed(3)}
                    </span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-black/40 border border-emerald-500/30">
                    <span className="text-[10px] text-emerald-300 uppercase font-bold block">Total USD</span>
                    <span className="text-sm font-bold font-mono text-emerald-300">
                      ${walletBalance.usd.toFixed(2)}
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Safety & Security Best Practices */}
          <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 space-y-1.5 text-xs text-amber-200">
            <div className="flex items-center gap-1.5 font-bold text-amber-300">
              <ShieldAlert className="w-4 h-4 text-amber-400" />
              <span>Recommended Security Practice</span>
            </div>
            <p className="text-[11px] text-slate-300 leading-relaxed">
              We recommend creating a <strong>dedicated trading sub-account</strong> (hot wallet) funded with only the amount you want the bot to trade with (e.g. $5 - $50), rather than your main cold storage vault.
              Your key is processed locally in your browser memory and never transmitted to any central servers.
            </p>
          </div>

          {savedSuccess && (
            <div className="p-3.5 rounded-2xl bg-emerald-500/15 border border-emerald-500/40 flex items-center gap-2 text-xs text-emerald-300 font-bold">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Private key connected successfully! Auto-trading bot is now primed for zero-popup execution.</span>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 bg-white/5 border-t border-white/10 flex items-center justify-between gap-3">
          {savedPrivateKey ? (
            <button
              onClick={handleClearKey}
              className="px-3.5 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 text-xs font-semibold flex items-center gap-1.5 transition-all"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Remove Key</span>
            </button>
          ) : (
            <div className="flex items-center gap-1.5 text-xs text-slate-400">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Local Memory Execution</span>
            </div>
          )}

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold text-white transition-colors"
            >
              Cancel
            </button>
            <button
              id="btn-save-private-key-auto"
              onClick={handleSaveAndActivate}
              disabled={isValidating || !inputKey.trim() || !derivedAddress}
              className="px-5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-indigo-600 hover:from-amber-400 hover:to-indigo-500 text-white font-bold text-xs shadow-[0_0_20px_rgba(245,158,11,0.4)] disabled:opacity-40 transition-all flex items-center gap-1.5"
            >
              <Zap className="w-3.5 h-3.5 text-white" />
              <span>{savedPrivateKey ? 'Update & Activate Auto-Trade' : 'Save & Enable Auto-Trade'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
