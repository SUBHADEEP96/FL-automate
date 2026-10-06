import React from 'react';
import { Plus, Minus, Trash2, ShieldCheck, AlertCircle, QrCode } from 'lucide-react';
import { CartItem } from '../../types';
import { formatINR } from '../../utils/exciseCalc';

interface CartTableProps {
  items: CartItem[];
  selectedIndex: number;
  onSelectItem: (index: number) => void;
  onUpdateQty: (index: number, delta: number) => void;
  onRemoveItem: (index: number) => void;
  onOpenHologramAttach: (index: number) => void;
}

export const CartTable: React.FC<CartTableProps> = ({
  items,
  selectedIndex,
  onSelectItem,
  onUpdateQty,
  onRemoveItem,
  onOpenHologramAttach
}) => {
  if (items.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-slate-900/40 rounded-xl border border-dashed border-slate-800">
        <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mb-4 animate-pulse">
          <QrCode className="w-8 h-8" />
        </div>
        <h3 className="text-base font-bold text-slate-200 uppercase tracking-wide">
          Ready for Barcode or 2D Hologram Sweep
        </h3>
        <p className="text-xs text-slate-400 max-w-md mt-1 mb-4">
          Scan EAN-13 barcode or West Bengal 2D Excise Security Hologram (<span className="text-amber-400 font-mono">WB26...</span>) directly with USB scanner wedge.
        </p>
        <div className="flex items-center gap-2 text-[11px] text-slate-500 font-mono">
          <span>Or press <kbd className="px-1.5 py-0.5 bg-slate-800 text-cyan-400 rounded border border-slate-700">F1</kbd> to search the brand catalog</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-slate-900/60 rounded-xl border border-slate-800">
      <div className="overflow-x-auto flex-1">
        <table className="w-full text-left text-xs text-slate-200 border-collapse select-none">
          <thead className="bg-slate-950/80 sticky top-0 z-10 text-[11px] font-mono text-slate-400 border-b border-slate-800 uppercase tracking-wider">
            <tr>
              <th className="py-2.5 px-3 w-10 text-center">#</th>
              <th className="py-2.5 px-3">Brand & Variety</th>
              <th className="py-2.5 px-2 text-center">Cat</th>
              <th className="py-2.5 px-2 text-right">Pack</th>
              <th className="py-2.5 px-2 text-right">Str %</th>
              <th className="py-2.5 px-3 text-center w-28">Qty</th>
              <th className="py-2.5 px-3 text-right">Rate</th>
              <th className="py-2.5 px-2 text-right">BL</th>
              <th className="py-2.5 px-2 text-right">LPL</th>
              <th className="py-2.5 px-3 text-right">Total</th>
              <th className="py-2.5 px-3 text-center">2D Hologram</th>
              <th className="py-2.5 px-2 w-10 text-center"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 font-sans">
            {items.map((item, idx) => {
              const isSelected = selectedIndex === idx;
              const hologramsNeeded = item.qty;
              const hologramsAttached = item.scannedHolograms.length;
              const isHologramComplete = hologramsAttached >= hologramsNeeded;

              return (
                <tr
                  key={`${item.productId}-${idx}`}
                  onClick={() => onSelectItem(idx)}
                  className={`cursor-pointer transition-colors ${
                    isSelected
                      ? 'bg-slate-800/90 ring-1 ring-emerald-500/60'
                      : 'hover:bg-slate-800/40'
                  }`}
                >
                  <td className="py-2.5 px-3 text-center font-mono text-slate-500">
                    {idx + 1}
                  </td>
                  <td className="py-2.5 px-3">
                    <div className="font-semibold text-slate-100 flex items-center gap-1.5">
                      <span>{item.name}</span>
                    </div>
                    <div className="text-[10px] text-slate-400 font-mono">
                      {item.code}
                    </div>
                  </td>
                  <td className="py-2.5 px-2 text-center">
                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                      item.category === 'IMFL' ? 'bg-amber-950/80 text-amber-300 border border-amber-800/50' :
                      item.category === 'Beer' ? 'bg-yellow-950/80 text-yellow-300 border border-yellow-800/50' :
                      item.category === 'Wine' ? 'bg-rose-950/80 text-rose-300 border border-rose-800/50' :
                      'bg-purple-950/80 text-purple-300 border border-purple-800/50'
                    }`}>
                      {item.category}
                    </span>
                  </td>
                  <td className="py-2.5 px-2 text-right font-mono text-slate-300">
                    {item.packSizeMl}ml
                  </td>
                  <td className="py-2.5 px-2 text-right font-mono text-slate-400">
                    {item.strengthPct}%
                  </td>
                  <td className="py-2.5 px-3 text-center" onClick={e => e.stopPropagation()}>
                    <div className="inline-flex items-center gap-1.5 bg-slate-950 px-2 py-0.5 rounded-md border border-slate-700">
                      <button
                        onClick={() => onUpdateQty(idx, -1)}
                        className="text-slate-400 hover:text-white p-0.5 hover:bg-slate-800 rounded transition-colors"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="font-mono font-bold text-sm text-emerald-400 w-6 text-center tabular-nums">
                        {item.qty}
                      </span>
                      <button
                        onClick={() => onUpdateQty(idx, 1)}
                        className="text-slate-400 hover:text-white p-0.5 hover:bg-slate-800 rounded transition-colors"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono font-medium text-slate-200">
                    {formatINR(item.rate)}
                  </td>
                  <td className="py-2.5 px-2 text-right font-mono text-slate-400 text-[11px]">
                    {item.bulkLitres.toFixed(3)}
                  </td>
                  <td className="py-2.5 px-2 text-right font-mono text-slate-400 text-[11px]">
                    {item.londonProofLitres.toFixed(3)}
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-400 text-sm">
                    {formatINR(item.qty * item.rate)}
                  </td>
                  <td className="py-2.5 px-3 text-center" onClick={e => e.stopPropagation()}>
                    <button
                      onClick={() => onOpenHologramAttach(idx)}
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-mono border transition-all ${
                        isHologramComplete
                          ? 'bg-emerald-950/60 text-emerald-300 border-emerald-700/60 hover:bg-emerald-900/60'
                          : 'bg-amber-950/60 text-amber-300 border-amber-700/60 hover:bg-amber-900/60 animate-pulse'
                      }`}
                      title={item.scannedHolograms.join(', ') || 'Click to link 2D hologram serials'}
                    >
                      {isHologramComplete ? (
                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                      ) : (
                        <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
                      )}
                      <span>{hologramsAttached}/{hologramsNeeded}</span>
                    </button>
                  </td>
                  <td className="py-2.5 px-2 text-center" onClick={e => e.stopPropagation()}>
                    <button
                      onClick={() => onRemoveItem(idx)}
                      className="text-slate-500 hover:text-rose-400 p-1 hover:bg-rose-950/40 rounded transition-colors"
                      title="Remove Item (Delete)"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
