import React from 'react';
import { Printer, X, Download, ShieldCheck, CheckCircle2 } from 'lucide-react';
import { SaleTransaction } from '../../types';
import { formatINR } from '../../utils/exciseCalc';

interface ReceiptPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  sale: SaleTransaction | null;
  onPrintDirect: () => void;
  isPrinting?: boolean;
}

export const ReceiptPreviewModal: React.FC<ReceiptPreviewModalProps> = ({
  isOpen,
  onClose,
  sale,
  onPrintDirect,
  isPrinting = false
}) => {
  if (!isOpen || !sale) return null;

  const totalBottles = sale.items.reduce((sum, item) => sum + item.qty, 0);

  return (
    <div 
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 select-none overflow-y-auto"
      onClick={onClose}
    >
      <div 
        className="bg-white border border-slate-200 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl flex flex-col my-8 animate-in fade-in zoom-in-95 duration-150"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-3.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            <span className="text-sm font-black text-slate-900 uppercase tracking-wider">
              Bill Receipt Generated
            </span>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-200 cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 80mm Thermal Receipt Simulation Container */}
        <div className="p-6 bg-slate-100 flex justify-center">
          <div 
            id="thermal-receipt"
            className="w-[320px] bg-white text-black p-5 shadow-xl rounded-sm font-mono text-[11px] leading-tight border border-slate-300"
          >
            {/* Header */}
            <div className="text-center pb-2 border-b border-black">
              <div className="text-sm font-black tracking-wider uppercase">
                {sale.shop?.shop_name || 'GOVT OF WB EXCISE FL OFF SHOP'}
              </div>
              <div className="text-[10px] font-bold text-slate-800">
                {sale.shop?.licensee_name || 'M/s Ghosh & Banerjee Enterprises'}
              </div>
              <div className="text-[9px]">
                LIC: {sale.shop?.license_no || 'WB/EX/FL/NAD-KRN/0188/2024-25'}
              </div>
              <div className="text-[9px]">
                {sale.shop?.address || 'Krishnanagar, Nadia, West Bengal - 741101'}
              </div>
              {sale.shop?.gstin && (
                <div className="text-[9px]">GSTIN: {sale.shop.gstin}</div>
              )}
            </div>

            {/* Bill Info */}
            <div className="py-2 border-b border-dashed border-black/80 space-y-0.5 text-[10px]">
              <div className="flex justify-between">
                <span>BILL: <strong>{sale.billNo}</strong></span>
                <span>{new Date(sale.createdAt).toLocaleDateString('en-IN')}</span>
              </div>
              <div className="flex justify-between">
                <span>TIME: {new Date(sale.createdAt).toLocaleTimeString('en-IN')}</span>
                <span>MODE: <strong>{sale.paymentMode}</strong></span>
              </div>
              <div className="flex justify-between">
                <span>COUNTER: {sale.cashierId}</span>
                <span>OPR: {sale.cashierName}</span>
              </div>
              {sale.upiRefNo && (
                <div>UPI REF: {sale.upiRefNo}</div>
              )}
            </div>

            {/* Itemized Table */}
            <div className="py-2 border-b border-black">
              <div className="flex justify-between font-bold border-b border-black pb-1 mb-1 text-[10px]">
                <span className="w-7/12">ITEM</span>
                <span className="w-2/12 text-center">QTY</span>
                <span className="w-3/12 text-right">TOTAL</span>
              </div>

              {sale.items.map((it, idx) => (
                <div key={idx} className="mb-1.5">
                  <div className="flex justify-between">
                    <span className="w-7/12 truncate font-semibold">
                      {it.name} ({it.packSizeMl}ml)
                    </span>
                    <span className="w-2/12 text-center font-bold">{it.qty}</span>
                    <span className="w-3/12 text-right font-bold">
                      {(it.qty * it.rate).toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between text-[9px] text-slate-700 pl-1">
                    <span>Rate: ₹{it.rate} | Str: {it.strengthPct}%</span>
                    <span>BL: {it.bulkLitres.toFixed(3)}</span>
                  </div>

                  {/* Scanned Holograms */}
                  {it.scannedHolograms && it.scannedHolograms.length > 0 && (
                    <div className="text-[8px] text-emerald-900 bg-emerald-50 px-1 py-0.5 mt-0.5 rounded border border-emerald-200">
                      <div>✓ WB EXCISE SECURITY SEAL:</div>
                      {it.scannedHolograms.map((sn, sIdx) => (
                        <div key={sIdx} className="font-mono truncate">* {sn}</div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Totals Block */}
            <div className="py-2 border-b border-black space-y-1">
              <div className="flex justify-between text-[10px]">
                <span>TOTAL BOTTLES:</span>
                <span className="font-bold">{totalBottles}</span>
              </div>
              <div className="flex justify-between text-[10px]">
                <span>SUBTOTAL:</span>
                <span>₹{Number(sale.subtotal).toFixed(2)}</span>
              </div>
              {sale.discount > 0 && (
                <div className="flex justify-between text-[10px]">
                  <span>DISCOUNT:</span>
                  <span>-₹{Number(sale.discount).toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between text-sm font-black border-t border-black pt-1">
                <span>NET TOTAL:</span>
                <span>₹{Number(sale.total).toFixed(2)}</span>
              </div>
              {sale.paymentMode === 'CASH' && (
                <div className="flex justify-between text-[9px] text-slate-700">
                  <span>CASH: ₹{Number(sale.cashTendered).toFixed(2)}</span>
                  <span>CHANGE: ₹{Number(sale.changeReturned).toFixed(2)}</span>
                </div>
              )}
            </div>

            {/* Statutory Excise Health Warning */}
            <div className="pt-2 text-center space-y-1">
              <div className="text-[9px] font-bold uppercase tracking-wider text-slate-800">
                STATE EXCISE SECURED INVOICE
              </div>
              <div className="text-[8px] font-bold uppercase text-red-700 border border-red-300 p-1 rounded bg-red-50">
                ALCOHOL CONSUMPTION IS INJURIOUS TO HEALTH.<br/>
                BE SAFE — NEVER DRINK AND DRIVE.
              </div>
              <div className="text-[8px] text-slate-600 mt-1">
                {sale.shop?.footer_message || 'Thank You! Please Visit Again.'}
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <button
              onClick={onPrintDirect}
              disabled={isPrinting}
              className="flex-1 py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-black text-xs flex items-center justify-center gap-2 transition-all shadow-md active:scale-95 cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>{isPrinting ? 'Sending to Printer...' : 'Print Receipt (ESC/POS 80mm)'}</span>
            </button>

            <button
              onClick={() => window.print()}
              className="py-3 px-4 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Browser Standard Print Dialog"
            >
              <span>Browser Print</span>
            </button>
          </div>

          <button
            onClick={onClose}
            className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs rounded-xl flex items-center justify-center gap-1 shadow-sm cursor-pointer"
          >
            <span>Start New Bill [F4 / Esc]</span>
          </button>
        </div>
      </div>
    </div>
  );
};
