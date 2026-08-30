import React from 'react';
import {
  History,
  Download,
  Trash2,
  ExternalLink,
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
  const formatPrice = (price?: number) => {
    if (price === undefined || price === null || isNaN(price) || price === 0) return '—';
    if (price >= 1000) {
      return `$${price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }
    if (price >= 1) {
      return `$${price.toFixed(4)}`;
    }
    if (price >= 0.0001) {
      return `$${price.toFixed(6)}`;
    }
    return `$${price.toPrecision(4)}`;
  };

  const exportCsv = () => {
    if (trades.length === 0) return;
    const headers = [
      'Timestamp',
      'Mode',
      'Strategy',
      'Route',
      'Buy_Price_USD',
      'Sell_Price_USD',
      'Amount_USD',
      'Gross_Profit_USD',
      'Gas_USD',
      'DEX_Fees_USD',
      'Net_Profit_USD',
      'ROI_Percent',
      'Polygonscan_Tx_Address',
      'Status',
    ];
    const rows = trades.map((t) => [
      new Date(t.timestamp).toISOString(),
      t.mode,
      t.type,
      `"${t.routeSummary}"`,
      t.buyPrice !== undefined ? t.buyPrice : '',
      t.sellPrice !== undefined ? t.sellPrice : '',
      t.tradeAmountUsd,
      t.grossProfitUsd,
      t.gasFeeUsd,
      t.dexFeesUsd,
      t.netProfitUsd,
      t.netRoiPercent,
      t.mode === 'PAPER' ? 'xxxxxxxx' : (t.txHash ? `https://polygonscan.com/tx/${t.txHash}` : 'xxxxxxxx'),
      t.status,
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
      <div className="overflow-x-auto max-h-80">
        <table className="w-full text-left text-xs min-w-[900px]">
          <thead className="bg-white/5 text-slate-400 font-bold uppercase text-[10px] tracking-wider sticky top-0 border-b border-white/10 z-10">
            <tr>
              <th className="py-3 px-3">Time</th>
              <th className="py-3 px-2">Mode</th>
              <th className="py-3 px-3">Strategy</th>
              <th className="py-3 px-3">Route</th>
              <th className="py-3 px-3 text-right">Buy Price</th>
              <th className="py-3 px-3 text-right">Sell Price</th>
              <th className="py-3 px-3 text-right">Size</th>
              <th className="py-3 px-2 text-right">Gross</th>
              <th className="py-3 px-2 text-right">Fees</th>
              <th className="py-3 px-3 text-right">Net Profit</th>
              <th className="py-3 px-3 text-center">PolygonScan Tx</th>
              <th className="py-3 px-2 text-center">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5 font-mono">
            {trades.length === 0 ? (
              <tr>
                <td colSpan={12} className="text-center py-10 text-slate-500 font-sans">
                  No trades executed yet. Enable Auto-Trade or click "Execute Gap" to trigger instant fills.
                </td>
              </tr>
            ) : (
              trades.map((trade) => {
                const isRealLive = trade.mode === 'LIVE';
                return (
                  <tr key={trade.id} className="hover:bg-white/5 transition-colors">
                    <td className="py-3 px-3 text-slate-400 whitespace-nowrap">
                      {new Date(trade.timestamp).toLocaleTimeString()}
                    </td>
                    <td className="py-3 px-2 whitespace-nowrap">
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
                    <td className="py-3 px-3 whitespace-nowrap">
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
                    <td className="py-3 px-3 font-sans font-medium text-slate-200 whitespace-nowrap max-w-[200px] truncate" title={trade.routeSummary}>
                      {trade.routeSummary}
                    </td>
                    <td className="py-3 px-3 text-right text-emerald-300 font-medium whitespace-nowrap">
                      {formatPrice(trade.buyPrice)}
                    </td>
                    <td className="py-3 px-3 text-right text-cyan-300 font-medium whitespace-nowrap">
                      {formatPrice(trade.sellPrice)}
                    </td>
                    <td className="py-3 px-3 text-right text-slate-300 whitespace-nowrap">
                      ${trade.tradeAmountUsd.toFixed(2)}
                    </td>
                    <td className="py-3 px-2 text-right text-slate-300 whitespace-nowrap">
                      +${trade.grossProfitUsd.toFixed(3)}
                    </td>
                    <td className="py-3 px-2 text-right text-slate-400 whitespace-nowrap">
                      -${(trade.gasFeeUsd + trade.dexFeesUsd).toFixed(3)}
                    </td>
                    <td className="py-3 px-3 text-right font-bold text-green-400 whitespace-nowrap">
                      +${trade.netProfitUsd.toFixed(3)}
                      <span className="block text-[10px] text-green-400/80 font-normal">
                        +{trade.netRoiPercent.toFixed(2)}% ROI
                      </span>
                    </td>
                    <td className="py-3 px-3 text-center whitespace-nowrap">
                      {isRealLive ? (
                        trade.txHash ? (
                          <div className="flex flex-col items-center gap-0.5">
                            <a
                              href={`https://polygonscan.com/tx/${trade.txHash}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-cyan-400 hover:text-cyan-300 inline-flex items-center gap-1 font-mono text-[11px] underline underline-offset-2 hover:bg-cyan-500/10 px-1.5 py-0.5 rounded transition-colors"
                              title="View transaction on PolygonScan"
                            >
                              <span>{trade.txHash.slice(0, 6)}...{trade.txHash.slice(-4)}</span>
                              <ExternalLink className="w-3 h-3 shrink-0" />
                            </a>
                            {(trade.buyTxHash || trade.sellTxHash) && (
                              <div className="flex items-center gap-1.5 text-[9px] text-slate-400">
                                {trade.buyTxHash && (
                                  <a
                                    href={`https://polygonscan.com/tx/${trade.buyTxHash}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-emerald-400 hover:underline"
                                    title="Buy Leg Tx"
                                  >
                                    Buy: {trade.buyTxHash.slice(0, 4)}...
                                  </a>
                                )}
                                {trade.sellTxHash && (
                                  <a
                                    href={`https://polygonscan.com/tx/${trade.sellTxHash}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-indigo-400 hover:underline"
                                    title="Sell Leg Tx"
                                  >
                                    Sell: {trade.sellTxHash.slice(0, 4)}...
                                  </a>
                                )}
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-500 font-mono text-[11px]">0xPending...</span>
                        )
                      ) : (
                        <span className="text-slate-400 font-mono text-xs tracking-wider bg-white/5 px-2 py-0.5 rounded border border-white/5 select-all">
                          xxxxxxxx
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-2 text-center whitespace-nowrap">
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
