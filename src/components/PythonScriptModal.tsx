import React, { useState } from 'react';
import {
  X,
  Copy,
  Check,
  Download,
  Code2,
  Terminal,
  ShieldAlert,
  FileCode,
  KeyRound,
  FileText,
  Sparkles,
  Zap,
  Play,
} from 'lucide-react';
import {
  generateUpdatedPythonBotScript,
  generatePythonEnvFile,
  generatePythonRequirements,
  generatePythonReadme,
  generateInstallBatFile,
  generateRunBotBatFile,
} from '../services/pythonBotGenerator';

interface PythonScriptModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type TabType = 'install_bat' | 'start_bat' | 'bot' | 'env' | 'requirements' | 'readme';

export const PythonScriptModal: React.FC<PythonScriptModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('install_bat');
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const files: Record<TabType, { filename: string; content: string; label: string; icon: any }> = {
    install_bat: {
      filename: 'install_requirements.bat',
      content: generateInstallBatFile(),
      label: 'install_requirements.bat (1-Click)',
      icon: Zap,
    },
    start_bat: {
      filename: 'start_bot.bat',
      content: generateRunBotBatFile(),
      label: 'start_bot.bat (Run)',
      icon: Play,
    },
    bot: {
      filename: 'polygon_usdt_arbitrage_bot.py',
      content: generateUpdatedPythonBotScript(),
      label: 'polygon_usdt_arbitrage_bot.py',
      icon: Code2,
    },
    env: {
      filename: '.env.example',
      content: generatePythonEnvFile(),
      label: '.env.example',
      icon: KeyRound,
    },
    requirements: {
      filename: 'requirements.txt',
      content: generatePythonRequirements(),
      label: 'requirements.txt',
      icon: FileCode,
    },
    readme: {
      filename: 'README.md',
      content: generatePythonReadme(),
      label: 'README.md',
      icon: FileText,
    },
  };

  const currentFile = files[activeTab];

  const handleCopy = () => {
    navigator.clipboard.writeText(currentFile.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([currentFile.content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = currentFile.filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-fade-in">
      <div className="bg-[#0c0c14]/95 backdrop-blur-2xl border border-white/10 rounded-2xl w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between bg-white/5">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-300">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                Autonomous Polygon USDT Arbitrage Bot
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-mono font-semibold">
                  Auto-Approval & Auto-Signing
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                USDT-Starting Sequential Cycles: USDT ➔ Token B ➔ Token C ➔ USDT (Closed Loop)
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

        {/* Security Alert Banner */}
        <div className="px-6 py-2.5 bg-amber-950/40 border-b border-amber-500/30 flex items-center gap-2.5 text-xs text-amber-200">
          <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0" />
          <span>
            <strong>Security Notice:</strong> Always keep your Private Key stored safely inside the local <code className="font-mono bg-white/10 px-1 py-0.5 rounded text-amber-300">.env</code> file on your computer. Never commit it or share seed phrases publicly.
          </span>
        </div>

        {/* File Tabs & Actions */}
        <div className="px-6 py-2 bg-white/5 border-b border-white/10 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 overflow-x-auto">
            {(Object.keys(files) as TabType[]).map((tabKey) => {
              const tab = files[tabKey];
              const Icon = tab.icon;
              const isActive = activeTab === tabKey;
              return (
                <button
                  key={tabKey}
                  onClick={() => setActiveTab(tabKey)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-mono font-medium transition-all ${
                    isActive
                      ? 'bg-indigo-600/40 text-indigo-200 border border-indigo-400/50 shadow-sm'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-white/5 border border-transparent'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {tab.label}
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handleCopy}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold text-slate-200 transition-all shadow-sm"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? 'Copied!' : 'Copy'}
            </button>
            <button
              onClick={handleDownload}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-emerald-600/50 hover:bg-emerald-600/70 border border-emerald-400/60 text-xs font-semibold text-white transition-all shadow-[0_0_12px_rgba(16,185,129,0.3)]"
            >
              <Download className="w-3.5 h-3.5" />
              Download {currentFile.filename}
            </button>
          </div>
        </div>

        {/* Quick Run Hint */}
        <div className="px-6 py-2 bg-indigo-950/30 border-b border-white/5 flex items-center gap-2 text-xs text-indigo-300 font-mono">
          <Terminal className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
          <span>
            Quick Start: <span className="text-white">pip install -r requirements.txt</span> && <span className="text-white">python polygon_usdt_arbitrage_bot.py</span>
          </span>
        </div>

        {/* Code View */}
        <div className="flex-1 p-6 overflow-y-auto bg-black/50 font-mono text-xs text-slate-300 leading-relaxed scrollbar-thin">
          <pre className="whitespace-pre">{currentFile.content}</pre>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-white/5 border-t border-white/10 flex items-center justify-between text-xs text-slate-400">
          <span className="font-mono">
            Polygon Mainnet (137) | USDT Base: 0xc2132D05...8e8F | QuickSwap & SushiSwap
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/10 text-xs font-semibold text-white transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
