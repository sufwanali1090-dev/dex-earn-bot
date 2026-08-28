import React from 'react';
import { Terminal, Zap, Shield, ArrowRight } from 'lucide-react';

export interface LogEntry {
  id: string;
  timestamp: string;
  type: 'SCAN' | 'SIGNAL' | 'TRADE' | 'FEE' | 'ERROR' | 'BOT';
  message: string;
  highlight?: boolean;
}

interface LiveOpportunitiesFeedProps {
  logs: LogEntry[];
  onClearLogs: () => void;
}

export const LiveOpportunitiesFeed: React.FC<LiveOpportunitiesFeedProps> = ({
  logs,
  onClearLogs,
}) => {
  return (
    <div className="bg-white/5 backdrop-blur-2xl border border-white/10 rounded-2xl overflow-hidden shadow-2xl flex flex-col">
      <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between bg-white/5">
        <div className="flex items-center gap-2.5">
          <div className="w-2 h-2 bg-green-500 rounded-full shadow-[0_0_8px_#22c55e] animate-pulse" />
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-200">Live Execution & Opportunity Feed</h3>
          <span className="text-[10px] font-mono px-2.5 py-0.5 rounded-full bg-white/5 text-indigo-300 border border-white/10">
            Polygon Core Engine
          </span>
        </div>
        <button
          onClick={onClearLogs}
          className="text-xs text-slate-400 hover:text-white transition-colors"
        >
          Clear Log
        </button>
      </div>

      <div className="p-4 bg-white/5 font-mono text-xs max-h-60 overflow-y-auto space-y-2 scrollbar-thin">
        {logs.length === 0 ? (
          <div className="text-slate-500 text-center py-8">
            Scanner initializing... Waiting for first millisecond block tick.
          </div>
        ) : (
          logs.map((log) => {
            let badgeColor = 'text-slate-400 bg-white/5 border border-white/10';
            if (log.type === 'SIGNAL') badgeColor = 'text-indigo-300 bg-indigo-500/20 border border-indigo-500/30';
            if (log.type === 'TRADE') badgeColor = 'text-green-300 bg-green-500/20 border border-green-500/30 font-bold';
            if (log.type === 'BOT') badgeColor = 'text-cyan-300 bg-cyan-500/20 border border-cyan-500/30';
            if (log.type === 'FEE') badgeColor = 'text-amber-300 bg-amber-500/20 border border-amber-500/30';
            if (log.type === 'ERROR') badgeColor = 'text-rose-300 bg-rose-500/20 border border-rose-500/30';

            return (
              <div
                key={log.id}
                className={`flex items-start gap-2.5 leading-relaxed p-1.5 rounded-lg transition-all ${
                  log.highlight ? 'text-green-300 font-bold bg-green-500/10 border border-green-500/20 shadow-sm' : 'text-slate-300'
                }`}
              >
                <span className="text-slate-500 shrink-0 text-[11px] font-sans">{log.timestamp}</span>
                <span className={`text-[10px] px-2 py-0.5 rounded-md shrink-0 uppercase font-mono ${badgeColor}`}>
                  {log.type}
                </span>
                <span className="break-all text-slate-200">{log.message}</span>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
