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
  MapPin,
  Calendar
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

  const navItems = [
    {
      id: 'pos' as const,
      num: '1',
      title: 'Counter Billing',
      subtitle: 'Fast Checkout [F1]',
      icon: ShoppingCart,
      hotkey: 'F1',
      activeColor: 'bg-emerald-600 text-white shadow-md border-emerald-700 ring-2 ring-emerald-500/20',
      inactiveColor: 'bg-white text-slate-800 hover:bg-emerald-50 hover:text-emerald-700 border-slate-300 hover:border-emerald-300'
    },
    {
      id: 'ledger' as const,
      num: '2',
      title: 'Stock Register',
      subtitle: 'Daily DSR [F9]',
      icon: FileSpreadsheet,
      hotkey: 'F9',
      activeColor: 'bg-teal-700 text-white shadow-md border-teal-800 ring-2 ring-teal-500/20',
      inactiveColor: 'bg-white text-slate-800 hover:bg-teal-50 hover:text-teal-700 border-slate-300 hover:border-teal-300'
    },
    {
      id: 'challan' as const,
      num: '3',
      title: 'Inward Challan',
      subtitle: 'Receive Stock [F8]',
      icon: PackagePlus,
      hotkey: 'F8',
      activeColor: 'bg-amber-600 text-white shadow-md border-amber-700 ring-2 ring-amber-500/20',
      inactiveColor: 'bg-white text-slate-800 hover:bg-amber-50 hover:text-amber-700 border-slate-300 hover:border-amber-300'
    },
    {
      id: 'compliance' as const,
      num: '4',
      title: 'e-Abgari Returns',
      subtitle: 'Excise Portal [F10]',
      icon: ShieldCheck,
      hotkey: 'F10',
      activeColor: 'bg-indigo-600 text-white shadow-md border-indigo-700 ring-2 ring-indigo-500/20',
      inactiveColor: 'bg-white text-slate-800 hover:bg-indigo-50 hover:text-indigo-700 border-slate-300 hover:border-indigo-300'
    },
    {
      id: 'settings' as const,
      num: '⚙',
      title: 'Shop Settings',
      subtitle: 'Printer & Config',
      icon: Settings,
      hotkey: 'Esc',
      activeColor: 'bg-slate-800 text-white shadow-md border-slate-900',
      inactiveColor: 'bg-white text-slate-700 hover:bg-slate-100 border-slate-300'
    }
  ];

  return (
    <header className="bg-white border-b-2 border-slate-200 select-none shadow-sm flex flex-col z-20">
      {/* Top Identity & Quick Utility Strip */}
      <div className="px-4 py-2 flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 bg-white">
        {/* Shop Name & Krishnanagar, Nadia Location */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-600 flex items-center justify-center text-white font-black text-xl shadow-sm">
            FL
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-black tracking-tight text-slate-900 uppercase">
                {shopSettings?.shop_name || 'KRISHNANAGAR FL OFF SHOP'}
              </h1>
              <span className="text-xs font-bold text-emerald-800 bg-emerald-50 border border-emerald-300 px-2 py-0.5 rounded-full flex items-center gap-1">
                <MapPin className="w-3 h-3 text-emerald-600" />
                <span>Krishnanagar, Nadia (WB)</span>
              </span>
            </div>
            <div className="text-[11px] text-slate-600 flex items-center gap-2 mt-0.5 font-medium">
              <span className="font-mono text-slate-800 font-bold">License: {shopSettings?.license_no || 'WB/EX/FL/NAD-KRN/0188/2024-25'}</span>
              <span>•</span>
              <span className="text-emerald-800 font-mono font-bold">WBSBCL Code: {shopSettings?.retailer_code || 'WBSBCL-NAD-4102'}</span>
            </div>
          </div>
        </div>

        {/* Right Info: 1-Click Refresh, Printer, and Live Big Clock */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Quick Refresh Catalog */}
          <button 
            onClick={onSyncCatalog}
            title="Refresh product catalog from local database"
            className="flex items-center gap-1.5 bg-slate-50 hover:bg-emerald-50 hover:border-emerald-300 px-3 py-1.5 rounded-xl border border-slate-300 text-xs font-bold text-slate-800 transition-colors shadow-sm cursor-pointer"
          >
            <Database className="w-4 h-4 text-emerald-600" />
            <span>{cachedProductCount} SKUs Loaded</span>
            <RefreshCw className="w-3.5 h-3.5 text-slate-500" />
          </button>

          {/* 80mm Printer Quick Button */}
          <button
            onClick={onOpenPrinterConfig}
            className="flex items-center gap-1.5 bg-slate-50 hover:bg-blue-50 hover:border-blue-300 px-3 py-1.5 rounded-xl border border-slate-300 text-xs font-bold text-slate-800 transition-colors shadow-sm cursor-pointer"
            title="80mm Thermal Receipt Printer Setup"
          >
            <Printer className="w-4 h-4 text-blue-600" />
            <span>80mm Printer</span>
          </button>

          {/* Big Live Clock */}
          <div className="border-l-2 border-slate-200 pl-3 text-right">
            <div className="text-base font-mono font-black text-slate-900 flex items-center justify-end gap-1.5 tabular-nums">
              <Clock className="w-4 h-4 text-emerald-600" />
              <span>{timeStr}</span>
            </div>
            <div className="text-[11px] text-slate-500 font-semibold flex items-center justify-end gap-1">
              <Calendar className="w-3 h-3 text-slate-400" />
              <span>{dateStr}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Mode Navigation Bar - Extra Large, High Contrast & Worker Friendly */}
      <nav className="px-3 py-2 bg-slate-100 border-t border-slate-200 flex items-center gap-2 overflow-x-auto">
        {navItems.map(item => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`flex-1 min-w-[170px] flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl border-2 font-sans transition-all pos-btn-press cursor-pointer ${
                isActive ? item.activeColor : item.inactiveColor
              }`}
            >
              {/* Big Number Badge */}
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-black text-sm flex-shrink-0 ${
                isActive ? 'bg-white/25 text-white' : 'bg-slate-100 text-slate-800 border border-slate-300'
              }`}>
                {item.num}
              </div>

              {/* Title & Subtitle */}
              <div className="text-left flex-1 min-w-0">
                <div className="text-xs sm:text-sm font-black leading-tight truncate">
                  {item.title}
                </div>
                <div className={`text-[10px] font-bold leading-none mt-0.5 truncate ${
                  isActive ? 'text-white/90' : 'text-slate-500'
                }`}>
                  {item.subtitle}
                </div>
              </div>

              {/* Hotkey Tag */}
              <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded font-black flex-shrink-0 ${
                isActive ? 'bg-black/25 text-white' : 'bg-slate-100 text-slate-700 border border-slate-300'
              }`}>
                {item.hotkey}
              </span>
            </button>
          );
        })}
      </nav>
    </header>
  );
};
