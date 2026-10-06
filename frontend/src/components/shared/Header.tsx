import React, { useState, useEffect } from 'react';
import { 
  ShoppingCart, 
  FileSpreadsheet, 
  PackagePlus, 
  ShieldCheck, 
  Settings, 
  RefreshCw, 
  Database,
  Printer,
  Clock,
  MapPin
} from 'lucide-react';
import { ShopSettings } from '../../types';

interface HeaderProps {
  activeTab: 'pos' | 'ledger' | 'challan' | 'compliance' | 'settings';
  setActiveTab: (tab: 'pos' | 'ledger' | 'challan' | 'compliance' | 'settings') => void;
  shopSettings?: ShopSettings | null;
  onSyncCatalog: () => void;
  cachedProductCount: number;
  lastSyncTime: string;
  onOpenPrinterConfig: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  shopSettings,
  onSyncCatalog,
  cachedProductCount,
  onOpenPrinterConfig
}) => {
  const [timeStr, setTimeStr] = useState<string>('');
  const [dateStr, setDateStr] = useState<string>('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTimeStr(now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true }));
      setDateStr(now.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }));
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="bg-slate-900 border-b border-slate-800 text-slate-100 px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 select-none shadow-md">
      {/* Store Identity: Krishnanagar, Nadia */}
      <div className="flex items-center gap-3">
        <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-700 flex items-center justify-center text-slate-950 font-black text-xl shadow-md shadow-emerald-950/40">
          FL
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-base font-extrabold tracking-tight text-white uppercase">
              {shopSettings?.shop_name || 'KRISHNANAGAR FL OFF SHOP'}
            </h1>
            <span className="text-[11px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-full flex items-center gap-1">
              <MapPin className="w-3 h-3" />
              <span>Nadia, WB</span>
            </span>
          </div>
          <div className="text-xs text-slate-400 flex items-center gap-2 mt-0.5">
            <span className="font-mono text-slate-300">Lic: {shopSettings?.license_no || 'WB/EX/FL/NAD-KRN/0188/2024-25'}</span>
            <span>•</span>
            <span className="text-emerald-400 font-mono font-medium">Retailer: {shopSettings?.retailer_code || 'WBSBCL-NAD-4102'}</span>
          </div>
        </div>
      </div>

      {/* Navigation Tabs - Large, Clear & Touch/Click Friendly */}
      <nav className="flex items-center gap-1.5 bg-slate-950/80 p-1.5 rounded-xl border border-slate-800">
        <button
          onClick={() => setActiveTab('pos')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all pos-btn-press ${
            activeTab === 'pos'
              ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-950/60'
              : 'text-slate-300 hover:text-white hover:bg-slate-800/80'
          }`}
        >
          <ShoppingCart className="w-4 h-4 text-emerald-300" />
          <span>Billing Counter</span>
          <span className="text-[10px] font-mono bg-black/30 px-1.5 py-0.5 rounded text-emerald-200">F1</span>
        </button>

        <button
          onClick={() => setActiveTab('ledger')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all pos-btn-press ${
            activeTab === 'ledger'
              ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-950/60'
              : 'text-slate-300 hover:text-white hover:bg-slate-800/80'
          }`}
        >
          <FileSpreadsheet className="w-4 h-4 text-cyan-300" />
          <span>Stock Register (DSR)</span>
          <span className="text-[10px] font-mono bg-black/30 px-1.5 py-0.5 rounded text-cyan-200">F9</span>
        </button>

        <button
          onClick={() => setActiveTab('challan')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all pos-btn-press ${
            activeTab === 'challan'
              ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-950/60'
              : 'text-slate-300 hover:text-white hover:bg-slate-800/80'
          }`}
        >
          <PackagePlus className="w-4 h-4 text-amber-300" />
          <span>Inward Stock</span>
          <span className="text-[10px] font-mono bg-black/30 px-1.5 py-0.5 rounded text-amber-200">F8</span>
        </button>

        <button
          onClick={() => setActiveTab('compliance')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all pos-btn-press ${
            activeTab === 'compliance'
              ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-950/60'
              : 'text-slate-300 hover:text-white hover:bg-slate-800/80'
          }`}
        >
          <ShieldCheck className="w-4 h-4 text-purple-300" />
          <span>e-Abgari Returns</span>
          <span className="text-[10px] font-mono bg-black/30 px-1.5 py-0.5 rounded text-purple-200">F10</span>
        </button>

        <button
          onClick={() => setActiveTab('settings')}
          className={`p-2 rounded-lg text-xs font-bold transition-all ${
            activeTab === 'settings'
              ? 'bg-emerald-600 text-white'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
          title="Store Settings & Printer Config"
        >
          <Settings className="w-4 h-4" />
        </button>
      </nav>

      {/* Right Information Bar */}
      <div className="flex items-center gap-3">
        {/* Catalog Cached Indicator */}
        <div 
          onClick={onSyncCatalog}
          title="Click to refresh local bottle catalog"
          className="flex items-center gap-2 bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-800 cursor-pointer hover:border-slate-700 text-xs font-medium"
        >
          <Database className="w-3.5 h-3.5 text-emerald-400" />
          <span className="text-slate-300 font-mono">{cachedProductCount} Brands</span>
          <RefreshCw className="w-3 h-3 text-slate-500 hover:text-emerald-400" />
        </div>

        {/* Printer Quick Trigger */}
        <button
          onClick={onOpenPrinterConfig}
          className="p-1.5 bg-slate-950 text-slate-300 hover:text-white rounded-lg border border-slate-800 hover:border-slate-700 text-xs flex items-center gap-1.5"
          title="Configure 80mm ESC/POS Thermal Printer"
        >
          <Printer className="w-4 h-4 text-cyan-400" />
          <span className="hidden sm:inline font-mono text-[11px]">80mm Printer</span>
        </button>

        {/* Live Date & Clock for Krishnanagar Counter */}
        <div className="border-l border-slate-800 pl-3 text-right">
          <div className="text-xs font-mono font-bold text-amber-400 flex items-center justify-end gap-1">
            <Clock className="w-3.5 h-3.5" />
            <span>{timeStr}</span>
          </div>
          <div className="text-[11px] text-slate-400 font-sans">{dateStr}</div>
        </div>
      </div>
    </header>
  );
};
