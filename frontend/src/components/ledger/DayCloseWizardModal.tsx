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
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 select-none overflow-y-auto"
      onClick={onClose}
    >
      <div 
        className="bg-white border border-slate-200 rounded-3xl w-full max-w-4xl overflow-hidden shadow-2xl flex flex-col my-8 animate-in fade-in zoom-in-95 duration-150"
        onClick={e => e.stopPropagation()}
      >
        {/* Wizard Header */}
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-teal-100 text-teal-800 flex items-center justify-center font-black text-sm">
              EOD
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900 uppercase tracking-wider">
                Day-Close Statutory Wizard (EOD)
              </h3>
              <div className="text-xs text-slate-600 font-mono font-medium">
                Date: {dateStr} | Bengal Excise Act Stock Reconciliation
              </div>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-200 cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Step Indicator */}
        <div className="grid grid-cols-3 bg-slate-100 p-2 border-b border-slate-200 text-xs font-mono font-bold">
          <div className={`p-2.5 rounded-xl text-center transition-all ${step === 1 ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-600 bg-white border border-slate-200'}`}>
            1. Sales & Volume Audit
          </div>
          <div className={`p-2.5 rounded-xl text-center transition-all ${step === 2 ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-600 bg-white border border-slate-200'}`}>
            2. Physical Count & Breakage
          </div>
          <div className={`p-2.5 rounded-xl text-center transition-all ${step === 3 ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-600 bg-white border border-slate-200'}`}>
            3. Discrepancy & Sign-off
          </div>
        </div>

        {/* Step Body */}
        <div className="p-6 overflow-y-auto max-h-[60vh]">
          {step === 1 && (
            <div className="space-y-4">
              <h4 className="text-sm font-extrabold text-slate-800">
                Step 1: Daily Transactions & Statutory Volume Verification
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 shadow-xs">
                  <div className="text-xs text-slate-500 font-bold uppercase">Opening Stock</div>
                  <div className="text-xl font-mono font-black text-slate-900 mt-1">
                    {summary.totals.totalOpeningBottles} pcs
                  </div>
                </div>
                <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 shadow-xs">
                  <div className="text-xs text-slate-500 font-bold uppercase">Inward Received</div>
                  <div className="text-xl font-mono font-black text-blue-700 mt-1">
                    +{summary.totals.totalInwardBottles} pcs
                  </div>
                </div>
                <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 shadow-xs">
                  <div className="text-xs text-slate-500 font-bold uppercase">Bottles Sold</div>
                  <div className="text-xl font-mono font-black text-emerald-700 mt-1">
                    {summary.totals.totalSalesBottles} pcs
                  </div>
                </div>
                <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 shadow-xs">
                  <div className="text-xs text-slate-500 font-bold uppercase">Total Sale Value</div>
                  <div className="text-xl font-mono font-black text-emerald-700 mt-1">
                    {formatINR(summary.totals.totalSalesValue)}
                  </div>
                </div>
              </div>

              {/* Excise Litres Totals */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                <div className="text-xs font-black text-slate-700 uppercase tracking-wider mb-2">
                  West Bengal Statutory Volume Metrics
                </div>
                <div className="grid grid-cols-2 gap-4 font-mono text-sm">
                  <div>
                    <span className="text-slate-600 font-bold">Total Bulk Litres (BL): </span>
                    <strong className="text-blue-700 text-base">{formatBL(summary.totals.totalSalesBL)}</strong>
                  </div>
                  <div>
                    <span className="text-slate-600 font-bold">London Proof Litres (LPL): </span>
                    <strong className="text-amber-700 text-base">{formatLPL(summary.totals.totalSalesLPL)}</strong>
                  </div>
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-extrabold text-slate-800">
                  Step 2: Physical Counter Count & Breakages
                </h4>
                <span className="text-xs text-slate-500 font-medium">
                  Pre-populated with expected closing balance
                </span>
              </div>

              <div className="overflow-x-auto max-h-80 border border-slate-200 rounded-xl">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-100 text-slate-700 font-black uppercase sticky top-0 border-b border-slate-200">
                    <tr>
                      <th className="p-2.5">Brand & Pack Size</th>
                      <th className="p-2.5 text-right">Opening</th>
                      <th className="p-2.5 text-right">Inward</th>
                      <th className="p-2.5 text-right">Sales</th>
                      <th className="p-2.5 text-center w-24">Breakage</th>
                      <th className="p-2.5 text-right">Expected</th>
                      <th className="p-2.5 text-center w-28">Physical Count</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-mono">
                    {summary.items.map(item => {
                      const phys = getPhysical(item.productId, item.expectedClosing);
                      const brk = getBreakage(item.productId);
                      return (
                        <tr key={item.productId} className="hover:bg-blue-50/50">
                          <td className="p-2.5 font-sans font-bold text-slate-900 truncate max-w-[200px]">
                            {item.name} ({item.packSizeMl}ml)
                          </td>
                          <td className="p-2.5 text-right text-slate-600 font-medium">{item.opening}</td>
                          <td className="p-2.5 text-right text-blue-700 font-bold">+{item.inward}</td>
                          <td className="p-2.5 text-right text-emerald-700 font-black">-{item.sales}</td>
                          <td className="p-2 text-center">
                            <input
                              type="number"
                              min="0"
                              value={brk}
                              onChange={e => handleBreakageChange(item.productId, e.target.value)}
                              className="w-16 bg-white border border-slate-300 rounded px-2 py-1 text-center text-slate-900 font-bold focus:outline-none focus:border-blue-500"
                            />
                          </td>
                          <td className="p-2.5 text-right font-black text-slate-800">
                            {item.opening + item.inward - item.sales - brk}
                          </td>
                          <td className="p-2 text-center">
                            <input
                              type="number"
                              min="0"
                              value={phys}
                              onChange={e => handlePhysicalChange(item.productId, e.target.value)}
                              className={`w-20 bg-white border-2 rounded px-2 py-1 text-center font-black focus:outline-none ${
                                phys !== (item.opening + item.inward - item.sales - brk)
                                  ? 'border-rose-500 text-rose-700 bg-rose-50'
                                  : 'border-slate-300 text-slate-900 focus:border-emerald-500'
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
              <h4 className="text-sm font-extrabold text-slate-800">
                Step 3: Discrepancy Reconciliation & Manager Sign-off
              </h4>

              {discrepanciesFound > 0 ? (
                <div className="p-4 bg-rose-50 border-2 border-rose-300 rounded-xl flex items-start gap-3 text-rose-900 shadow-xs">
                  <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5 text-rose-600" />
                  <div>
                    <div className="font-black text-sm text-rose-900">
                      Stock Discrepancy Detected ({discrepanciesFound} items mismatched)
                    </div>
                    <div className="text-xs text-rose-700 mt-1">
                      Physical counter count differs from registered sales & receipt balance. This variance will be reported in statutory Form DSR-3.
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-4 bg-emerald-50 border-2 border-emerald-300 rounded-xl flex items-start gap-3 text-emerald-900 shadow-xs">
                  <ShieldCheck className="w-5 h-5 flex-shrink-0 mt-0.5 text-emerald-600" />
                  <div>
                    <div className="font-black text-sm text-emerald-900">
                      Zero Discrepancy — 100% Verified Balance
                    </div>
                    <div className="text-xs text-emerald-700 mt-1">
                      Physical count perfectly matches calculated ledger balance. Ready for e-Abgari daily return filing.
                    </div>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Responsible Manager / Licensee Sign-off:
                </label>
                <input
                  type="text"
                  value={closedBy}
                  onChange={e => setClosedBy(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-sm text-slate-900 font-bold focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>
          )}
        </div>

        {/* Wizard Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <button
            onClick={() => {
              if (step > 1) setStep(step - 1);
              else onClose();
            }}
            className="px-4 py-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-xl text-xs font-bold flex items-center gap-1 cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>{step === 1 ? 'Cancel' : 'Previous Step'}</span>
          </button>

          {step < 3 ? (
            <button
              onClick={() => setStep(step + 1)}
              className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black flex items-center gap-1 shadow-md cursor-pointer"
            >
              <span>Next Step</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black flex items-center gap-2 shadow-lg cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{isSubmitting ? 'Locking Day-Close...' : 'Finalize & Lock Day Close'}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
