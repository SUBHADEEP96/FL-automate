import React, { useState } from 'react';
import { PackagePlus, X, Plus, Trash2, CheckCircle2 } from 'lucide-react';
import { Product } from '../../types';
import { formatINR } from '../../utils/exciseCalc';

interface InwardChallanModalProps {
  isOpen: boolean;
  onClose: () => void;
  products: Product[];
  onChallanSaved: () => void;
}

interface ChallanItemInput {
  productId: number;
  batchNo: string;
  cases: number;
  bottlesPerCase: number;
  purchaseRate: number;
  mrp: number;
}

export const InwardChallanModal: React.FC<InwardChallanModalProps> = ({
  isOpen,
  onClose,
  products,
  onChallanSaved
}) => {
  const [challanNo, setChallanNo] = useState<string>(`WBSBCL/KOL/2026/CH-${Math.floor(10000 + Math.random() * 90000)}`);
  const [challanDate, setChallanDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [sourceDepot, setSourceDepot] = useState<string>('WBSBCL Central Depot - Cossipore, Kolkata');
  const [vehicleNo, setVehicleNo] = useState<string>('WB-02-AK-4491');
  const [items, setItems] = useState<ChallanItemInput[]>([]);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  if (!isOpen) return null;

  const handleAddItem = () => {
    if (products.length === 0) return;
    const defaultProd = products[0];
    setItems(prev => [
      ...prev,
      {
        productId: defaultProd.id,
        batchNo: `B26-${defaultProd.code.slice(0, 6)}`,
        cases: 5,
        bottlesPerCase: defaultProd.pack_size_ml >= 650 ? 12 : 24,
        purchaseRate: defaultProd.cost_price,
        mrp: defaultProd.mrp
      }
    ]);
  };

  const handleUpdateItem = (idx: number, field: keyof ChallanItemInput, val: any) => {
    setItems(prev => {
      const updated = [...prev];
      const item = { ...updated[idx], [field]: val };

      if (field === 'productId') {
        const prod = products.find(p => p.id === Number(val));
        if (prod) {
          item.purchaseRate = prod.cost_price;
          item.mrp = prod.mrp;
          item.bottlesPerCase = prod.pack_size_ml >= 650 ? 12 : 24;
        }
      }

      updated[idx] = item;
      return updated;
    });
  };

  const handleRemoveItem = (idx: number) => {
    setItems(prev => prev.filter((_, i) => i !== idx));
  };

  const totalCases = items.reduce((sum, it) => sum + (Number(it.cases) || 0), 0);
  const totalBottles = items.reduce((sum, it) => sum + ((Number(it.cases) || 0) * (Number(it.bottlesPerCase) || 0)), 0);
  const totalAmount = items.reduce((sum, it) => sum + ((Number(it.cases) || 0) * (Number(it.bottlesPerCase) || 0) * (Number(it.purchaseRate) || 0)), 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (items.length === 0) {
      alert('Please add at least one line item');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/inventory/challans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          challanNo,
          challanDate,
          sourceDepot,
          vehicleNo,
          items: items.map(it => ({
            productId: it.productId,
            batchNo: it.batchNo,
            cases: it.cases,
            bottlesPerCase: it.bottlesPerCase,
            totalBottles: it.cases * it.bottlesPerCase,
            purchaseRate: it.purchaseRate,
            mrp: it.mrp
          }))
        })
      });

      const json = await res.json();
      if (!json.success) throw new Error(json.error || 'Failed to save challan');

      alert(`✓ Consignment received! ${totalBottles} bottles added to inventory.`);
      onChallanSaved();
      onClose();
    } catch (err: any) {
      alert(`Error saving challan: ${err.message}`);
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
        {/* Header */}
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center font-black">
              <PackagePlus className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900 uppercase tracking-wider">
                Inward Consignment Challan (Receive Depot Stock)
              </h3>
              <div className="text-xs text-slate-500 font-medium">
                Record incoming WBSBCL depot stock into counter inventory
              </div>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-200 cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Challan Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-200 text-xs">
            <div>
              <label className="block text-slate-700 font-bold mb-1">Challan / Invoice No</label>
              <input
                type="text"
                value={challanNo}
                onChange={e => setChallanNo(e.target.value)}
                required
                className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-slate-900 font-mono font-bold focus:outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-slate-700 font-bold mb-1">Challan Date</label>
              <input
                type="date"
                value={challanDate}
                onChange={e => setChallanDate(e.target.value)}
                required
                className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-slate-900 font-medium focus:outline-none focus:border-blue-500 cursor-pointer"
              />
            </div>
            <div>
              <label className="block text-slate-700 font-bold mb-1">Depot Source (WBSBCL)</label>
              <input
                type="text"
                value={sourceDepot}
                onChange={e => setSourceDepot(e.target.value)}
                required
                className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-slate-900 font-medium focus:outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-slate-700 font-bold mb-1">Vehicle No</label>
              <input
                type="text"
                value={vehicleNo}
                onChange={e => setVehicleNo(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-slate-900 font-mono font-bold focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          {/* Items Table */}
          <div className="border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-xs">
            <div className="p-3 bg-slate-50 flex items-center justify-between border-b border-slate-200">
              <span className="text-xs font-black text-slate-800 uppercase tracking-wider">
                Consignment Line Items
              </span>
              <button
                type="button"
                onClick={handleAddItem}
                className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-black rounded-lg text-xs flex items-center gap-1 shadow-sm cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ Add Line Item</span>
              </button>
            </div>

            <div className="max-h-60 overflow-y-auto">
              {items.length === 0 ? (
                <div className="p-8 text-center text-slate-500 text-xs font-medium">
                  No line items added yet. Click "+ Add Line Item" to enter received stock.
                </div>
              ) : (
                <table className="w-full text-left text-xs text-slate-900">
                  <thead className="bg-slate-100 text-slate-700 font-black uppercase border-b border-slate-200">
                    <tr>
                      <th className="p-2.5">Brand / SKU</th>
                      <th className="p-2.5">Batch No</th>
                      <th className="p-2.5 text-center w-20">Cases</th>
                      <th className="p-2.5 text-center w-20">Btls/Case</th>
                      <th className="p-2.5 text-right w-24">Cost (₹)</th>
                      <th className="p-2.5 text-right w-24">MRP (₹)</th>
                      <th className="p-2.5 text-right w-24">Total Bottles</th>
                      <th className="p-2.5 text-center w-10"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-mono">
                    {items.map((it, idx) => (
                      <tr key={idx} className="hover:bg-blue-50/40">
                        <td className="p-2">
                          <select
                            value={it.productId}
                            onChange={e => handleUpdateItem(idx, 'productId', e.target.value)}
                            className="bg-white border border-slate-300 rounded px-2 py-1 text-slate-900 text-xs w-full font-sans font-bold cursor-pointer"
                          >
                            {products.map(p => (
                              <option key={p.id} value={p.id}>
                                {p.name} ({p.pack_size_ml}ml) - ₹{p.mrp}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="p-2">
                          <input
                            type="text"
                            value={it.batchNo}
                            onChange={e => handleUpdateItem(idx, 'batchNo', e.target.value)}
                            className="w-24 bg-white border border-slate-300 rounded px-2 py-1 text-slate-900 font-bold"
                          />
                        </td>
                        <td className="p-2 text-center">
                          <input
                            type="number"
                            min="1"
                            value={it.cases}
                            onChange={e => handleUpdateItem(idx, 'cases', parseInt(e.target.value) || 0)}
                            className="w-16 bg-white border border-slate-300 rounded px-2 py-1 text-center text-slate-900 font-black"
                          />
                        </td>
                        <td className="p-2 text-center">
                          <input
                            type="number"
                            min="1"
                            value={it.bottlesPerCase}
                            onChange={e => handleUpdateItem(idx, 'bottlesPerCase', parseInt(e.target.value) || 0)}
                            className="w-16 bg-white border border-slate-300 rounded px-2 py-1 text-center text-slate-900 font-bold"
                          />
                        </td>
                        <td className="p-2 text-right">
                          <input
                            type="number"
                            step="any"
                            value={it.purchaseRate}
                            onChange={e => handleUpdateItem(idx, 'purchaseRate', parseFloat(e.target.value) || 0)}
                            className="w-20 bg-white border border-slate-300 rounded px-2 py-1 text-right text-slate-900 font-bold"
                          />
                        </td>
                        <td className="p-2 text-right font-black text-slate-800">
                          ₹{it.mrp}
                        </td>
                        <td className="p-2 text-right font-black text-amber-700">
                          {it.cases * it.bottlesPerCase}
                        </td>
                        <td className="p-2 text-center">
                          <button
                            type="button"
                            onClick={() => handleRemoveItem(idx)}
                            className="text-slate-400 hover:text-rose-600 p-1 cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          {/* Totals Summary */}
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-6 text-xs font-mono font-bold">
              <div>
                <span className="text-slate-600">Total Cases: </span>
                <strong className="text-slate-900 text-sm font-black">{totalCases}</strong>
              </div>
              <div>
                <span className="text-slate-600">Total Bottles: </span>
                <strong className="text-amber-700 text-sm font-black">{totalBottles}</strong>
              </div>
              <div>
                <span className="text-slate-600">Invoice Value: </span>
                <strong className="text-emerald-700 text-sm font-black">{formatINR(totalAmount)}</strong>
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting || items.length === 0}
              className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-black text-xs flex items-center gap-2 shadow-md pos-btn-press cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{isSubmitting ? 'Receiving...' : 'Verify & Add to Inventory'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
