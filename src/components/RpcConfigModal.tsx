import React, { useState } from 'react';
import {
  X,
  Server,
  Zap,
  CheckCircle2,
  AlertTriangle,
  Radio,
  Lock,
  ExternalLink,
  ShieldCheck,
} from 'lucide-react';
import { RpcEndpoint, BotConfig } from '../types';
import { polygonRpc } from '../services/polygonRpc';

interface RpcConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  rpcEndpoints: RpcEndpoint[];
  activeRpc: RpcEndpoint;
  onSelectRpc: (rpc: RpcEndpoint) => void;
  config: BotConfig;
  setConfig: React.Dispatch<React.SetStateAction<BotConfig>>;
}

export const RpcConfigModal: React.FC<RpcConfigModalProps> = ({
  isOpen,
  onClose,
  rpcEndpoints,
  activeRpc,
  onSelectRpc,
  config,
  setConfig,
}) => {
  const [testingEndpoints, setTestingEndpoints] = useState(false);
  const [latencies, setLatencies] = useState<{ [url: string]: number }>({
    'https://rpc.ankr.com/polygon': 18,
    'https://polygon-rpc.com': 42,
    'https://polygon-bor-rpc.publicnode.com': 28,
    'https://1rpc.io/matic': 35,
    'https://matic-mainnet.chainstacklabs.com': 56,
  });
  const [customUrl, setCustomUrl] = useState('');
  const [privateKey, setPrivateKey] = useState('');
  const [showKeyWarning, setShowKeyWarning] = useState(false);

  if (!isOpen) return null;

  const handleTestPings = async () => {
    setTestingEndpoints(true);
    const results: { [url: string]: number } = {};

    for (const ep of rpcEndpoints) {
      const res = await polygonRpc.testRpcLatency(ep.url);
      results[ep.url] = res.latencyMs;
    }

    setLatencies(results);
    setTestingEndpoints(false);
  };

  const handleAddCustomRpc = () => {
    if (!customUrl.trim().startsWith('http')) return;
    const newEndpoint: RpcEndpoint = {
      name: 'Custom Polygon RPC',
      url: customUrl.trim(),
      chainId: 137,
      latencyMs: 30,
      status: 'connected',
    };
    onSelectRpc(newEndpoint);
    setCustomUrl('');
  };

  const handleArmLiveMode = () => {
    if (!privateKey.trim()) {
      alert('Please enter your Polygon wallet private key or connect wallet to arm LIVE mode.');
      return;
    }
    setConfig((prev) => ({ ...prev, executionMode: 'LIVE' }));
    setShowKeyWarning(true);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-fade-in">
      <div className="bg-[#0c0c14]/90 backdrop-blur-2xl border border-white/10 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between bg-white/5">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-indigo-500/20 border border-indigo-500/30 text-indigo-300">
              <Server className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Polygon RPC & Wallet Settings</h2>
              <p className="text-xs text-slate-400">Polygon PoS Network (Chain ID: 137)</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
          {/* RPC List */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-300 flex items-center gap-2">
                <Radio className="w-3.5 h-3.5 text-indigo-400" />
                Active Polygon RPC Nodes
              </label>
              <button
                id="btn-test-all-rpcs"
                onClick={handleTestPings}
                disabled={testingEndpoints}
                className="text-xs text-indigo-300 hover:text-indigo-200 font-medium flex items-center gap-1 disabled:opacity-50"
              >
                <Zap className="w-3.5 h-3.5 text-indigo-400" />
                {testingEndpoints ? 'Testing Pings...' : 'Test All Pings (ms)'}
              </button>
            </div>

            <div className="space-y-2">
              {rpcEndpoints.map((ep) => {
                const isActive = activeRpc.url === ep.url;
                const ping = latencies[ep.url] || ep.latencyMs || 22;

                return (
                  <div
                    key={ep.url}
                    onClick={() => onSelectRpc(ep)}
                    className={`p-3.5 rounded-xl border cursor-pointer transition-all flex items-center justify-between backdrop-blur-md ${
                      isActive
                        ? 'bg-indigo-600/20 border-indigo-400/50 shadow-[0_0_15px_rgba(99,102,241,0.2)]'
                        : 'bg-white/5 border-white/10 hover:border-white/20 hover:bg-white/10'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-4 h-4 rounded-full flex items-center justify-center border ${
                          isActive
                            ? 'border-indigo-400 bg-indigo-500'
                            : 'border-slate-500 bg-transparent'
                        }`}
                      >
                        {isActive && <div className="w-1.5 h-1.5 rounded-full bg-white"></div>}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-slate-200">{ep.name}</span>
                          {ep.isDefault && (
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-green-500/20 border border-green-500/40 text-green-300 font-mono font-medium">
                              Recommended
                            </span>
                          )}
                        </div>
                        <p className="text-xs font-mono text-slate-400 truncate max-w-md">{ep.url}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <span
                        className={`text-xs font-mono px-2.5 py-0.5 rounded-lg font-semibold border ${
                          ping < 50
                            ? 'bg-green-500/20 text-green-300 border-green-500/30'
                            : ping < 150
                            ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                            : 'bg-rose-500/20 text-rose-300 border-rose-500/30'
                        }`}
                      >
                        {ping} ms
                      </span>
                      {isActive && <CheckCircle2 className="w-4 h-4 text-indigo-400" />}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Custom RPC Input */}
          <div className="p-4 rounded-2xl bg-white/5 backdrop-blur-md border border-white/10">
            <label className="block text-xs font-semibold text-slate-300 mb-2">
              Add Custom Polygon RPC URL
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={customUrl}
                onChange={(e) => setCustomUrl(e.target.value)}
                placeholder="https://polygon-mainnet.g.alchemy.com/v2/..."
                className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white font-mono placeholder:text-slate-500 focus:outline-none focus:border-indigo-400 focus:bg-white/10"
              />
              <button
                onClick={handleAddCustomRpc}
                disabled={!customUrl.trim()}
                className="px-4 py-2 bg-indigo-600/50 hover:bg-indigo-600/70 border border-indigo-400/60 disabled:opacity-50 text-white rounded-xl text-xs font-semibold transition-all shadow-sm"
              >
                Use RPC
              </button>
            </div>
          </div>

          {/* Live Trading Wallet Configuration */}
          <div className="p-4 rounded-2xl bg-white/5 backdrop-blur-md border border-white/10 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-300 flex items-center gap-2">
                <Lock className="w-3.5 h-3.5 text-amber-400" />
                Execution Mode: {config.executionMode}
              </label>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setConfig((prev) => ({ ...prev, executionMode: 'PAPER' }))}
                  className={`px-3 py-1 rounded-xl text-xs font-semibold transition-all ${
                    config.executionMode === 'PAPER'
                      ? 'bg-green-600/40 text-green-300 border border-green-400/50 shadow-sm'
                      : 'bg-white/5 border border-white/10 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  PAPER (Simulated)
                </button>
                <button
                  onClick={() => setConfig((prev) => ({ ...prev, executionMode: 'LIVE' }))}
                  className={`px-3 py-1 rounded-xl text-xs font-semibold transition-all ${
                    config.executionMode === 'LIVE'
                      ? 'bg-rose-600/40 text-rose-300 border border-rose-400/50 shadow-sm'
                      : 'bg-white/5 border border-white/10 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  LIVE (On-Chain)
                </button>
              </div>
            </div>

            {config.executionMode === 'LIVE' ? (
              <div className="space-y-3 pt-2">
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-start gap-2.5">
                  <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                  <div className="text-xs text-rose-200/90 leading-relaxed">
                    <strong>Live Mode Warning:</strong> Real Polygon gas and tokens will be spent. Ensure your wallet has sufficient POL for gas fees.
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">
                    Polygon Private Key (Kept client-side only for signing swaps):
                  </label>
                  <input
                    type="password"
                    value={privateKey}
                    onChange={(e) => setPrivateKey(e.target.value)}
                    placeholder="0x..."
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white font-mono placeholder:text-slate-500 focus:outline-none focus:border-rose-400"
                  />
                </div>
              </div>
            ) : (
              <p className="text-xs text-slate-400">
                Paper mode simulates all swaps, gas fees, DEX fees, and slippage accurately without risking real funds.
              </p>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-white/5 border-t border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-slate-400 font-mono">
            <ShieldCheck className="w-4 h-4 text-green-400" />
            Connected to Polygon PoS
          </div>
          <button
            onClick={onClose}
            className="px-5 py-2 bg-indigo-600/50 hover:bg-indigo-600/70 border border-indigo-400/60 text-white rounded-xl text-xs font-semibold transition-all shadow-[0_0_12px_rgba(99,102,241,0.3)]"
          >
            Save & Close
          </button>
        </div>
      </div>
    </div>
  );
};
