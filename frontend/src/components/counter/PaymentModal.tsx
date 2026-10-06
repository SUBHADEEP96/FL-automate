import React, { useState, useEffect, useRef } from 'react';
import { Banknote, QrCode, CreditCard, X, Check, ArrowRight } from 'lucide-react';
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
      className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4 select-none"
      onClick={onClose}
    >
      <div 
        className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col animate-in fade-in zoom-in-95 duration-150"
        onClick={e => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        {/* Header */}
        <div className="p-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className="text-base font-bold text-white uppercase tracking-wider">
              Settlement & Checkout
            </h3>
            <span className="text-xs font-mono bg-emerald-950 text-emerald-400 border border-emerald-800 px-2 py-0.5 rounded">
              Total: {formatINR(totalAmount)}
            </span>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Mode Switcher */}
        <div className="grid grid-cols-3 gap-1 bg-slate-950 p-2 border-b border-slate-800">
          <button
            onClick={() => {
              setMode('CASH');
              setTimeout(() => cashInputRef.current?.focus(), 50);
            }}
            className={`py-2 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-all ${
              mode === 'CASH'
                ? 'bg-emerald-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Banknote className="w-4 h-4" />
            <span>Cash [F2]</span>
          </button>

          <button
            onClick={() => {
              setMode('UPI');
              setTimeout(() => upiInputRef.current?.focus(), 50);
            }}
            className={`py-2 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-all ${
              mode === 'UPI'
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <QrCode className="w-4 h-4" />
            <span>UPI / QR [F3]</span>
          </button>

          <button
            onClick={() => setMode('CARD')}
            className={`py-2 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-all ${
              mode === 'CARD'
                ? 'bg-purple-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <CreditCard className="w-4 h-4" />
            <span>Card POS</span>
          </button>
        </div>

        {/* Body Content */}
        <div className="p-6">
          {mode === 'CASH' && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">
                  Cash Tendered (₹)
                </label>
                <input
                  ref={cashInputRef}
                  type="number"
                  step="any"
                  value={tenderedStr}
                  onChange={e => setTenderedStr(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-2xl font-mono font-bold text-white focus:outline-none focus:border-emerald-500 tabular-nums"
                  placeholder="0.00"
                />
              </div>

              {/* Quick Denominations */}
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={handleSetExact}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-emerald-400 border border-slate-700 rounded-lg text-xs font-mono font-bold"
                >
                  Exact ({formatINR(totalAmount)})
                </button>
                {[100, 200, 500, 2000].map(val => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => handleDenominationAdd(val)}
                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg text-xs font-mono font-semibold"
                  >
                    +₹{val}
                  </button>
                ))}
              </div>

              {/* Balance / Change Calculation Display */}
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 flex items-center justify-between">
                <div>
                  <div className="text-xs text-slate-400">Change to Return:</div>
                  <div className={`text-2xl font-mono font-bold tabular-nums ${
                    isCashSufficient ? 'text-amber-400' : 'text-rose-400'
                  }`}>
                    {isCashSufficient ? formatINR(change) : 'Short of ' + formatINR(totalAmount - tendered)}
                  </div>
                </div>
                <div className="text-right text-xs text-slate-500 font-mono">
                  <div>Net: {formatINR(totalAmount)}</div>
                  <div>Tendered: {formatINR(tendered)}</div>
                </div>
              </div>
            </div>
          )}

          {mode === 'UPI' && (
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="p-3 bg-white rounded-xl shadow-lg border-2 border-blue-500 inline-block">
                {/* Visual SVG QR Code for Counter UPI */}
                <svg className="w-36 h-36" viewBox="0 0 100 100">
                  <path d="M0,0 h30 v30 h-30 z M40,0 h20 v10 h-20 z M70,0 h30 v30 h-30 z M10,10 h10 v10 h-10 z M80,10 h10 v10 h-10 z M0,40 h10 v20 h-10 z M20,40 h20 v10 h-20 z M50,30 h20 v30 h-20 z M80,40 h20 v20 h-20 z M0,70 h30 v30 h-30 z M10,80 h10 v10 h-10 z M40,70 h30 v10 h-30 z M40,90 h10 v10 h-10 z M60,90 h20 v10 h-20 z M90,80 h10 v20 h-10 z" fill="#0f172a" />
                </svg>
              </div>

              <div>
                <div className="text-xs text-slate-400">Scan via Any UPI App (GPay, PhonePe, Paytm)</div>
                <div className="text-sm font-mono font-bold text-blue-400 mt-0.5">
                  wbsbcl.ret8912@icici
                </div>
              </div>

              <div className="w-full text-left">
                <label className="block text-xs font-medium text-slate-400 mb-1">
                  UPI UTR / Reference No. (Optional)
                </label>
                <input
                  ref={upiInputRef}
                  type="text"
                  value={upiRef}
                  onChange={e => setUpiRef(e.target.value)}
                  placeholder="e.g. 42918820194"
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-blue-400"
                />
              </div>
            </div>
          )}

          {mode === 'CARD' && (
            <div className="space-y-4">
              <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 text-center">
                <CreditCard className="w-10 h-10 text-purple-400 mx-auto mb-2" />
                <div className="text-sm font-bold text-white">Swipe or Tap on Retail Counter POS Machine</div>
                <div className="text-xs text-slate-400 mt-1">Amount: {formatINR(totalAmount)}</div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">
                  Card Authorization / Invoice Ref
                </label>
                <input
                  type="text"
                  placeholder="e.g. TXN-CARD-99120"
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-purple-400"
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-slate-950 border-t border-slate-800 flex items-center justify-between">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-mono"
          >
            [Esc] Cancel
          </button>

          <button
            onClick={() => handleSubmit()}
            disabled={mode === 'CASH' && !isCashSufficient}
            className={`px-6 py-2.5 rounded-lg text-sm font-bold flex items-center gap-2 transition-all ${
              mode === 'CASH' && !isCashSufficient
                ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-950 active:scale-95'
            }`}
          >
            <span>Confirm & Print Bill</span>
            <span className="font-mono text-xs opacity-75 bg-black/30 px-1.5 py-0.5 rounded">Enter</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
