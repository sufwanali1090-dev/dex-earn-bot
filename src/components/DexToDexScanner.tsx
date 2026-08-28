import React, { useState } from 'react';
import {
  ArrowRightLeft,
  Zap,
  Search,
  CheckCircle2,
  AlertCircle,
  Filter,
  ArrowUpRight,
  TrendingUp,
  Percent,
  Layers,
} from 'lucide-react';
import { DexToDexOpportunity, BotConfig } from '../types';

interface DexToDexScannerProps {
  opportunities: DexToDexOpportunity[];
  config: BotConfig;
  onExecuteTrade: (opp: DexToDexOpportunity) => void;
  executingId: string | null;
}

export const DexToDexScanner: React.FC<DexToDexScannerProps> = ({
  opportunities,
  config,
  onExecuteTrade,
  executingId,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [onlyProfitable, setOnlyProfitable] = useState(false);

  const filtered = opportunities.filter((opp) => {
    const matchesSearch =
      opp.tokenPair.toLowerCase().includes(searchTerm.toLowerCase()) ||
      opp.baseToken.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      opp.buyDex.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      opp.sellDex.name.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesCategory =
      selectedCategory === 'all' || opp.baseToken.category === selectedCategory;

    const matchesProfitable = !onlyProfitable || opp.isProfitable;

    return matchesSearch && matchesCategory && matchesProfitable;
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
              placeholder="Search token pair (e.g. WETH/USDC, QUICK, AAVE)..."
              className="w-full bg-white/5 border border-white/10 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder:text-slate-400 focus:outline-none focus:border-indigo-400 focus:bg-white/10 font-mono transition-all"
            />
          </div>
        </div>

        {/* Category Pills & Profitable Filter */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex bg-white/5 backdrop-blur-md p-1 rounded-xl border border-white/10 text-xs">
            {['all', 'core', 'defi', 'gaming'].map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1 rounded-lg capitalize font-medium transition-all ${
                  selectedCategory === cat
                    ? 'bg-indigo-600/40 text-white border border-indigo-400/50 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 border border-transparent'
                }`}
              >
                {cat}
              </button>
            ))}
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
            <span>Profitable Gaps ({profitableCount})</span>
          </button>
        </div>
      </div>

      {/* Real-Time Opportunity Grid / List */}
      <div className="bg-white/5 backdrop-blur-2xl border border-white/10 rounded-2xl overflow-hidden shadow-2xl flex flex-col">
        <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between bg-white/5">
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 bg-indigo-400 rounded-full shadow-[0_0_8px_#818cf8] animate-pulse" />
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-200">
              Live Opportunity Scanner (DEX-to-DEX)
            </h3>
            <span className="text-xs text-slate-400 font-mono">
              ({filtered.length} active pair routes)
            </span>
          </div>
          <span className="text-[10px] text-indigo-300 bg-indigo-500/20 px-3 py-1 rounded-full border border-indigo-500/30 font-semibold uppercase tracking-wider animate-pulse">
            Real-Time Stream Active
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-white/5 text-[10px] uppercase text-slate-400 tracking-wider font-bold border-b border-white/10">
              <tr>
                <th className="py-3 px-5">Pair / Route</th>
                <th className="py-3 px-4">Buy DEX (Low)</th>
                <th className="py-3 px-4">Sell DEX (High)</th>
                <th className="py-3 px-3 text-center">Gross Gap %</th>
                <th className="py-3 px-3 text-right">Estimated Fees</th>
                <th className="py-3 px-4 text-right">Net Profit</th>
                <th className="py-3 px-5 text-center">Execution</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 font-mono">
              {filtered.slice(0, 20).map((opp) => {
                const isExecuting = executingId === opp.id;

                return (
                  <tr
                    key={opp.id}
                    className={`transition-colors hover:bg-white/5 ${
                      opp.isProfitable ? 'bg-indigo-500/10' : ''
                    }`}
                  >
                    {/* Token Pair */}
                    <td className="py-3.5 px-5">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center font-bold text-xs text-indigo-300 shadow-sm">
                          {opp.baseToken.symbol.slice(0, 2)}
                        </div>
                        <div>
                          <div className="font-bold text-white text-sm flex items-center gap-1.5">
                            <span className="text-indigo-400">{opp.tokenPair.split('/')[0]}</span>
                            <span className="text-slate-400">➔</span>
                            <span className="text-purple-400">{opp.tokenPair.split('/')[1]}</span>
                          </div>
                          <span className="block text-[10px] text-slate-400 font-sans">
                            {opp.baseToken.name}
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* Buy DEX */}
                    <td className="py-3.5 px-4">
                      <div className="space-y-0.5">
                        <span
                          className="inline-block px-2 py-0.5 rounded-md text-[10px] font-semibold text-white backdrop-blur-sm"
                          style={{ backgroundColor: `${opp.buyDex.color}35`, border: `1px solid ${opp.buyDex.color}70` }}
                        >
                          {opp.buyDex.name.split(' ')[0]}
                        </span>
                        <div className="text-slate-200 text-xs font-bold font-mono">
                          ${opp.buyPrice >= 1 ? opp.buyPrice.toFixed(4) : opp.buyPrice.toFixed(6)}
                        </div>
                      </div>
                    </td>

                    {/* Sell DEX */}
                    <td className="py-3.5 px-4">
                      <div className="space-y-0.5">
                        <span
                          className="inline-block px-2 py-0.5 rounded-md text-[10px] font-semibold text-white backdrop-blur-sm"
                          style={{ backgroundColor: `${opp.sellDex.color}35`, border: `1px solid ${opp.sellDex.color}70` }}
                        >
                          {opp.sellDex.name.split(' ')[0]}
                        </span>
                        <div className="text-slate-200 text-xs font-bold font-mono">
                          ${opp.sellPrice >= 1 ? opp.sellPrice.toFixed(4) : opp.sellPrice.toFixed(6)}
                        </div>
                      </div>
                    </td>

                    {/* Gross Spread */}
                    <td className="py-3.5 px-3 text-center">
                      <div className="inline-flex items-center gap-1 font-bold text-indigo-300 bg-white/5 px-2.5 py-1 rounded-lg border border-white/10">
                        <TrendingUp className="w-3 h-3 text-indigo-400" />
                        <span>+{opp.grossSpreadPercent.toFixed(2)}%</span>
                      </div>
                    </td>

                    {/* Total Fees */}
                    <td className="py-3.5 px-3 text-right">
                      <div className="text-slate-300 text-xs font-medium">
                        -${opp.totalFeesUsd.toFixed(3)}
                      </div>
                      <div className="text-[10px] text-slate-400">
                        <span className="text-amber-300 font-mono">gas: ${opp.gasFeeUsd.toFixed(3)}</span> | dex: ${opp.dexFeesUsd.toFixed(3)}
                      </div>
                    </td>

                    {/* Net Profit & ROI */}
                    <td className="py-3.5 px-4 text-right">
                      <div
                        className={`text-sm font-bold ${
                          opp.netProfitUsd > 0 ? 'text-green-400' : 'text-rose-400'
                        }`}
                      >
                        {opp.netProfitUsd > 0 ? `+$${opp.netProfitUsd.toFixed(3)}` : `-$${Math.abs(opp.netProfitUsd).toFixed(3)}`}
                      </div>
                      <div
                        className={`text-[10px] font-semibold ${
                          opp.netProfitPercent > 0 ? 'text-green-400' : 'text-rose-400'
                        }`}
                      >
                        {opp.grossProfitUsd <= opp.gasFeeUsd ? (
                          <span className="text-rose-400 font-mono text-[9px] bg-rose-500/10 px-1.5 py-0.5 rounded border border-rose-500/20">
                            Gas &gt; Earnings
                          </span>
                        ) : opp.netProfitPercent > 0 ? (
                          `+${opp.netProfitPercent.toFixed(2)}% ROI`
                        ) : (
                          `${opp.netProfitPercent.toFixed(2)}%`
                        )}
                      </div>
                    </td>

                    {/* Action */}
                    <td className="py-3.5 px-5 text-center">
                      <button
                        id={`btn-trade-${opp.tokenPair.replace('/', '-')}`}
                        onClick={() => onExecuteTrade(opp)}
                        disabled={isExecuting || (!opp.isProfitable && !config.autoTradeEnabled) || opp.netProfitUsd <= 0}
                        title={opp.netProfitUsd <= 0 ? 'Disabled: Gas and DEX fees exceed gross profit for this trade size' : 'Execute arbitrage opportunity'}
                        className={`px-3.5 py-1.5 rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-1.5 mx-auto ${
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
                          ? 'Filling...'
                          : opp.netProfitUsd <= 0
                          ? 'Gas > Profit'
                          : config.executionMode === 'LIVE'
                          ? `Live Trade ($${config.tradeAmountUsd})`
                          : 'Execute Gap'}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Footer Ticker Bar */}
        <div className="h-11 bg-white/5 backdrop-blur-md flex items-center px-6 justify-between border-t border-white/10">
          <div className="flex items-center space-x-2">
            <span className="text-[10px] text-indigo-300 font-bold uppercase tracking-wider">Scanning Engine:</span>
            <span className="text-[10px] font-mono text-slate-300">Polygon Block #58291044</span>
          </div>
          <div className="flex space-x-4">
            <span className="text-[10px] text-slate-400 font-mono">v2_exec_engine_12ms_stable</span>
          </div>
        </div>
      </div>
    </div>
  );
};
