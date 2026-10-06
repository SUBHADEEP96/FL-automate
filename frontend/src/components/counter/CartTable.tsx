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
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-white rounded-2xl border-2 border-dashed border-slate-200 m-1 shadow-sm">
        <div className="w-20 h-20 rounded-3xl bg-emerald-50 border-2 border-emerald-200 flex items-center justify-center text-emerald-600 mb-4 shadow-sm">
          <QrCode className="w-10 h-10 animate-pulse" />
        </div>
        <h3 className="text-xl font-extrabold text-slate-900 tracking-tight">
          Barcode Scanner Ready
        </h3>
        <p className="text-sm text-slate-600 max-w-md mt-1.5 mb-6 font-sans leading-relaxed">
          Scan bottle barcode with USB scanner, or tap any brand from the quick picker on the right.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-2.5 bg-slate-50 px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-700">
          <span>Shortcuts:</span>
          <span className="font-mono text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded">F1: Catalog Search</span>
          <span className="font-mono text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded">F2: Cash Pay</span>
          <span className="font-mono text-purple-700 bg-purple-50 border border-purple-200 px-2 py-0.5 rounded">F3: UPI / QR Pay</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-white rounded-2xl border border-slate-200 shadow-sm m-1">
      <div className="overflow-x-auto flex-1">
        <table className="w-full text-left text-sm text-slate-800 border-collapse select-none">
          <thead className="bg-slate-50 sticky top-0 z-10 text-xs font-extrabold text-slate-600 border-b border-slate-200 uppercase tracking-wider">
            <tr>
              <th className="py-3 px-3 w-10 text-center">#</th>
              <th className="py-3 px-3">Brand & Pack Size</th>
              <th className="py-3 px-2 text-center">Category</th>
              <th className="py-3 px-4 text-center w-36">Quantity</th>
              <th className="py-3 px-3 text-right">Rate (₹)</th>
              <th className="py-3 px-4 text-right">Total (₹)</th>
              <th className="py-3 px-3 text-center">Excise Hologram</th>
              <th className="py-3 px-2 w-12 text-center"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 font-sans">
            {items.map((item, idx) => {
              const isSelected = selectedIndex === idx;
              const hologramsNeeded = item.qty;
              const hologramsAttached = item.scannedHolograms.length;
              const isHologramComplete = hologramsAttached >= hologramsNeeded;

              // Size tag
              const sizeLabel = 
                item.packSizeMl === 750 ? '750ml (Quart)' :
                item.packSizeMl === 375 ? '375ml (Pint)' :
                item.packSizeMl === 180 ? '180ml (Nip)' :
                item.packSizeMl === 650 ? '650ml (Beer)' :
                item.packSizeMl === 500 ? '500ml (Can)' :
                `${item.packSizeMl}ml`;

              return (
                <tr
                  key={`${item.productId}-${idx}`}
                  onClick={() => onSelectItem(idx)}
                  className={`cursor-pointer transition-colors ${
                    isSelected
                      ? 'bg-emerald-50/70 ring-2 ring-emerald-500'
                      : 'hover:bg-slate-50'
                  }`}
                >
                  <td className="py-3.5 px-3 text-center font-mono text-slate-400 font-bold">
                    {idx + 1}
                  </td>
                  <td className="py-3.5 px-3">
                    <div className="font-extrabold text-slate-900 text-base">
                      {item.name}
                    </div>
                    <div className="text-xs text-slate-500 font-sans flex items-center gap-2 mt-0.5">
                      <span className="text-blue-700 font-bold bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                        {sizeLabel}
                      </span>
                      <span>•</span>
                      <span className="font-mono text-slate-500 font-medium">SKU: {item.code}</span>
                      <span>•</span>
                      <span className="text-slate-600">{item.strengthPct}% v/v</span>
                    </div>
                  </td>

                  <td className="py-3.5 px-2 text-center">
                    <span className={`px-2.5 py-1 rounded-md text-xs font-black uppercase ${
                      item.category === 'IMFL' ? 'bg-amber-100 text-amber-900 border border-amber-300' :
                      item.category === 'Beer' ? 'bg-yellow-100 text-yellow-900 border border-yellow-300' :
                      item.category === 'Wine' ? 'bg-rose-100 text-rose-900 border border-rose-300' :
                      'bg-purple-100 text-purple-900 border border-purple-300'
                    }`}>
                      {item.category}
                    </span>
                  </td>

                  {/* Large Quantity Stepper */}
                  <td className="py-3.5 px-4 text-center" onClick={e => e.stopPropagation()}>
                    <div className="inline-flex items-center gap-1.5 bg-slate-100 px-2 py-1 rounded-xl border border-slate-300 shadow-sm">
                      <button
                        onClick={() => onUpdateQty(idx, -1)}
                        className="w-8 h-8 rounded-lg bg-white hover:bg-slate-200 text-slate-800 font-bold flex items-center justify-center transition-colors border border-slate-200 pos-btn-press cursor-pointer"
                        title="Reduce quantity"
                      >
                        <Minus className="w-4 h-4 text-slate-700" />
                      </button>
                      <span className="font-mono font-black text-lg text-slate-900 w-8 text-center tabular-nums">
                        {item.qty}
                      </span>
                      <button
                        onClick={() => onUpdateQty(idx, 1)}
                        className="w-8 h-8 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold flex items-center justify-center transition-colors shadow-sm pos-btn-press cursor-pointer"
                        title="Increase quantity"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                  </td>

                  <td className="py-3.5 px-3 text-right font-mono text-slate-700 text-base font-medium">
                    {formatINR(item.rate)}
                  </td>

                  <td className="py-3.5 px-4 text-right font-mono font-black text-emerald-700 text-xl tabular-nums">
                    {formatINR(item.qty * item.rate)}
                  </td>

                  {/* Hologram Link Badge */}
                  <td className="py-3.5 px-3 text-center" onClick={e => e.stopPropagation()}>
                    <button
                      onClick={() => onOpenHologramAttach(idx)}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-sans font-bold border transition-all cursor-pointer ${
                        isHologramComplete
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100'
                          : 'bg-amber-50 text-amber-800 border-amber-300 hover:bg-amber-100 animate-pulse'
                      }`}
                      title={item.scannedHolograms.join(', ') || 'Click to link 2D excise hologram serial'}
                    >
                      {isHologramComplete ? (
                        <>
                          <ShieldCheck className="w-4 h-4 text-emerald-600" />
                          <span>✓ Linked ({hologramsAttached})</span>
                        </>
                      ) : (
                        <>
                          <AlertCircle className="w-4 h-4 text-amber-600" />
                          <span>Link Seal ({hologramsAttached}/{hologramsNeeded})</span>
                        </>
                      )}
                    </button>
                  </td>

                  <td className="py-3.5 px-2 text-center" onClick={e => e.stopPropagation()}>
                    <button
                      onClick={() => onRemoveItem(idx)}
                      className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer"
                      title="Remove Item"
                    >
                      <Trash2 className="w-4 h-4" />
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
