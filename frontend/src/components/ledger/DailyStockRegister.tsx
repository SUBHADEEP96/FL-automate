import React, { useState, useEffect } from 'react';
import { 
  FileSpreadsheet, 
  Calendar, 
  Download, 
  ShieldCheck, 
  AlertTriangle, 
  CheckCircle2, 
  Search,
  RefreshCw,
  Wine,
  TrendingUp,
  Package
} from 'lucide-react';
import { DSRSummary } from '../../types';
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
        <RefreshCw className="w-6 h-6 animate-spin text-emerald-600 mr-2" />
        <span>Loading Daily Stock Register...</span>
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
    <div className="flex-1 flex flex-col p-4 gap-4 overflow-y-auto select-none bg-slate-100">
      {/* Top Header & Actions Bar */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-4 shadow-sm">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-teal-50 border border-teal-300 flex items-center justify-center text-teal-700 font-black text-sm">
              DSR
            </div>
            <div>
              <h2 className="text-lg font-black text-slate-900 uppercase tracking-wider">
                Daily Stock Register (DSR)
              </h2>
              <div className="text-xs text-slate-600 flex items-center gap-2 mt-0.5 font-medium">
                <span>Krishnanagar FL Off-Shop (Nadia Range)</span>
                <span>•</span>
                <span className={`font-bold ${
                  dsrData?.status === 'FINALIZED' ? 'text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-300' : 'text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-300'
                }`}>
                  Status: {dsrData?.status === 'FINALIZED' ? 'FINALIZED' : 'OPEN'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Date Picker & Big Actions */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <div className="flex items-center gap-2 bg-slate-50 border-2 border-slate-300 px-3.5 py-2 rounded-xl text-xs font-mono shadow-xs">
            <Calendar className="w-4 h-4 text-teal-600" />
            <input
              type="date"
              value={selectedDate}
              onChange={e => setSelectedDate(e.target.value)}
              className="bg-transparent text-slate-900 font-black focus:outline-none cursor-pointer"
            />
          </div>

          <button
            onClick={() => setIsWizardOpen(true)}
            className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-black flex items-center gap-2 shadow-md pos-btn-press cursor-pointer"
          >
            <span>Day Close [F9]</span>
          </button>

          <button
            onClick={handleExportExcel}
            disabled={isExporting}
            className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black flex items-center gap-2 shadow-md pos-btn-press cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>{isExporting ? 'Exporting...' : 'WBSBCL Excel Export'}</span>
          </button>

          <button
            onClick={onOpenCompliance}
            className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black flex items-center gap-2 shadow-md pos-btn-press cursor-pointer"
          >
            <ShieldCheck className="w-4 h-4" />
            <span>e-Abgari Portal [F10]</span>
          </button>
        </div>
      </div>

      {/* Discrepancy Status Banner */}
      {summary && (
        summary.totals.discrepancyCount > 0 ? (
          <div className="bg-rose-50 border-2 border-rose-400 rounded-2xl p-4 flex items-center justify-between gap-3 text-rose-900 shadow-sm">
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-6 h-6 text-rose-600 flex-shrink-0" />
              <div>
                <strong className="text-base text-rose-900 font-black">
                  Stock Discrepancy Alert ({summary.totals.discrepancyCount} items mismatched)
                </strong>
                <p className="text-xs text-rose-700 mt-0.5 font-medium">
                  Physical bottle count differs from calculated stock ledger. Please reconcile via the Day Close wizard.
                </p>
              </div>
            </div>
            <button
              onClick={() => setIsWizardOpen(true)}
              className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-black shadow-sm cursor-pointer"
            >
              Resolve Discrepancy
            </button>
          </div>
        ) : (
          <div className="bg-emerald-50 border border-emerald-300 rounded-2xl p-3 px-4 flex items-center gap-3 text-emerald-900 shadow-xs">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
            <div className="text-xs">
              <strong className="text-emerald-800 font-extrabold">Counter Stock Verified:</strong>{' '}
              Opening Stock + Inward Consignment - Sales = Closing Stock (100% matched).
            </div>
          </div>
        )
      )}

      {/* Primary KPI Metric Cards (Friendly, large numbers on clean white cards) */}
      {summary && (
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
          <div className="bg-white border border-slate-200 p-3.5 rounded-2xl shadow-sm">
            <div className="text-xs font-bold text-slate-500 uppercase">Opening Stock</div>
            <div className="text-2xl font-mono font-black text-slate-900 mt-1">
              {summary.totals.totalOpeningBottles}
            </div>
            <div className="text-[11px] text-slate-500 font-medium">Opening (Btls)</div>
          </div>

          <div className="bg-white border border-slate-200 p-3.5 rounded-2xl shadow-sm">
            <div className="text-xs font-bold text-slate-500 uppercase">Inward Received</div>
            <div className="text-2xl font-mono font-black text-blue-700 mt-1">
              +{summary.totals.totalInwardBottles}
            </div>
            <div className="text-[11px] text-slate-500 font-medium">Inward (Btls)</div>
          </div>

          <div className="bg-white border border-slate-200 p-3.5 rounded-2xl shadow-sm">
            <div className="text-xs font-bold text-slate-500 uppercase">Bottles Sold</div>
            <div className="text-2xl font-mono font-black text-emerald-700 mt-1">
              {summary.totals.totalSalesBottles}
            </div>
            <div className="text-[11px] text-slate-500 font-medium">Sold (Btls)</div>
          </div>

          <div className="bg-white border border-slate-200 p-3.5 rounded-2xl shadow-sm">
            <div className="text-xs font-bold text-slate-500 uppercase">Closing Stock</div>
            <div className="text-2xl font-mono font-black text-amber-700 mt-1">
              {summary.totals.totalClosingBottles}
            </div>
            <div className="text-[11px] text-slate-500 font-medium">Closing (Btls)</div>
          </div>

          <div className="bg-white border border-slate-200 p-3.5 rounded-2xl shadow-sm">
            <div className="text-xs font-bold text-slate-500 uppercase">Total Sale Value</div>
            <div className="text-2xl font-mono font-black text-emerald-700 mt-1">
              {formatINR(summary.totals.totalSalesValue)}
            </div>
            <div className="text-[11px] text-slate-500 font-medium">Total Sale (₹)</div>
          </div>

          <div className="bg-white border border-slate-200 p-3.5 rounded-2xl shadow-sm">
            <div className="text-xs font-bold text-slate-500 uppercase">Bulk Litres</div>
            <div className="text-xl font-mono font-black text-blue-700 mt-1">
              {summary.totals.totalSalesBL.toFixed(2)} BL
            </div>
            <div className="text-[11px] text-slate-500 font-medium">Bulk Litres (BL)</div>
          </div>

          <div className="bg-white border border-slate-200 p-3.5 rounded-2xl shadow-sm">
            <div className="text-xs font-bold text-slate-500 uppercase">Proof Litres</div>
            <div className="text-xl font-mono font-black text-amber-700 mt-1">
              {summary.totals.totalSalesLPL.toFixed(2)} LPL
            </div>
            <div className="text-[11px] text-slate-500 font-medium">London Proof (LPL)</div>
          </div>
        </div>
      )}

      {/* Product-level Stock Register Table */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden flex-1 flex flex-col shadow-sm">
        {/* Table Search & Filter Toolbar */}
        <div className="p-3 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
          <div className="relative w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="🔍 Search by brand name or SKU code..."
              className="w-full bg-white border border-slate-300 rounded-xl pl-10 pr-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-blue-500 font-medium"
            />
          </div>

          <div className="flex items-center gap-1.5">
            {[
              { id: 'ALL', label: 'All Categories' },
              { id: 'IMFL', label: 'IMFL / Spirits' },
              { id: 'Beer', label: 'Beer' },
              { id: 'Wine', label: 'Wine' },
              { id: 'CS', label: 'Country Spirit (CS)' }
            ].map(cat => (
              <button
                key={cat.id}
                onClick={() => setCategoryFilter(cat.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  categoryFilter === cat.id
                    ? 'bg-blue-600 text-white shadow-sm font-black'
                    : 'text-slate-700 hover:bg-slate-200 bg-slate-100 border border-slate-200'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        {/* Detailed Register Table */}
        <div className="overflow-x-auto flex-1 max-h-96">
          <table className="w-full text-left text-xs text-slate-800 border-collapse">
            <thead className="bg-slate-100 text-slate-700 uppercase sticky top-0 border-b border-slate-200 font-black">
              <tr>
                <th className="p-3">Brand Name</th>
                <th className="p-3 text-center">Category</th>
                <th className="p-3 text-right">Pack Size</th>
                <th className="p-3 text-right">Opening</th>
                <th className="p-3 text-right">Inward</th>
                <th className="p-3 text-right">Sales</th>
                <th className="p-3 text-right">Closing</th>
                <th className="p-3 text-right">MRP (₹)</th>
                <th className="p-3 text-right">Sales Value (₹)</th>
                <th className="p-3 text-right">BL (Litres)</th>
                <th className="p-3 text-right">LPL (Litres)</th>
                <th className="p-3 text-center">Audit Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-sans">
              {filteredItems.map(item => (
                <tr key={item.productId} className="hover:bg-blue-50/50 transition-colors">
                  <td className="p-3 font-medium text-slate-900 truncate max-w-[220px]">
                    <div className="font-extrabold text-sm text-slate-900">{item.name}</div>
                    <div className="text-[10px] text-slate-500 font-mono font-semibold">{item.code}</div>
                  </td>
                  <td className="p-3 text-center">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                      {item.category}
                    </span>
                  </td>
                  <td className="p-3 text-right font-mono font-bold text-slate-800">{item.packSizeMl}ml</td>
                  <td className="p-3 text-right font-mono text-slate-600 font-medium">{item.opening}</td>
                  <td className="p-3 text-right font-mono text-blue-700 font-bold">+{item.inward}</td>
                  <td className="p-3 text-right font-mono text-emerald-700 font-black">-{item.sales}</td>
                  <td className="p-3 text-right font-mono font-black text-slate-900">{item.physicalClosing}</td>
                  <td className="p-3 text-right font-mono text-slate-700 font-medium">₹{item.mrp}</td>
                  <td className="p-3 text-right font-mono font-bold text-emerald-700">
                    {formatINR(item.salesValue)}
                  </td>
                  <td className="p-3 text-right font-mono text-blue-700">{item.salesBL.toFixed(3)}</td>
                  <td className="p-3 text-right font-mono text-amber-700">{item.salesLPL.toFixed(3)}</td>
                  <td className="p-3 text-center font-mono">
                    {item.discrepancy !== 0 ? (
                      <span className="px-2 py-0.5 rounded text-[10px] font-black bg-rose-100 text-rose-800 border border-rose-300">
                        Mismatch {item.discrepancy}
                      </span>
                    ) : (
                      <span className="text-emerald-700 font-black">✓ Verified OK</span>
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
