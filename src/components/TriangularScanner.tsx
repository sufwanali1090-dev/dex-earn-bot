import React from 'react';
import {
  RefreshCw,
  Zap,
  ArrowRight,
  TrendingUp,
  CheckCircle2,
  AlertCircle,
  Repeat,
} from 'lucide-react';
import { TriangularOpportunity, BotConfig } from '../types';

interface TriangularScannerProps {
  opportunities: TriangularOpportunity[];
  config: BotConfig;
  onExecuteTriangular: (opp: TriangularOpportunity) => void;
  executingId: string | null;
}

export const TriangularScanner: React.FC<TriangularScannerProps> = ({
  opportunities,
  config,
  onExecuteTriangular,
  executingId,
}) => {
  return (
    <div className="space-y-4">
      {/* Overview Banner */}
      <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xl">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-indigo-500/20 border border-indigo-500/30 text-indigo-300">
              <RefreshCw className="w-4 h-4" />
            </div>
            <h3 className="text-sm font-bold uppercase tracking-wider text-white">
              Triangular Cycle Multi-Hop Engine
            </h3>
            <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-white/5 text-indigo-300 border border-white/10 font-mono font-semibold">
              3-Hop Loops
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1.5 font-medium">
            Scans cyclic price inefficiencies on Polygon without holding token directional risk. Returns to starting stable asset.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="px-4 py-2 rounded-2xl bg-white/5 backdrop-blur-md border border-white/10 text-xs">
            <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">Active Cycles</span>
            <span className="font-bold text-white font-mono text-sm">{opportunities.length} Paths</span>
          </div>
          <div className="px-4 py-2 rounded-2xl bg-indigo-900/30 backdrop-blur-md border border-indigo-500/20 text-xs">
            <span className="text-indigo-300 block text-[10px] uppercase font-bold tracking-wider">Profitable Signals</span>
            <span className="font-bold text-green-400 font-mono text-sm">
              {opportunities.filter((o) => o.isProfitable).length}
            </span>
          </div>
        </div>
      </div>

      {/* Grid of Triangle Opportunities */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {opportunities.map((opp) => {
          const isExecuting = executingId === opp.id;
          const [t0, t1, t2] = opp.route;

          return (
            <div
              key={opp.id}
              className={`p-5 rounded-2xl border transition-all backdrop-blur-xl shadow-xl ${
                opp.isProfitable
                  ? 'bg-white/5 border-indigo-400/50 shadow-[0_0_20px_rgba(99,102,241,0.15)] ring-1 ring-indigo-400/20'
                  : 'bg-white/5 border-white/10 hover:border-white/20'
              }`}
            >
              {/* Card Header: DEX and Net Status */}
              <div className="flex items-center justify-between pb-3.5 border-b border-white/10">
                <div className="flex items-center gap-2">
                  <span
                    className="px-2.5 py-0.5 rounded-lg text-[11px] font-bold text-white backdrop-blur-sm"
                    style={{ backgroundColor: `${opp.dex.color}35`, border: `1px solid ${opp.dex.color}70` }}
                  >
                    {opp.dex.name}
                  </span>
                  <span className="text-xs font-mono text-slate-400">Polygon Chain</span>
                </div>

                <div className="flex items-center gap-2">
                  {opp.isProfitable ? (
                    <span className="flex items-center gap-1 text-[11px] font-bold text-green-400 bg-green-500/20 px-2.5 py-0.5 rounded-full border border-green-500/30 shadow-[0_0_8px_rgba(34,197,94,0.3)]">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Alpha Signal
                    </span>
                  ) : (
                    <span className="text-xs text-slate-400 font-mono">Scanning edge...</span>
                  )}
                </div>
              </div>

              {/* 3-Hop Visual Route Diagram */}
              <div className="py-4">
                <div className="flex items-center justify-between bg-white/5 backdrop-blur-md p-3.5 rounded-2xl border border-white/10 font-mono">
                  {/* Token 0 */}
                  <div className="flex flex-col items-center">
                    <span className="w-9 h-9 rounded-xl bg-indigo-500/20 border border-indigo-400/40 text-indigo-200 font-bold flex items-center justify-center text-xs shadow-sm">
                      {t0.symbol.slice(0, 3)}
                    </span>
                    <span className="text-xs font-bold text-white mt-1.5">{t0.symbol}</span>
                  </div>

                  <ArrowRight className="w-4 h-4 text-indigo-400 shrink-0" />

                  {/* Token 1 */}
                  <div className="flex flex-col items-center">
                    <span className="w-9 h-9 rounded-xl bg-purple-500/20 border border-purple-400/40 text-purple-200 font-bold flex items-center justify-center text-xs shadow-sm">
                      {t1.symbol.slice(0, 3)}
                    </span>
                    <span className="text-xs font-bold text-white mt-1.5">{t1.symbol}</span>
                  </div>

                  <ArrowRight className="w-4 h-4 text-indigo-400 shrink-0" />

                  {/* Token 2 */}
                  <div className="flex flex-col items-center">
                    <span className="w-9 h-9 rounded-xl bg-cyan-500/20 border border-cyan-400/40 text-cyan-200 font-bold flex items-center justify-center text-xs shadow-sm">
                      {t2.symbol.slice(0, 3)}
                    </span>
                    <span className="text-xs font-bold text-white mt-1.5">{t2.symbol}</span>
                  </div>

                  <ArrowRight className="w-4 h-4 text-green-400 shrink-0" />

                  {/* Final Return Token 0 */}
                  <div className="flex flex-col items-center">
                    <span className="w-9 h-9 rounded-xl bg-green-500/20 border border-green-400/40 text-green-300 font-bold flex items-center justify-center text-xs shadow-sm">
                      {t0.symbol.slice(0, 3)}
                    </span>
                    <span className="text-xs font-bold text-green-400 mt-1.5">{t0.symbol}</span>
                  </div>
                </div>
              </div>

              {/* Multiplier, Edge, and Fees breakdown */}
              <div className="grid grid-cols-3 gap-2 bg-white/5 backdrop-blur-md p-3 rounded-xl border border-white/10 text-xs font-mono mb-4">
                <div>
                  <span className="text-[10px] text-slate-400 block font-bold">Cycle Multiplier</span>
                  <span className="font-bold text-slate-200">{opp.cycleMultiplier.toFixed(5)}x</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block font-bold">Gross Edge %</span>
                  <span
                    className={`font-bold ${
                      opp.grossEdgePercent > 0 ? 'text-indigo-400' : 'text-slate-400'
                    }`}
                  >
                    {opp.grossEdgePercent > 0 ? `+${opp.grossEdgePercent.toFixed(2)}%` : `${opp.grossEdgePercent.toFixed(2)}%`}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block font-bold">Total Fees & POL Gas</span>
                  <span className="font-bold text-slate-300">
                    -${opp.totalFeesUsd.toFixed(3)}
                    <span className="text-[10px] text-slate-400 block font-normal">
                      Gas: {opp.gasFeePol ? `${opp.gasFeePol.toFixed(4)} POL` : `${(opp.gasFeeUsd / 0.42).toFixed(4)} POL`}
                    </span>
                  </span>
                </div>
              </div>

              {/* Profit & Execution Footer */}
              <div className="flex items-center justify-between pt-2">
                <div>
                  <div className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">
                    Net PnL (Post-Fee)
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span
                      className={`text-base font-bold font-mono ${
                        opp.netProfitUsd >= 0 ? 'text-green-400' : 'text-slate-400'
                      }`}
                    >
                      {opp.netProfitUsd >= 0 ? `+$${opp.netProfitUsd.toFixed(3)}` : `-$${Math.abs(opp.netProfitUsd).toFixed(3)}`}
                    </span>
                    <span className="text-xs text-slate-400 font-mono">
                      (${config.tradeAmountUsd} capital)
                    </span>
                  </div>
                </div>

                <button
                  id={`btn-exec-tri-${t0.symbol}-${t1.symbol}-${t2.symbol}`}
                  onClick={() => onExecuteTriangular(opp)}
                  disabled={isExecuting || (!opp.isProfitable && !config.autoTradeEnabled) || opp.netProfitUsd <= 0}
                  className={`px-4 py-2 rounded-xl font-bold text-xs transition-all flex items-center gap-1.5 ${
                    isExecuting
                      ? 'bg-indigo-600 text-white animate-pulse'
                      : opp.isProfitable && opp.netProfitUsd > 0
                      ? config.executionMode === 'LIVE'
                        ? 'bg-emerald-600 hover:bg-emerald-500 text-white border border-emerald-300 shadow-[0_0_15px_rgba(16,185,129,0.5)]'
                        : 'bg-indigo-600/50 hover:bg-indigo-600/70 text-white border border-indigo-400/60 shadow-[0_0_12px_rgba(99,102,241,0.4)]'
                      : 'bg-white/5 text-slate-500 cursor-not-allowed border border-white/5 opacity-60'
                  }`}
                >
                  <Zap className={`w-3.5 h-3.5 ${config.executionMode === 'LIVE' ? 'text-emerald-200' : 'text-indigo-300'}`} />
                  {isExecuting
                    ? 'Executing 3-Hop...'
                    : opp.netProfitUsd <= 0
                    ? 'Gas > Profit'
                    : config.executionMode === 'LIVE'
                    ? `Live 3-Hop ($${config.tradeAmountUsd})`
                    : 'Execute Loop'}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
