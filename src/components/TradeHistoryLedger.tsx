import React from 'react';
import {
  History,
  Download,
  Trash2,
  ExternalLink,
  TrendingUp,
  CheckCircle2,
  Layers,
  Zap,
} from 'lucide-react';
import { TradeRecord, BotStats } from '../types';

interface TradeHistoryLedgerProps {
  trades: TradeRecord[];
  stats: BotStats;
  onClearHistory: () => void;
}

export const TradeHistoryLedger: React.FC<TradeHistoryLedgerProps> = ({
  trades,
  stats,
  onClearHistory,
}) => {
  const exportCsv = () => {
    if (trades.length === 0) return;
    const headers = [
      'Timestamp',
      'Strategy',
      'Route',
      'Amount_USD',
      'Gross_Profit_USD',
      'Gas_USD',
      'DEX_Fees_USD',
      'Net_Profit_USD',
      'ROI_Percent',
      'Mode',
      'TxHash',
    ];
    const rows = trades.map((t) => [
      new Date(t.timestamp).toISOString(),
      t.type,
      `"${t.routeSummary}"`,
      t.tradeAmountUsd,
      t.grossProfitUsd,
      t.gasFeeUsd,
      t.dexFeesUsd,
      t.netProfitUsd,
      t.netRoiPercent,
      t.mode,
      t.txHash || 'SIMULATED',
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `polygon_arbitrage_trades_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="bg-white/5 backdrop-blur-2xl border border-white/10 rounded-2xl overflow-hidden shadow-2xl flex flex-col">
      <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between bg-white/5">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-lg bg-indigo-500/20 text-indigo-300">
            <History className="w-4 h-4" />
          </div>
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-200">
            Execution Ledger & PnL History
          </h3>
          <span className="text-xs text-slate-400 font-mono">({trades.length} trades)</span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={exportCsv}
            disabled={trades.length === 0}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 disabled:opacity-40 text-xs font-semibold text-slate-200 transition-all shadow-sm"
          >
            <Download className="w-3.5 h-3.5 text-indigo-300" />
            Export CSV
          </button>
          <button
            onClick={onClearHistory}
            disabled={trades.length === 0}
            className="p-2 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-white/10 disabled:opacity-40 transition-colors"
            title="Clear trade history"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Summary KPI Ribbon */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-px bg-white/10 border-b border-white/10 text-xs">
        <div className="p-3.5 bg-white/5 backdrop-blur-md">
          <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">Total Volume</span>
          <span className="text-sm font-bold text-white font-mono">
            ${stats.totalVolumeUsd.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
        </div>
        <div className="p-3.5 bg-indigo-900/30 backdrop-blur-md">
          <span className="text-indigo-300 block text-[10px] uppercase font-bold tracking-wider">Realized Net PnL</span>
          <span
            className={`text-sm font-bold font-mono ${
              stats.netProfitUsd >= 0 ? 'text-green-400' : 'text-rose-400'
            }`}
          >
            {stats.netProfitUsd >= 0 ? `+$${stats.netProfitUsd.toFixed(2)}` : `-$${Math.abs(stats.netProfitUsd).toFixed(2)}`}
          </span>
        </div>
        <div className="p-3.5 bg-white/5 backdrop-blur-md">
          <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">Gas & DEX Fees</span>
          <span className="text-sm font-bold text-slate-300 font-mono">
            ${(stats.totalGasFeesUsd + stats.totalDexFeesUsd).toFixed(2)}
          </span>
        </div>
        <div className="p-3.5 bg-white/5 backdrop-blur-md">
          <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">Win Rate</span>
          <span className="text-sm font-bold text-indigo-300 font-mono">
            {stats.winRate}% (100% Fill)
          </span>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto max-h-72">
        <table className="w-full text-left text-xs">
          <thead className="bg-white/5 text-slate-400 font-bold uppercase text-[10px] tracking-wider sticky top-0 border-b border-white/10">
            <tr>
              <th className="py-3 px-4">Time</th>
              <th className="py-3 px-3">Mode</th>
              <th className="py-3 px-4">Strategy</th>
              <th className="py-3 px-4">Route</th>
              <th className="py-3 px-3 text-right">Size</th>
              <th className="py-3 px-3 text-right">Gross</th>
              <th className="py-3 px-3 text-right">Fees</th>
              <th className="py-3 px-4 text-right">Net Profit</th>
              <th className="py-3 px-3 text-center">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5 font-mono">
            {trades.length === 0 ? (
              <tr>
                <td colSpan={9} className="text-center py-10 text-slate-500 font-sans">
                  No trades executed yet. Enable Auto-Trade or click "Execute Gap" to trigger instant fills.
                </td>
              </tr>
            ) : (
              trades.map((trade) => {
                const isRealLive = trade.mode === 'LIVE';
                return (
                  <tr key={trade.id} className="hover:bg-white/5 transition-colors">
                    <td className="py-3 px-4 text-slate-400">
                      {new Date(trade.timestamp).toLocaleTimeString()}
                    </td>
                    <td className="py-3 px-3">
                      {isRealLive ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                          <Zap className="w-2.5 h-2.5 text-emerald-400" />
                          REAL
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30">
                          PAPER
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          trade.type === 'DEX_TO_DEX'
                            ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                            : 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                        }`}
                      >
                        {trade.type === 'DEX_TO_DEX' ? 'DEX-to-DEX' : 'Triangular'}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-sans font-medium text-slate-200">
                      <div className="flex items-center gap-1.5">
                        <span>{trade.routeSummary}</span>
                        {trade.txHash && isRealLive && (
                          <a
                            href={`https://polygonscan.com/tx/${trade.txHash}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-cyan-400 hover:text-cyan-300"
                            title="View on PolygonScan"
                          >
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-3 text-right text-slate-300">
                      ${trade.tradeAmountUsd.toFixed(2)}
                    </td>
                    <td className="py-3 px-3 text-right text-slate-300">
                      +${trade.grossProfitUsd.toFixed(3)}
                    </td>
                    <td className="py-3 px-3 text-right text-slate-400">
                      -${(trade.gasFeeUsd + trade.dexFeesUsd).toFixed(3)}
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-green-400">
                      +${trade.netProfitUsd.toFixed(3)}
                      <span className="block text-[10px] text-green-400/80 font-normal">
                        +{trade.netRoiPercent.toFixed(2)}% ROI
                      </span>
                    </td>
                    <td className="py-3 px-3 text-center">
                      <span className="px-2 py-0.5 rounded-full text-[9px] uppercase font-bold bg-green-500/20 text-green-400 border border-green-500/30">
                        {trade.status}
                      </span>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
