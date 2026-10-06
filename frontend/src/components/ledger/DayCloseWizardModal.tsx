import React, { useState } from 'react';
import { CheckCircle2, AlertTriangle, ShieldCheck, X, ChevronRight, ChevronLeft } from 'lucide-react';
import { DSRSummary } from '../../types';
import { formatINR, formatBL, formatLPL } from '../../utils/exciseCalc';

interface DayCloseWizardModalProps {
  isOpen: boolean;
  onClose: () => void;
  summary: DSRSummary;
  dateStr: string;
  onFinalizeDayClose: (payload: {
    date: string;
    closedBy: string;
    physicalCounts: Record<number, number>;
    breakages: Record<number, number>;
  }) => Promise<void>;
}

export const DayCloseWizardModal: React.FC<DayCloseWizardModalProps> = ({
  isOpen,
  onClose,
  summary,
  dateStr,
  onFinalizeDayClose
}) => {
  const [step, setStep] = useState<number>(1);
  const [closedBy, setClosedBy] = useState<string>('Manager (S. Banerjee)');
  const [physicalCounts, setPhysicalCounts] = useState<Record<number, number>>({});
  const [breakages, setBreakages] = useState<Record<number, number>>({});
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  if (!isOpen) return null;

  // Initialize defaults
  const getPhysical = (id: number, expected: number) => {
    return physicalCounts[id] !== undefined ? physicalCounts[id] : expected;
  };
  const getBreakage = (id: number) => {
    return breakages[id] !== undefined ? breakages[id] : 0;
  };

  const handlePhysicalChange = (id: number, val: string) => {
    setPhysicalCounts(prev => ({
      ...prev,
      [id]: Math.max(0, parseInt(val) || 0)
    }));
  };

  const handleBreakageChange = (id: number, val: string) => {
    setBreakages(prev => ({
      ...prev,
      [id]: Math.max(0, parseInt(val) || 0)
    }));
  };

  // Calculate discrepancies
  let discrepanciesFound = 0;
  summary.items.forEach(item => {
    const phys = getPhysical(item.productId, item.expectedClosing);
    const brk = getBreakage(item.productId);
    const exp = item.opening + item.inward - item.sales - brk;
    if (phys !== exp) {
      discrepanciesFound++;
    }
  });

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      await onFinalizeDayClose({
        date: dateStr,
        closedBy,
        physicalCounts,
        breakages
      });
      onClose();
    } catch (err: any) {
      alert(`Day close failed: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4 select-none overflow-y-auto"
      onClick={onClose}
    >
      <div 
        className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-4xl overflow-hidden shadow-2xl flex flex-col my-8 animate-in fade-in zoom-in-95 duration-150"
        onClick={e => e.stopPropagation()}
      >
        {/* Wizard Header */}
        <div className="p-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-sm">
              EOD
            </div>
            <div>
              <h3 className="text-base font-bold text-white uppercase tracking-wider">
                End-of-Day (EOD) Day-Close Wizard
              </h3>
              <div className="text-xs text-slate-400 font-mono">
                Date: {dateStr} | Bengal Excise Act Statutory Reconciliation
              </div>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Step Indicator */}
        <div className="grid grid-cols-3 bg-slate-950/60 p-2 border-b border-slate-800 text-xs font-mono">
          <div className={`p-2 rounded text-center ${step === 1 ? 'bg-emerald-950 text-emerald-300 font-bold border border-emerald-800' : 'text-slate-400'}`}>
            1. Daily Sales & BL Summary
          </div>
          <div className={`p-2 rounded text-center ${step === 2 ? 'bg-emerald-950 text-emerald-300 font-bold border border-emerald-800' : 'text-slate-400'}`}>
            2. Physical Count & Breakage
          </div>
          <div className={`p-2 rounded text-center ${step === 3 ? 'bg-emerald-950 text-emerald-300 font-bold border border-emerald-800' : 'text-slate-400'}`}>
            3. Discrepancy & Sign-off
          </div>
        </div>

        {/* Step Body */}
        <div className="p-6 overflow-y-auto max-h-[60vh]">
          {step === 1 && (
            <div className="space-y-4">
              <h4 className="text-sm font-bold text-slate-200">
                Step 1: Daily Transaction & Volume Verification
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                  <div className="text-xs text-slate-400">Total Opening Stock</div>
                  <div className="text-xl font-mono font-bold text-white mt-1">
                    {summary.totals.totalOpeningBottles} btls
                  </div>
                </div>
                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                  <div className="text-xs text-slate-400">Inward Receipts</div>
                  <div className="text-xl font-mono font-bold text-cyan-400 mt-1">
                    +{summary.totals.totalInwardBottles} btls
                  </div>
                </div>
                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                  <div className="text-xs text-slate-400">Total Sales Bottles</div>
                  <div className="text-xl font-mono font-bold text-emerald-400 mt-1">
                    {summary.totals.totalSalesBottles} btls
                  </div>
                </div>
                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                  <div className="text-xs text-slate-400">Gross Sales Value</div>
                  <div className="text-xl font-mono font-bold text-emerald-400 mt-1">
                    {formatINR(summary.totals.totalSalesValue)}
                  </div>
                </div>
              </div>

              {/* Excise Litres Totals */}
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
                <div className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                  Official Excise Volume Metrics
                </div>
                <div className="grid grid-cols-2 gap-4 font-mono text-sm">
                  <div>
                    <span className="text-slate-400">Total Bulk Litres (BL): </span>
                    <strong className="text-cyan-400">{formatBL(summary.totals.totalSalesBL)}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400">Total London Proof Litres (LPL): </span>
                    <strong className="text-amber-400">{formatLPL(summary.totals.totalSalesLPL)}</strong>
                  </div>
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-bold text-slate-200">
                  Step 2: Enter Physical Counter Verification & Wastage/Breakage
                </h4>
                <span className="text-xs text-slate-400">
                  Defaults to expected theoretical count
                </span>
              </div>

              <div className="overflow-x-auto max-h-80 border border-slate-800 rounded-xl">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-950 text-slate-400 font-mono text-[11px] uppercase sticky top-0">
                    <tr>
                      <th className="p-2.5">Brand</th>
                      <th className="p-2.5 text-right">Opening</th>
                      <th className="p-2.5 text-right">Inward</th>
                      <th className="p-2.5 text-right">Sales</th>
                      <th className="p-2.5 text-center w-24">Breakage</th>
                      <th className="p-2.5 text-right">Expected</th>
                      <th className="p-2.5 text-center w-28">Physical Count</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-mono">
                    {summary.items.map(item => {
                      const phys = getPhysical(item.productId, item.expectedClosing);
                      const brk = getBreakage(item.productId);
                      return (
                        <tr key={item.productId} className="hover:bg-slate-800/30">
                          <td className="p-2.5 font-sans font-medium text-white truncate max-w-[200px]">
                            {item.name} ({item.packSizeMl}ml)
                          </td>
                          <td className="p-2.5 text-right text-slate-400">{item.opening}</td>
                          <td className="p-2.5 text-right text-cyan-400">+{item.inward}</td>
                          <td className="p-2.5 text-right text-emerald-400">-{item.sales}</td>
                          <td className="p-2 text-center">
                            <input
                              type="number"
                              min="0"
                              value={brk}
                              onChange={e => handleBreakageChange(item.productId, e.target.value)}
                              className="w-16 bg-slate-950 border border-slate-700 rounded px-2 py-1 text-center text-white focus:outline-none focus:border-cyan-400"
                            />
                          </td>
                          <td className="p-2.5 text-right font-bold text-slate-300">
                            {item.opening + item.inward - item.sales - brk}
                          </td>
                          <td className="p-2 text-center">
                            <input
                              type="number"
                              min="0"
                              value={phys}
                              onChange={e => handlePhysicalChange(item.productId, e.target.value)}
                              className={`w-20 bg-slate-950 border rounded px-2 py-1 text-center font-bold focus:outline-none ${
                                phys !== (item.opening + item.inward - item.sales - brk)
                                  ? 'border-rose-500 text-rose-400'
                                  : 'border-slate-700 text-white focus:border-emerald-400'
                              }`}
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <h4 className="text-sm font-bold text-slate-200">
                Step 3: Discrepancy Reconciliation & Day-Close Authorization
              </h4>

              {discrepanciesFound > 0 ? (
                <div className="p-4 bg-rose-950/40 border border-rose-800/60 rounded-xl flex items-start gap-3 text-rose-300">
                  <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5 text-rose-400" />
                  <div>
                    <div className="font-bold text-sm">
                      Stock Discrepancy Detected ({discrepanciesFound} items mismatched)
                    </div>
                    <div className="text-xs text-rose-200 mt-1">
                      Physical counter count does not match theoretical book stock. The variance will be recorded as an audit discrepancy in the e-Abgari Daily Stock Register.
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-4 bg-emerald-950/40 border border-emerald-800/60 rounded-xl flex items-start gap-3 text-emerald-300">
                  <ShieldCheck className="w-5 h-5 flex-shrink-0 mt-0.5 text-emerald-400" />
                  <div>
                    <div className="font-bold text-sm">
                      Zero Discrepancies — Full Inventory Reconciliation Verified
                    </div>
                    <div className="text-xs text-emerald-200 mt-1">
                      Physical count matches theoretical opening + receipts - sales exactly. Ready for certified submission.
                    </div>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">
                  Manager / Licensee Sign-off Authority
                </label>
                <input
                  type="text"
                  value={closedBy}
                  onChange={e => setClosedBy(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white"
                />
              </div>
            </div>
          )}
        </div>

        {/* Wizard Footer */}
        <div className="p-4 bg-slate-950 border-t border-slate-800 flex items-center justify-between">
          <button
            onClick={() => {
              if (step > 1) setStep(step - 1);
              else onClose();
            }}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-mono flex items-center gap-1"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>{step === 1 ? 'Cancel' : 'Back'}</span>
          </button>

          {step < 3 ? (
            <button
              onClick={() => setStep(step + 1)}
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold flex items-center gap-1"
            >
              <span>Next Step</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="px-6 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold flex items-center gap-2 shadow-lg shadow-emerald-950"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{isSubmitting ? 'Finalizing Day-Close...' : 'Authorize & Lock EOD Register'}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
