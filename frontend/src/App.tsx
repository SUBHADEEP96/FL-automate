import React, { useState, useEffect, useCallback } from 'react';
import { Header } from './components/shared/Header';
import { CashierScreen } from './components/counter/CashierScreen';
import { DailyStockRegister } from './components/ledger/DailyStockRegister';
import { InwardChallanModal } from './components/ledger/InwardChallanModal';
import { ComplianceDashboard } from './components/compliance/ComplianceDashboard';
import { SettingsModal } from './components/compliance/SettingsModal';
import { Product, ShopSettings } from './types';
import { syncCatalogFromBackend } from './db/dexieDb';

export function App() {
  const [activeTab, setActiveTab] = useState<'pos' | 'ledger' | 'challan' | 'compliance' | 'settings'>('pos');
  const [products, setProducts] = useState<Product[]>([]);
  const [shopSettings, setShopSettings] = useState<ShopSettings | null>(null);
  const [cachedProductCount, setCachedProductCount] = useState<number>(0);
  const [lastSyncTime, setLastSyncTime] = useState<string>('');
  const [isInwardModalOpen, setIsInwardModalOpen] = useState<boolean>(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);

  // Fetch catalog & shop settings from backend
  const loadInitialData = useCallback(async () => {
    try {
      const [prodRes, setRes] = await Promise.all([
        fetch('/api/products').then(r => r.json()).catch(() => ({ success: false })),
        fetch('/api/settings').then(r => r.json()).catch(() => ({ success: false }))
      ]);

      if (prodRes.success) {
        setProducts(prodRes.data);
      }
      if (setRes.success) {
        setShopSettings(setRes.data);
      }

      // Sync Dexie IndexedDB cache for offline & zero-latency scanning
      const syncRes = await syncCatalogFromBackend();
      setCachedProductCount(syncRes.productCount);
      setLastSyncTime(syncRes.syncedAt);
    } catch (err) {
      console.warn('Initial load error:', err);
    }
  }, []);

  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  // Global Function Key Dispatcher (F1 for POS, F8 for Challan, F9 for Ledger, F10 for Compliance)
  useEffect(() => {
    const handleGlobalKeys = (e: KeyboardEvent) => {
      if (e.key === 'F1') {
        e.preventDefault();
        setActiveTab('pos');
      } else if (e.key === 'F8') {
        e.preventDefault();
        setIsInwardModalOpen(true);
      } else if (e.key === 'F9') {
        e.preventDefault();
        setActiveTab('ledger');
      } else if (e.key === 'F10') {
        e.preventDefault();
        setActiveTab('compliance');
      }
    };

    window.addEventListener('keydown', handleGlobalKeys);
    return () => window.removeEventListener('keydown', handleGlobalKeys);
  }, []);

  const handleManualSync = async () => {
    const res = await syncCatalogFromBackend();
    setCachedProductCount(res.productCount);
    setLastSyncTime(res.syncedAt);
    // Reload products from master
    fetch('/api/products')
      .then(r => r.json())
      .then(d => { if (d.success) setProducts(d.data); });
  };

  const handleSaveSettings = async (updated: Partial<ShopSettings>) => {
    const res = await fetch('/api/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updated)
    });
    const json = await res.json();
    if (json.success) {
      setShopSettings(json.data);
    } else {
      throw new Error(json.error || 'Failed to update settings');
    }
  };

  return (
    <div className="flex flex-col h-screen w-screen bg-slate-100 text-slate-900 overflow-hidden font-sans">
      {/* Top Header */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        shopSettings={shopSettings}
        onSyncCatalog={handleManualSync}
        cachedProductCount={cachedProductCount}
        lastSyncTime={lastSyncTime}
        onOpenPrinterConfig={() => setIsSettingsOpen(true)}
      />

      {/* Main Workspace Body - Full remaining height */}
      <main className="flex-1 flex flex-col overflow-hidden bg-slate-100">
        {activeTab === 'pos' && (
          <CashierScreen
            products={products}
            onRefreshProducts={loadInitialData}
            onNavigateTab={setActiveTab}
            onOpenInwardChallan={() => setIsInwardModalOpen(true)}
          />
        )}

        {activeTab === 'ledger' && (
          <DailyStockRegister
            onOpenCompliance={() => setActiveTab('compliance')}
            onRefreshProducts={loadInitialData}
          />
        )}

        {activeTab === 'challan' && (
          <div className="flex-1 p-6 flex flex-col items-center justify-center text-center">
            <div className="bg-white border border-slate-200 p-8 rounded-2xl max-w-md shadow-md">
              <div className="w-14 h-14 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto mb-3 text-2xl font-bold border border-amber-200">
                📦
              </div>
              <h3 className="text-lg font-black text-slate-900 uppercase tracking-wider mb-2">
                Inward Stock Consignment (Depot Challan)
              </h3>
              <p className="text-xs text-slate-600 mb-6 leading-relaxed">
                Receive new consignments from WBSBCL depot, record batch numbers, update counter stock, and register 2D excise hologram serials.
              </p>
              <button
                onClick={() => setIsInwardModalOpen(true)}
                className="w-full py-3.5 bg-amber-600 hover:bg-amber-700 text-white font-extrabold text-sm rounded-xl shadow-lg transition-transform active:scale-95 cursor-pointer"
              >
                New Inward Challan Entry [F8]
              </button>
            </div>
          </div>
        )}

        {activeTab === 'compliance' && (
          <ComplianceDashboard />
        )}

        {activeTab === 'settings' && (
          <div className="flex-1 p-6 flex items-center justify-center">
            <button
              onClick={() => setIsSettingsOpen(true)}
              className="px-6 py-3.5 bg-slate-800 hover:bg-slate-900 text-white rounded-xl font-bold text-sm shadow-md cursor-pointer"
            >
              Open Shop Settings & 80mm Printer Configuration
            </button>
          </div>
        )}
      </main>

      {/* Inward Consignment Modal */}
      <InwardChallanModal
        isOpen={isInwardModalOpen}
        onClose={() => setIsInwardModalOpen(false)}
        products={products}
        onChallanSaved={loadInitialData}
      />

      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen || activeTab === 'settings'}
        onClose={() => {
          setIsSettingsOpen(false);
          if (activeTab === 'settings') setActiveTab('pos');
        }}
        shopSettings={shopSettings}
        onSaveSettings={handleSaveSettings}
      />
    </div>
  );
}

export default App;
