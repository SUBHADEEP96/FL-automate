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
  Clock
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
  lastSyncTime,
  onOpenPrinterConfig
}) => {
  const [timeStr, setTimeStr] = useState<string>('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTimeStr(now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true }));
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="bg-slate-950 border-b border-slate-800 text-slate-100 px-4 py-2.5 flex flex-wrap items-center justify-between gap-4 select-none">
      {/* Brand & License Block */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-emerald-600/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 font-black text-xl tracking-wider">
          WB
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-base font-bold tracking-tight text-white uppercase">
              {shopSettings?.shop_name || 'NEW SHYAMBAZAR FL OFF SHOP'}
            </h1>
            <span className="text-[10px] font-semibold bg-emerald-950 text-emerald-400 border border-emerald-700/60 px-1.5 py-0.5 rounded">
              FL OFF-SHOP
            </span>
          </div>
          <div className="text-xs text-slate-400 flex items-center gap-2">
            <span className="font-mono text-slate-300">LIC: {shopSettings?.license_no || 'WB/EX/FL/KOL-NORTH/0492/2024-25'}</span>
            <span>•</span>
            <span className="text-emerald-400 font-mono">CODE: {shopSettings?.retailer_code || 'WBSBCL-8912'}</span>
          </div>
        </div>
      </div>

      {/* Primary Navigation Tabs */}
      <nav className="flex items-center gap-1.5 bg-slate-900/90 p-1 rounded-lg border border-slate-800">
        <button
          onClick={() => setActiveTab('pos')}
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-md text-xs font-semibold transition-all ${
            activeTab === 'pos'
              ? 'bg-emerald-600 text-white shadow-md shadow-emerald-950'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
          }`}
        >
          <ShoppingCart className="w-4 h-4" />
          <span>Counter POS</span>
          <span className="text-[10px] opacity-75 font-mono bg-black/30 px-1 py-0.2 rounded">F1-F4</span>
        </button>

        <button
          onClick={() => setActiveTab('ledger')}
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-md text-xs font-semibold transition-all ${
            activeTab === 'ledger'
              ? 'bg-emerald-600 text-white shadow-md shadow-emerald-950'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
          }`}
        >
          <FileSpreadsheet className="w-4 h-4" />
          <span>DSR Ledger</span>
          <span className="text-[10px] opacity-75 font-mono bg-black/30 px-1 py-0.2 rounded">F9</span>
        </button>

        <button
          onClick={() => setActiveTab('challan')}
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-md text-xs font-semibold transition-all ${
            activeTab === 'challan'
              ? 'bg-emerald-600 text-white shadow-md shadow-emerald-950'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
          }`}
        >
          <PackagePlus className="w-4 h-4" />
          <span>Inward Challan</span>
          <span className="text-[10px] opacity-75 font-mono bg-black/30 px-1 py-0.2 rounded">F8</span>
        </button>

        <button
          onClick={() => setActiveTab('compliance')}
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-md text-xs font-semibold transition-all ${
            activeTab === 'compliance'
              ? 'bg-emerald-600 text-white shadow-md shadow-emerald-950'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
          }`}
        >
          <ShieldCheck className="w-4 h-4" />
          <span>e-Abgari / WBSBCL</span>
          <span className="text-[10px] opacity-75 font-mono bg-black/30 px-1 py-0.2 rounded">F10</span>
        </button>

        <button
          onClick={() => setActiveTab('settings')}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-semibold transition-all ${
            activeTab === 'settings'
              ? 'bg-emerald-600 text-white'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
          }`}
          title="Store Settings & Credentials"
        >
          <Settings className="w-4 h-4" />
        </button>
      </nav>

      {/* Right Utility Bar: Offline Dexie status, Printer status, Clock */}
      <div className="flex items-center gap-3">
        {/* Dexie Sync Indicator */}
        <div 
          onClick={onSyncCatalog}
          title="Click to sync local IndexedDB Dexie cache from SQLite Master"
          className="flex items-center gap-2 bg-slate-900 px-2.5 py-1 rounded border border-slate-800 cursor-pointer hover:border-slate-700 text-xs"
        >
          <Database className="w-3.5 h-3.5 text-emerald-400" />
          <span className="text-slate-300 font-mono">{cachedProductCount} SKUs</span>
          <RefreshCw className="w-3 h-3 text-slate-500 hover:text-emerald-400" />
        </div>

        {/* Printer Quick Trigger */}
        <button
          onClick={onOpenPrinterConfig}
          title="Thermal Printer Status & Config"
          className="p-1.5 bg-slate-900 text-slate-300 hover:text-white rounded border border-slate-800 hover:border-slate-700 text-xs flex items-center gap-1.5"
        >
          <Printer className="w-3.5 h-3.5 text-cyan-400" />
          <span className="hidden sm:inline font-mono text-[11px]">80mm ESC/POS</span>
        </button>

        {/* Live Clock & Counter Operator */}
        <div className="flex items-center gap-2 border-l border-slate-800 pl-3">
          <div className="text-right">
            <div className="text-xs font-mono font-bold text-amber-400 flex items-center justify-end gap-1">
              <Clock className="w-3 h-3" />
              {timeStr}
            </div>
            <div className="text-[10px] text-slate-400">COUNTER_01 (S. Banerjee)</div>
          </div>
        </div>
      </div>
    </header>
  );
};
