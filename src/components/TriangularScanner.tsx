import React, { useState } from 'react';
import {
  RefreshCw,
  Zap,
  ArrowRight,
  Search,
  CheckCircle2,
  AlertCircle,
  Filter,
  TrendingUp,
  Layers,
  Sparkles,
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
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDex, setSelectedDex] = useState<string>('all');
  const [onlyProfitable, setOnlyProfitable] = useState(false);

  const filtered = opportunities.filter((opp) => {
    const [t0, t1, t2] = opp.route;
    const matchesSearch =
      opp.pathNames.some((p) => p.toLowerCase().includes(searchTerm.toLowerCase())) ||
      t0.symbol.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t1.symbol.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t2.symbol.toLowerCase().includes(searchTerm.toLowerCase()) ||
      opp.dex.name.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesDex = selectedDex === 'all' || opp.dex.id === selectedDex;
    const matchesProfitable = !onlyProfitable || opp.isProfitable;

    return matchesSearch && matchesDex && matchesProfitable;
  });

  const profitableCount = opportunities.filter((o) => o.isProfitable).length;

  return (
    <div className="space-y-4">
      {/* Top Filter Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white/5 backdrop-blur-xl p-3.5 rounded-2xl border border-white/10 shadow-lg">
        <div className="flex items-center gap-2 flex-1 max-w-md">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-indigo-300 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search coin or route (e.g. QUICK, WETH, SushiSwap, BAL)..."
              className="w-full bg-white/5 border border-white/10 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder:text-slate-400 focus:outline-none focus:border-indigo-400 focus:bg-white/10 font-mono transition-all"
            />
          </div>
        </div>

        {/* Filter controls */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex bg-white/5 backdrop-blur-md p-1 rounded-xl border border-white/10 text-xs">
            <select
              value={selectedDex}
              onChange={(e) => setSelectedDex(e.target.value)}
              className="bg-transparent text-slate-300 text-xs font-semibold px-2 py-1 focus:outline-none rounded-lg cursor-pointer"
            >
              <option value="all" className="bg-slate-900 text-white">All 13 DEXes</option>
              <option value="quickswap" className="bg-slate-900 text-white">QuickSwap</option>
              <option value="sushiswap" className="bg-slate-900 text-white">SushiSwap</option>
              <option value="uniswap" className="bg-slate-900 text-white">Uniswap V3</option>
              <option value="pancakeswap" className="bg-slate-900 text-white">PancakeSwap</option>
              <option value="kyberswap" className="bg-slate-900 text-white">KyberSwap</option>
              <option value="balancer" className="bg-slate-900 text-white">Balancer</option>
              <option value="dfyn" className="bg-slate-900 text-white">Dfyn</option>
              <option value="apeswap" className="bg-slate-900 text-white">ApeSwap</option>
              <option value="meshswap" className="bg-slate-900 text-white">Meshswap</option>
              <option value="polycat" className="bg-slate-900 text-white">Polycat</option>
              <option value="waultswap" className="bg-slate-900 text-white">WaultSwap</option>
              <option value="dodo" className="bg-slate-900 text-white">DODO</option>
              <option value="curve" className="bg-slate-900 text-white">Curve</option>
            </select>
          </div>

          <button
            onClick={() => setOnlyProfitable((prev) => !prev)}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
              onlyProfitable
                ? 'bg-green-500/20 border-green-500/40 text-green-300 shadow-[0_0_10px_rgba(34,197,94,0.2)]'
                : 'bg-white/5 border-white/10 text-slate-400 hover:text-slate-200 hover:bg-white/10'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5 text-green-400" />
            <span>Profitable Cycles ({profitableCount})</span>
          </button>
        </div>
      </div>

      {/* Header Banner */}
      <div className="bg-white/5 backdrop-blur-2xl border border-white/10 rounded-2xl overflow-hidden shadow-2xl flex flex-col">
        <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between bg-white/5">
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 bg-indigo-400 rounded-full shadow-[0_0_8px_#818cf8] animate-pulse" />
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-200">
              Live Opportunity Scanner (Triangular Arbitrage)
            </h3>
            <span className="text-xs text-slate-400 font-mono">
              ({filtered.length} unique tokens • 13 Polygon DEXes)
            </span>
          </div>
          <div className="flex items-center gap-2">
            {config.autoTradeEnabled ? (
              <span className="text-[10px] text-emerald-300 bg-emerald-500/20 px-3 py-1 rounded-full border border-emerald-500/40 font-bold uppercase tracking-wider flex items-center gap-1.5 shadow-[0_0_12px_rgba(16,185,129,0.3)]">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                Auto-Trade Active (≥ ${(config.minProfitMarginUsd || 0.01).toFixed(2)})
              </span>
            ) : (
              <span className="text-[10px] text-amber-300 bg-amber-500/15 px-3 py-1 rounded-full border border-amber-500/30 font-semibold uppercase tracking-wider">
                Auto-Trade Paused (Manual Mode)
              </span>
            )}
            <span className="text-[10px] text-emerald-300 bg-emerald-500/15 px-2.5 py-1 rounded-full border border-emerald-500/30 font-semibold uppercase tracking-wider hidden sm:flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
              Real-Time WebSocket & AMM Ticks
            </span>
          </div>
        </div>

        {/* Grid of Triangle Opportunities */}
        <div className="p-4 sm:p-5 grid grid-cols-1 lg:grid-cols-2 gap-4">
          {filtered.length === 0 ? (
            <div className="col-span-full py-16 text-center text-slate-400">
              <RefreshCw className="w-8 h-8 text-indigo-400 animate-spin mx-auto mb-3 opacity-60" />
              <p className="text-sm font-semibold">Scanning 114 Polygon tokens across all 13 DEXes...</p>
              <p className="text-xs text-slate-500 mt-1">No cycles match your active search filter.</p>
            </div>
          ) : (
            filtered.map((opp) => {
              const isExecuting = executingId === opp.id;
              const [t0, t1, t2] = opp.route;

              return (
                <div
                  key={opp.id}
                  className={`p-5 rounded-2xl border transition-all backdrop-blur-xl shadow-xl flex flex-col justify-between ${
                    opp.isProfitable
                      ? 'bg-white/5 border-indigo-400/50 shadow-[0_0_20px_rgba(99,102,241,0.15)] ring-1 ring-indigo-400/20'
                      : 'bg-white/5 border-white/10 hover:border-white/20'
                  }`}
                >
                  <div>
                    {/* Card Header: DEX and Net Status */}
                    <div className="flex items-center justify-between pb-3 border-b border-white/10">
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
                          <span className="text-xs text-slate-400 font-mono">{opp.decisionReason || 'Scanning edge...'}</span>
                        )}
                      </div>
                    </div>

                    {/* 3-Hop Visual Route Diagram */}
                    <div className="py-4">
                      <div className="flex items-center justify-between bg-white/5 backdrop-blur-md p-3.5 rounded-2xl border border-white/10 font-mono">
                        {/* Token 0 */}
                        <div className="flex flex-col items-center">
                          <span className="w-9 h-9 rounded-xl bg-indigo-500/20 border border-indigo-400/40 text-indigo-200 font-bold flex items-center justify-center text-xs shadow-sm">
                            {t0.symbol.slice(0, 4)}
                          </span>
                          <span className="text-xs font-bold text-white mt-1.5">{t0.symbol}</span>
                        </div>

                        <ArrowRight className="w-4 h-4 text-indigo-400 shrink-0" />

                        {/* Token 1 */}
                        <div className="flex flex-col items-center">
                          <span className="w-9 h-9 rounded-xl bg-purple-500/20 border border-purple-400/40 text-purple-200 font-bold flex items-center justify-center text-xs shadow-sm">
                            {t1.symbol.slice(0, 4)}
                          </span>
                          <span className="text-xs font-bold text-white mt-1.5">{t1.symbol}</span>
                        </div>

                        <ArrowRight className="w-4 h-4 text-indigo-400 shrink-0" />

                        {/* Token 2 */}
                        <div className="flex flex-col items-center">
                          <span className="w-9 h-9 rounded-xl bg-cyan-500/20 border border-cyan-400/40 text-cyan-200 font-bold flex items-center justify-center text-xs shadow-sm">
                            {t2.symbol.slice(0, 4)}
                          </span>
                          <span className="text-xs font-bold text-white mt-1.5">{t2.symbol}</span>
                        </div>

                        <ArrowRight className="w-4 h-4 text-green-400 shrink-0" />

                        {/* Final Return Token 0 */}
                        <div className="flex flex-col items-center">
                          <span className="w-9 h-9 rounded-xl bg-green-500/20 border border-green-400/40 text-green-300 font-bold flex items-center justify-center text-xs shadow-sm">
                            {t0.symbol.slice(0, 4)}
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
                        <span className="text-[10px] text-slate-400 block font-bold">Total Fees & Gas</span>
                        <span className="font-bold text-slate-300">
                          -${opp.totalFeesUsd.toFixed(3)}
                          <span className="text-[10px] text-slate-400 block font-normal">
                            Gas: {opp.gasFeePol ? `${opp.gasFeePol.toFixed(4)} POL` : `${(opp.gasFeeUsd / 0.42).toFixed(4)} POL`}
                          </span>
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Profit & Execution Footer */}
                  <div className="flex items-center justify-between pt-2 border-t border-white/5">
                    <div>
                      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-slate-400 font-bold">
                        <span>Net PnL (Post-Fee)</span>
                        {opp.isSellPriceVerified && (
                          <span className="text-[9px] font-sans font-bold px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-0.5">
                            <CheckCircle2 className="w-2.5 h-2.5 text-emerald-400" />
                            Cycle Verified
                          </span>
                        )}
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
                      id={`btn-exec-tri-${t0.symbol}-${t1.symbol}-${t2.symbol}-${opp.dex.id}`}
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
            })
          )}
        </div>
      </div>
    </div>
  );
};
