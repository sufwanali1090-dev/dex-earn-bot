import React, { useState } from 'react';
import {
  Download,
  X,
  FolderArchive,
  Terminal,
  Play,
  CheckCircle2,
  FileCode,
  Laptop,
  Check,
  Loader2,
} from 'lucide-react';
import { downloadProjectZip } from '../services/zipExporter';

interface DownloadZipModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const DownloadZipModal: React.FC<DownloadZipModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [downloading, setDownloading] = useState(false);
  const [downloaded, setDownloaded] = useState(false);

  if (!isOpen) return null;

  const handleDownload = async () => {
    try {
      setDownloading(true);
      await downloadProjectZip();
      setDownloaded(true);
      setTimeout(() => setDownloaded(false), 5000);
    } catch (err) {
      console.error('Failed to download project zip:', err);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-fade-in">
      <div className="bg-[#0c0c14]/95 backdrop-blur-2xl border border-white/15 rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col">
        {/* Header */}
        <div className="px-6 py-5 border-b border-white/10 flex items-center justify-between bg-white/5">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 shadow-[0_0_15px_rgba(99,102,241,0.3)]">
              <FolderArchive className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white tracking-wide flex items-center gap-2">
                Download Complete Project ZIP
              </h3>
              <p className="text-xs text-slate-400 font-medium">
                Full standalone package: Web Dashboard + Standalone Python Bot + 1-Click Launchers
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

        {/* Content */}
        <div className="p-6 space-y-6 overflow-y-auto max-h-[75vh]">
          {/* Main Action Download Button */}
          <div className="p-5 rounded-2xl bg-gradient-to-r from-indigo-900/40 via-purple-900/30 to-indigo-900/40 border border-indigo-500/40 shadow-xl flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-indigo-300 font-bold text-sm">
                <CheckCircle2 className="w-4 h-4 text-green-400" />
                <span>Ready to Download (dexearn-polygon-arbitrage-bot.zip)</span>
              </div>
              <p className="text-xs text-slate-300 mt-1">
                Contains complete source code, package.json, TypeScript files, and startup scripts.
              </p>
            </div>
            <button
              id="btn-trigger-download-zip"
              onClick={handleDownload}
              disabled={downloading}
              className="w-full sm:w-auto px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl font-bold text-xs transition-all shadow-[0_0_20px_rgba(99,102,241,0.5)] flex items-center justify-center gap-2 shrink-0 disabled:opacity-50"
            >
              {downloading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-white" />
                  <span>Bundling ZIP...</span>
                </>
              ) : downloaded ? (
                <>
                  <Check className="w-4 h-4 text-green-300" />
                  <span>Downloaded!</span>
                </>
              ) : (
                <>
                  <Download className="w-4 h-4 text-white" />
                  <span>Download ZIP Now</span>
                </>
              )}
            </button>
          </div>

          {/* Quick Steps on PC */}
          <div className="space-y-3">
            <h4 className="text-xs uppercase font-bold tracking-wider text-slate-300 flex items-center gap-2">
              <Laptop className="w-4 h-4 text-indigo-400" />
              How to Run on Your PC
            </h4>

            <div className="space-y-3">
              {/* Step 1 */}
              <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-1.5">
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-indigo-500/30 text-indigo-300 border border-indigo-500/40 text-xs font-bold flex items-center justify-center">
                    1
                  </span>
                  <span className="text-xs font-bold text-white">Extract the ZIP File</span>
                </div>
                <p className="text-xs text-slate-400 pl-7">
                  Right-click the downloaded <code className="text-indigo-300 font-mono">dexearn-polygon-arbitrage-bot.zip</code> and extract it anywhere on your computer (e.g. Desktop or Projects).
                </p>
              </div>

              {/* Step 2 - Option A */}
              <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-indigo-500/30 text-indigo-300 border border-indigo-500/40 text-xs font-bold flex items-center justify-center">
                      2
                    </span>
                    <span className="text-xs font-bold text-white">Run Web Dashboard (React + Vite)</span>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-green-500/20 text-green-300 border border-green-500/30 font-semibold">
                    Recommended
                  </span>
                </div>
                <p className="text-xs text-slate-400 pl-7">
                  Open terminal inside the extracted folder and run:
                </p>
                <div className="ml-7 bg-black/50 p-3 rounded-xl border border-white/10 font-mono text-xs text-indigo-200">
                  <div>npm install</div>
                  <div>npm run dev</div>
                </div>
                <p className="text-[11px] text-slate-400 pl-7">
                  Or on Windows, simply double-click <code className="text-indigo-300 font-mono">start-dashboard.bat</code>!
                </p>
              </div>

              {/* Step 3 - Option B */}
              <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-indigo-500/30 text-indigo-300 border border-indigo-500/40 text-xs font-bold flex items-center justify-center">
                      3
                    </span>
                    <span className="text-xs font-bold text-white">Run Headless Python Bot (Optional)</span>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 font-semibold">
                    Python 3.9+
                  </span>
                </div>
                <p className="text-xs text-slate-400 pl-7">
                  If you want the terminal scanner script:
                </p>
                <div className="ml-7 bg-black/50 p-3 rounded-xl border border-white/10 font-mono text-xs text-amber-200">
                  <div>pip install web3</div>
                  <div>python polygon_arbitrage_bot.py</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-white/5 border-t border-white/10 flex items-center justify-between">
          <span className="text-xs text-slate-400 font-mono">
            Polygon Mainnet (Chain 137) | RPC: https://rpc.ankr.com/polygon
          </span>
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold text-white transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
