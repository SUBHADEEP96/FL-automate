import React, { useState, useEffect, useRef } from 'react';
import { Banknote, QrCode, CreditCard, X, ArrowRight } from 'lucide-react';
import { PaymentMode } from '../../types';
import { formatINR } from '../../utils/exciseCalc';

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  totalAmount: number;
  initialMode: PaymentMode;
  onConfirmPayment: (data: {
    paymentMode: PaymentMode;
    cashTendered: number;
    changeReturned: number;
    upiRefNo?: string;
  }) => void;
}

export const PaymentModal: React.FC<PaymentModalProps> = ({
  isOpen,
  onClose,
  totalAmount,
  initialMode = 'CASH',
  onConfirmPayment
}) => {
  const [mode, setMode] = useState<PaymentMode>(initialMode);
  const [tenderedStr, setTenderedStr] = useState<string>('');
  const [upiRef, setUpiRef] = useState<string>('');
  const cashInputRef = useRef<HTMLInputElement>(null);
  const upiInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setMode(initialMode);
      setTenderedStr(String(Math.ceil(totalAmount)));
      setUpiRef('');
      setTimeout(() => {
        if (initialMode === 'CASH') {
          cashInputRef.current?.focus();
          cashInputRef.current?.select();
        } else {
          upiInputRef.current?.focus();
        }
      }, 60);
    }
  }, [isOpen, initialMode, totalAmount]);

  const tendered = Number(tenderedStr) || 0;
  const change = Math.max(0, tendered - totalAmount);
  const isCashSufficient = tendered >= totalAmount;

  const handleDenominationAdd = (denom: number) => {
    setTenderedStr(prev => String((Number(prev) || 0) + denom));
  };

  const handleSetExact = () => {
    setTenderedStr(String(totalAmount));
  };

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (mode === 'CASH' && !isCashSufficient) {
      return;
    }
    onConfirmPayment({
      paymentMode: mode,
      cashTendered: mode === 'CASH' ? tendered : totalAmount,
      changeReturned: mode === 'CASH' ? change : 0,
      upiRefNo: mode === 'UPI' ? (upiRef || `UPI-${Date.now().toString().slice(-6)}`) : undefined
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    } else if (e.key === 'Enter') {
      e.preventDefault();
      handleSubmit();
    } else if (e.key === 'F2') {
      e.preventDefault();
      setMode('CASH');
    } else if (e.key === 'F3') {
      e.preventDefault();
      setMode('UPI');
    }
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 select-none"
      onClick={onClose}
    >
      <div 
        className="bg-white border border-slate-200 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col animate-in fade-in zoom-in-95 duration-150"
        onClick={e => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        {/* Header */}
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h3 className="text-base font-black text-slate-900 uppercase tracking-wider">
              Payment Settlement
            </h3>
            <span className="text-xs text-slate-500 font-medium">
              Krishnanagar Counter POS
            </span>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-200 cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Big Total Header */}
        <div className="bg-emerald-50/70 p-4 border-b border-slate-200 flex items-center justify-between">
          <span className="text-sm font-black text-emerald-900">TOTAL AMOUNT:</span>
          <span className="text-3xl font-mono font-black text-emerald-700 tabular-nums">
            {formatINR(totalAmount)}
          </span>
        </div>

        {/* Mode Switcher - Big & Tactile */}
        <div className="grid grid-cols-2 gap-2 bg-slate-100 p-2 border-b border-slate-200">
          <button
            onClick={() => {
              setMode('CASH');
              setTimeout(() => cashInputRef.current?.focus(), 50);
            }}
            className={`py-3.5 px-3 rounded-xl text-xs font-black flex items-center justify-center gap-2 transition-all pos-btn-press cursor-pointer ${
              mode === 'CASH'
                ? 'bg-emerald-600 text-white shadow-md'
                : 'bg-white text-slate-700 hover:bg-slate-50 border border-slate-200'
            }`}
          >
            <Banknote className="w-5 h-5" />
            <span>CASH PAYMENT [F2]</span>
          </button>

          <button
            onClick={() => {
              setMode('UPI');
              setTimeout(() => upiInputRef.current?.focus(), 50);
            }}
            className={`py-3.5 px-3 rounded-xl text-xs font-black flex items-center justify-center gap-2 transition-all pos-btn-press cursor-pointer ${
              mode === 'UPI'
                ? 'bg-blue-600 text-white shadow-md'
                : 'bg-white text-slate-700 hover:bg-slate-50 border border-slate-200'
            }`}
          >
            <QrCode className="w-5 h-5" />
            <span>ONLINE UPI / QR [F3]</span>
          </button>
        </div>

        {/* Body Content */}
        <div className="p-6">
          {mode === 'CASH' && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-black text-slate-800 uppercase tracking-wider mb-1.5">
                  Cash Received from Customer:
                </label>
                <input
                  ref={cashInputRef}
                  type="number"
                  step="any"
                  value={tenderedStr}
                  onChange={e => setTenderedStr(e.target.value)}
                  className="w-full bg-white border-2 border-slate-300 focus:border-emerald-600 rounded-2xl px-4 py-3 text-3xl font-mono font-black text-slate-900 focus:outline-none tabular-nums shadow-xs"
                  placeholder="0.00"
                />
              </div>

              {/* Quick Denominations Chips */}
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={handleSetExact}
                  className="px-3.5 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border-2 border-emerald-300 rounded-xl text-xs font-mono font-black pos-btn-press shadow-xs cursor-pointer"
                >
                  Exact (₹{totalAmount})
                </button>
                {[100, 200, 500, 2000].map(val => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => handleDenominationAdd(val)}
                    className="px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-800 border-2 border-slate-200 rounded-xl text-xs font-mono font-bold pos-btn-press shadow-xs cursor-pointer"
                  >
                    +₹{val}
                  </button>
                ))}
              </div>

              {/* Big Change Display */}
              <div className="bg-slate-50 p-4 rounded-2xl border-2 border-slate-200 flex items-center justify-between">
                <div>
                  <div className="text-xs font-black text-slate-600 uppercase tracking-wider">
                    Change to Return:
                  </div>
                  <div className={`text-3xl font-mono font-black tabular-nums mt-1 ${
                    isCashSufficient ? 'text-emerald-700' : 'text-rose-600'
                  }`}>
                    {isCashSufficient ? formatINR(change) : 'Short by ' + formatINR(totalAmount - tendered)}
                  </div>
                </div>
                <div className="text-right text-xs text-slate-500 font-mono font-bold">
                  <div>Bill: {formatINR(totalAmount)}</div>
                  <div>Tendered: {formatINR(tendered)}</div>
                </div>
              </div>
            </div>
          )}

          {mode === 'UPI' && (
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="p-4 bg-white rounded-2xl shadow-md border-4 border-blue-500 inline-block">
                {/* Visual SVG QR Code for Krishnanagar FL Off-Shop */}
                <svg className="w-40 h-40" viewBox="0 0 100 100">
                  <path d="M0,0 h30 v30 h-30 z M40,0 h20 v10 h-20 z M70,0 h30 v30 h-30 z M10,10 h10 v10 h-10 z M80,10 h10 v10 h-10 z M0,40 h10 v20 h-10 z M20,40 h20 v10 h-20 z M50,30 h20 v30 h-20 z M80,40 h20 v20 h-20 z M0,70 h30 v30 h-30 z M10,80 h10 v10 h-10 z M40,70 h30 v10 h-30 z M40,90 h10 v10 h-10 z M60,90 h20 v10 h-20 z M90,80 h10 v10 h-10 z" fill="#0f172a" />
                </svg>
              </div>

              <div>
                <div className="text-xs font-bold text-slate-600">Scan with GPay / PhonePe / Paytm / Any UPI App</div>
                <div className="text-base font-mono font-black text-blue-700 mt-1">
                  krishnanagar.flshop@icici
                </div>
              </div>

              <div className="w-full text-left">
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  UPI UTR / Reference No (Optional)
                </label>
                <input
                  ref={upiInputRef}
                  type="text"
                  value={upiRef}
                  onChange={e => setUpiRef(e.target.value)}
                  placeholder="e.g. 42918820194"
                  className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 font-mono font-bold focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer Confirm Button */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <button
            onClick={onClose}
            className="px-4 py-2.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-xl text-xs font-bold cursor-pointer"
          >
            Cancel [Esc]
          </button>

          <button
            onClick={() => handleSubmit()}
            disabled={mode === 'CASH' && !isCashSufficient}
            className={`px-8 py-3.5 rounded-2xl text-sm font-black flex items-center gap-2 transition-all pos-btn-press ${
              mode === 'CASH' && !isCashSufficient
                ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-600/30 active:scale-95 cursor-pointer'
            }`}
          >
            <span>Complete & Print Receipt [Enter]</span>
            <ArrowRight className="w-4 h-4 ml-1" />
          </button>
        </div>
      </div>
    </div>
  );
};
