import React from 'react';

interface HotkeyBarProps {
  onF1: () => void;
  onF2: () => void;
  onF3: () => void;
  onF4: () => void;
  onF8: () => void;
  onF9: () => void;
  onF10: () => void;
  onEscape: () => void;
}

export const HotkeyBar: React.FC<HotkeyBarProps> = ({
  onF1,
  onF2,
  onF3,
  onF4,
  onF8,
  onF9,
  onF10,
  onEscape
}) => {
  const hotkeys = [
    { key: 'F1', label: 'Catalog Search', action: onF1, color: 'border-cyan-500/50 text-cyan-300' },
    { key: 'F2', label: 'Cash Payment', action: onF2, color: 'border-emerald-500/50 text-emerald-300' },
    { key: 'F3', label: 'UPI / QR', action: onF3, color: 'border-blue-500/50 text-blue-300' },
    { key: 'F4', label: 'Print & New', action: onF4, color: 'border-purple-500/50 text-purple-300' },
    { key: 'F8', label: 'Inward Challan', action: onF8, color: 'border-amber-500/50 text-amber-300' },
    { key: 'F9', label: 'Day Close (EOD)', action: onF9, color: 'border-rose-500/50 text-rose-300' },
    { key: 'F10', label: 'e-Abgari Portal', action: onF10, color: 'border-emerald-500/50 text-emerald-300' },
    { key: 'Esc', label: 'Clear / Cancel', action: onEscape, color: 'border-slate-600 text-slate-300' },
  ];

  return (
    <footer className="bg-slate-950 border-t border-slate-800/80 px-3 py-2 text-xs flex items-center justify-between gap-2 overflow-x-auto select-none">
      <div className="flex items-center gap-1.5 flex-wrap">
        {hotkeys.map(hk => (
          <button
            key={hk.key}
            onClick={hk.action}
            className={`flex items-center gap-1.5 px-2.5 py-1 bg-slate-900 hover:bg-slate-800 rounded border ${hk.color} font-mono transition-colors active:scale-95`}
          >
            <span className="font-bold bg-black/40 px-1 py-0.5 rounded text-[11px] shadow-inner">
              {hk.key}
            </span>
            <span className="font-sans font-medium text-[11px] text-slate-200">
              {hk.label}
            </span>
          </button>
        ))}
      </div>

      <div className="hidden lg:flex items-center gap-3 text-[11px] text-slate-400 font-mono">
        <span>[+] / [-] Qty</span>
        <span>•</span>
        <span>[Del] Remove Item</span>
        <span>•</span>
        <span className="text-emerald-400 font-semibold">● Scanner Wedge Active (&lt;40ms)</span>
      </div>
    </footer>
  );
};
