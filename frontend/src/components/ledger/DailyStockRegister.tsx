import React, { useState, useEffect } from 'react';
import { 
  FileSpreadsheet, 
  Calendar, 
  Download, 
  ShieldCheck, 
  AlertTriangle, 
  Sparkles, 
  CheckCircle2, 
  Layers,
  Search,
  Filter,
  RefreshCw
} from 'lucide-react';
import { DSRSummary, Product } from '../../types';
import { DayCloseWizardModal } from './DayCloseWizardModal';
import { formatINR, formatBL, formatLPL } from '../../utils/exciseCalc';

interface DailyStockRegisterProps {
  onOpenCompliance: () => void;
  onRefreshProducts: () => void;
}

export const DailyStockRegister: React.FC<DailyStockRegisterProps> = ({
  onOpenCompliance,
  onRefreshProducts
}) => {
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [loading, setLoading] = useState<boolean>(true);
  const [dsrData, setDsrData] = useState<{
    date: string;
    status: string;
    summary: DSRSummary;
    existingDsr: any;
  } | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [isWizardOpen, setIsWizardOpen] = useState<boolean>(false);
  const [isExporting, setIsExporting] = useState<boolean>(false);

  const fetchDsr = async (date: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/dsr/${date}`);
      const json = await res.json();
      if (json.success) {
        setDsrData(json.data);
      }
    } catch (err) {
      console.error('Failed to load DSR:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDsr(selectedDate);
  }, [selectedDate]);

  const handleExportExcel = async () => {
    setIsExporting(true);
    try {
      window.location.href = `/api/compliance/export-excel?date=${selectedDate}`;
    } catch (err: any) {
      alert(`Excel export failed: ${err.message}`);
    } finally {
      setTimeout(() => setIsExporting(false), 2000);
    }
  };

  const handleFinalizeDayClose = async (payload: {
    date: string;
    closedBy: string;
    physicalCounts: Record<number, number>;
    breakages: Record<number, number>;
  }) => {
    const res = await fetch('/api/dsr/close-day', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const json = await res.json();
    if (!json.success) throw new Error(json.error || 'Failed to close day');

    alert('✓ Day-Close finalized and recorded in the e-Abgari register!');
    fetchDsr(selectedDate);
    onRefreshProducts();
  };

  if (loading && !dsrData) {
    return (
      <div className="flex-1 flex items-center justify-center p-8 text-slate-400">
        <RefreshCw className="w-6 h-6 animate-spin text-emerald-400 mr-2" />
        <span>Loading West Bengal Excise Register...</span>
      </div>
    );
  }

  const summary = dsrData?.summary;
  const filteredItems = summary?.items.filter(it => {
    const matchesCat = categoryFilter === 'ALL' || it.category === categoryFilter;
    const term = searchTerm.toLowerCase().trim();
    const matchesSearch = !term || it.name.toLowerCase().includes(term) || it.code.toLowerCase().includes(term);
    return matchesCat && matchesSearch;
  }) || [];

  return (
    <div className="flex-1 flex flex-col p-4 gap-4 overflow-y-auto select-none">
      {/* Top Header & Actions Bar */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-emerald-400" />
            <h2 className="text-lg font-bold text-white uppercase tracking-wider">
              Daily Stock & Sales Register (DSR)
            </h2>
            <span className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold uppercase ${
              dsrData?.status === 'SUBMITTED_TO_EABGARI'
                ? 'bg-purple-950 text-purple-300 border border-purple-700'
                : dsrData?.status === 'FINALIZED'
                ? 'bg-emerald-950 text-emerald-300 border border-emerald-700'
                : 'bg-amber-950 text-amber-300 border border-amber-700'
            }`}>
              STATUS: {dsrData?.status || 'OPEN'}
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Statutory ledger compliant with Bengal Excise Act, 1909 & WBSBCL Retail Regulations.
          </p>
        </div>

        {/* Date Selector & Action Buttons */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 bg-slate-950 border border-slate-800 px-3 py-1.5 rounded-lg text-xs font-mono">
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            <input
              type="date"
              value={selectedDate}
              onChange={e => setSelectedDate(e.target.value)}
              className="bg-transparent text-white focus:outline-none"
            />
          </div>

          <button
            onClick={() => setIsWizardOpen(true)}
            className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-md shadow-rose-950 active:scale-95"
          >
            <span>Run Day-Close [F9]</span>
          </button>

          <button
            onClick={handleExportExcel}
            disabled={isExporting}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-md shadow-emerald-950 active:scale-95"
            title="Download formatted WBSBCL Excel file"
          >
            <Download className="w-3.5 h-3.5" />
            <span>{isExporting ? 'Exporting...' : 'Export Excel (.xlsx)'}</span>
          </button>

          <button
            onClick={onOpenCompliance}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-md shadow-blue-950 active:scale-95"
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Portal Filing [F10]</span>
          </button>
        </div>
      </div>

      {/* Discrepancy Alert Banner */}
      {summary && summary.totals.discrepancyCount > 0 && (
        <div className="bg-rose-950/40 border border-rose-800/80 rounded-xl p-3.5 flex items-center justify-between gap-3 text-rose-200">
          <div className="flex items-center gap-2.5">
            <AlertTriangle className="w-5 h-5 text-rose-400 flex-shrink-0" />
            <div className="text-xs">
              <strong className="text-rose-300 font-bold">AUDIT DISCREPANCY DETECTED:</strong>{' '}
              {summary.totals.discrepancyCount} product items have variances between theoretical opening + receipts - sales and physical counter inventory.
            </div>
          </div>
          <button
            onClick={() => setIsWizardOpen(true)}
            className="px-3 py-1 bg-rose-600 hover:bg-rose-500 text-white rounded text-xs font-bold font-mono"
          >
            Reconcile Now
          </button>
        </div>
      )}

      {/* Primary KPI Metrics Grid */}
      {summary && (
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2.5">
          <div className="bg-slate-900/90 border border-slate-800 p-3 rounded-xl">
            <div className="text-[10px] font-mono text-slate-400">OPENING</div>
            <div className="text-lg font-mono font-bold text-white mt-1">
              {summary.totals.totalOpeningBottles}
            </div>
            <div className="text-[10px] text-slate-500">Bottles</div>
          </div>

          <div className="bg-slate-900/90 border border-slate-800 p-3 rounded-xl">
            <div className="text-[10px] font-mono text-slate-400">INWARD</div>
            <div className="text-lg font-mono font-bold text-cyan-400 mt-1">
              +{summary.totals.totalInwardBottles}
            </div>
            <div className="text-[10px] text-slate-500">Depot Receipts</div>
          </div>

          <div className="bg-slate-900/90 border border-slate-800 p-3 rounded-xl">
            <div className="text-[10px] font-mono text-slate-400">DAILY SALES</div>
            <div className="text-lg font-mono font-bold text-emerald-400 mt-1">
              {summary.totals.totalSalesBottles}
            </div>
            <div className="text-[10px] text-slate-500">Bottles Sold</div>
          </div>

          <div className="bg-slate-900/90 border border-slate-800 p-3 rounded-xl">
            <div className="text-[10px] font-mono text-slate-400">BREAKAGE</div>
            <div className="text-lg font-mono font-bold text-rose-400 mt-1">
              {summary.totals.totalBreakageBottles}
            </div>
            <div className="text-[10px] text-slate-500">Wastage / Leakage</div>
          </div>

          <div className="bg-slate-900/90 border border-slate-800 p-3 rounded-xl">
            <div className="text-[10px] font-mono text-slate-400">CLOSING</div>
            <div className="text-lg font-mono font-bold text-white mt-1">
              {summary.totals.totalClosingBottles}
            </div>
            <div className="text-[10px] text-slate-500">Counter Stock</div>
          </div>

          <div className="bg-slate-900/90 border border-slate-800 p-3 rounded-xl">
            <div className="text-[10px] font-mono text-slate-400">BULK LITRES</div>
            <div className="text-lg font-mono font-bold text-cyan-400 mt-1">
              {summary.totals.totalSalesBL.toFixed(2)}
            </div>
            <div className="text-[10px] text-slate-500">Sales BL Volume</div>
          </div>

          <div className="bg-slate-900/90 border border-slate-800 p-3 rounded-xl">
            <div className="text-[10px] font-mono text-slate-400">LONDON PROOF</div>
            <div className="text-lg font-mono font-bold text-amber-400 mt-1">
              {summary.totals.totalSalesLPL.toFixed(2)}
            </div>
            <div className="text-[10px] text-slate-500">Sales LPL Volume</div>
          </div>

          <div className="bg-slate-900/90 border border-slate-800 p-3 rounded-xl">
            <div className="text-[10px] font-mono text-slate-400">GROSS VALUE</div>
            <div className="text-lg font-mono font-bold text-emerald-400 mt-1">
              {formatINR(summary.totals.totalSalesValue)}
            </div>
            <div className="text-[10px] text-slate-500">Daily Revenue</div>
          </div>
        </div>
      )}

      {/* Category Summaries Breakdown */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          {Object.entries(summary.categoryBreakdown).map(([cat, data]) => (
            <div key={cat} className="bg-slate-900/80 border border-slate-800 p-3 rounded-xl">
              <div className="flex items-center justify-between mb-2">
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                  cat === 'IMFL' ? 'bg-amber-950 text-amber-300 border border-amber-800' :
                  cat === 'Beer' ? 'bg-yellow-950 text-yellow-300 border border-yellow-800' :
                  cat === 'Wine' ? 'bg-rose-950 text-rose-300 border border-rose-800' :
                  'bg-purple-950 text-purple-300 border border-purple-800'
                }`}>
                  {cat}
                </span>
                <span className="text-xs font-mono font-bold text-emerald-400">
                  {formatINR(data.salesValue)}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-1 text-[11px] font-mono text-slate-400">
                <div>Sold: <strong className="text-white">{data.bottlesSold}</strong></div>
                <div>BL: <strong className="text-cyan-400">{data.bl.toFixed(2)}</strong></div>
                <div>LPL: <strong className="text-amber-400">{data.lpl.toFixed(2)}</strong></div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Product-level Detailed Stock Register Table */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl overflow-hidden flex-1 flex flex-col">
        {/* Table Filter Toolbar */}
        <div className="p-3 bg-slate-950 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3">
          <div className="relative w-72">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="Search product code or brand..."
              className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-9 pr-3 py-1.5 text-xs text-white focus:outline-none focus:border-cyan-400"
            />
          </div>

          <div className="flex items-center gap-1.5">
            {['ALL', 'IMFL', 'Beer', 'Wine', 'CS'].map(cat => (
              <button
                key={cat}
                onClick={() => setCategoryFilter(cat)}
                className={`px-2.5 py-1 rounded text-xs font-semibold transition-all ${
                  categoryFilter === cat
                    ? 'bg-slate-800 text-white border border-slate-600 font-bold'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Detailed Table */}
        <div className="overflow-x-auto flex-1 max-h-96">
          <table className="w-full text-left text-xs text-slate-200 border-collapse">
            <thead className="bg-slate-950 text-[11px] font-mono text-slate-400 uppercase sticky top-0 border-b border-slate-800">
              <tr>
                <th className="p-2.5">SKU Code</th>
                <th className="p-2.5">Brand & Description</th>
                <th className="p-2.5 text-center">Cat</th>
                <th className="p-2.5 text-right">Pack (ml)</th>
                <th className="p-2.5 text-right">Str %</th>
                <th className="p-2.5 text-right">Opening</th>
                <th className="p-2.5 text-right">Inward</th>
                <th className="p-2.5 text-right">Sales</th>
                <th className="p-2.5 text-right">Breakage</th>
                <th className="p-2.5 text-right">Closing</th>
                <th className="p-2.5 text-right">Sales BL</th>
                <th className="p-2.5 text-right">Sales LPL</th>
                <th className="p-2.5 text-right">MRP (₹)</th>
                <th className="p-2.5 text-right">Turnover</th>
                <th className="p-2.5 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono">
              {filteredItems.map(item => (
                <tr key={item.productId} className="hover:bg-slate-800/40">
                  <td className="p-2.5 text-slate-400">{item.code}</td>
                  <td className="p-2.5 font-sans font-medium text-white truncate max-w-[200px]">
                    {item.name}
                  </td>
                  <td className="p-2.5 text-center">
                    <span className="px-1.5 py-0.5 rounded text-[10px] bg-slate-800 text-slate-300">
                      {item.category}
                    </span>
                  </td>
                  <td className="p-2.5 text-right">{item.packSizeMl}</td>
                  <td className="p-2.5 text-right text-slate-400">{item.strengthPct}%</td>
                  <td className="p-2.5 text-right text-slate-300">{item.opening}</td>
                  <td className="p-2.5 text-right text-cyan-400">+{item.inward}</td>
                  <td className="p-2.5 text-right text-emerald-400">-{item.sales}</td>
                  <td className="p-2.5 text-right text-rose-400">{item.breakage}</td>
                  <td className="p-2.5 text-right font-bold text-white">{item.physicalClosing}</td>
                  <td className="p-2.5 text-right text-cyan-300">{item.salesBL.toFixed(3)}</td>
                  <td className="p-2.5 text-right text-amber-300">{item.salesLPL.toFixed(3)}</td>
                  <td className="p-2.5 text-right">₹{item.mrp}</td>
                  <td className="p-2.5 text-right font-bold text-emerald-400">
                    {formatINR(item.salesValue)}
                  </td>
                  <td className="p-2.5 text-center">
                    {item.discrepancy !== 0 ? (
                      <span className="px-1.5 py-0.5 rounded text-[10px] bg-rose-950 text-rose-300 border border-rose-800">
                        Diff {item.discrepancy > 0 ? `+${item.discrepancy}` : item.discrepancy}
                      </span>
                    ) : (
                      <span className="text-emerald-400">✓ OK</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Day Close Wizard Modal */}
      {summary && (
        <DayCloseWizardModal
          isOpen={isWizardOpen}
          onClose={() => setIsWizardOpen(false)}
          summary={summary}
          dateStr={selectedDate}
          onFinalizeDayClose={handleFinalizeDayClose}
        />
      )}
    </div>
  );
};
