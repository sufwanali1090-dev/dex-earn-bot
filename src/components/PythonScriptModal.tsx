import React, { useState } from 'react';
import { X, Copy, Check, Download, Code2, Terminal, ShieldAlert } from 'lucide-react';
import { generateUpdatedPythonBotScript } from '../services/pythonBotGenerator';

interface PythonScriptModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PythonScriptModal: React.FC<PythonScriptModalProps> = ({ isOpen, onClose }) => {
  const [copied, setCopied] = useState(false);
  const scriptContent = generateUpdatedPythonBotScript();

  if (!isOpen) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(scriptContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([scriptContent], { type: 'text/x-python' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'polygon_dex_arbitrage_bot.py';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-fade-in">
      <div className="bg-[#0c0c14]/90 backdrop-blur-2xl border border-white/10 rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between bg-white/5">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-amber-500/20 border border-amber-500/30 text-amber-300">
              <Code2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">
                Standalone Python Polygon Arbitrage Bot
              </h2>
              <p className="text-xs text-slate-400">
                Fixed with Ankr Polygon RPC (https://rpc.ankr.com/polygon) & Multi-Token DEX scanner
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Info Banner */}
        <div className="px-6 py-3.5 bg-indigo-900/20 border-b border-white/10 flex items-center justify-between gap-4 text-xs text-indigo-200 backdrop-blur-md">
          <div className="flex items-center gap-2">
            <Terminal className="w-4 h-4 text-indigo-400 shrink-0" />
            <span>
              Run locally via: <code className="font-mono bg-white/10 px-2 py-0.5 rounded-lg border border-white/10 text-indigo-300">pip install web3 && python polygon_dex_arbitrage_bot.py</code>
            </span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handleCopy}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold text-slate-200 transition-all shadow-sm"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? 'Copied!' : 'Copy Code'}
            </button>
            <button
              onClick={handleDownload}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600/50 hover:bg-indigo-600/70 border border-indigo-400/60 text-xs font-semibold text-white transition-all shadow-[0_0_10px_rgba(99,102,241,0.3)]"
            >
              <Download className="w-3.5 h-3.5" />
              Download .py
            </button>
          </div>
        </div>

        {/* Code Content */}
        <div className="flex-1 p-6 overflow-y-auto bg-black/40 font-mono text-xs text-slate-300 leading-relaxed scrollbar-thin">
          <pre className="whitespace-pre">{scriptContent}</pre>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-white/5 border-t border-white/10 flex items-center justify-between">
          <span className="text-xs text-slate-400 font-mono">
            Polygon Mainnet | Chain ID: 137 | RPC: https://rpc.ankr.com/polygon
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold text-white transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
