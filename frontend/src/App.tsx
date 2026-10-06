import React, { useState, useEffect, useCallback } from 'react';
import { Header } from './components/shared/Header';
import { HotkeyBar } from './components/shared/HotkeyBar';
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

  // Global Function Key Dispatcher (F8 for Challan, F9 for Ledger, F10 for Compliance)
  useEffect(() => {
    const handleGlobalKeys = (e: KeyboardEvent) => {
      if (e.key === 'F8') {
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
    <div className="flex flex-col h-screen w-screen bg-slate-950 text-slate-100 overflow-hidden font-sans">
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

      {/* Main Workspace Body */}
      <main className="flex-1 flex flex-col overflow-hidden bg-slate-950">
        {activeTab === 'pos' && (
          <CashierScreen
            products={products}
            onRefreshProducts={loadInitialData}
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
            <div className="bg-slate-900 border border-slate-800 p-8 rounded-2xl max-w-md">
              <h3 className="text-base font-bold text-white uppercase tracking-wider mb-2">
                Depot Inward Consignment Ledger
              </h3>
              <p className="text-xs text-slate-400 mb-6">
                Receive wholesale consignments from WBSBCL, automatically update counter inventory, and register 2D security holograms.
              </p>
              <button
                onClick={() => setIsInwardModalOpen(true)}
                className="w-full py-3 bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold text-xs rounded-xl shadow-lg transition-transform active:scale-95"
              >
                Record New Inward Consignment [F8]
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
              className="px-6 py-3 bg-emerald-600 text-white rounded-xl font-bold text-xs"
            >
              Open Settings & Hardware Configuration
            </button>
          </div>
        )}
      </main>

      {/* Hotkey Bar */}
      <HotkeyBar
        onF1={() => {
          if (activeTab !== 'pos') setActiveTab('pos');
          window.dispatchEvent(new KeyboardEvent('keydown', { key: 'F1' }));
        }}
        onF2={() => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'F2' }))}
        onF3={() => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'F3' }))}
        onF4={() => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'F4' }))}
        onF8={() => setIsInwardModalOpen(true)}
        onF9={() => {
          setActiveTab('ledger');
          setTimeout(() => {
            window.dispatchEvent(new KeyboardEvent('keydown', { key: 'F9' }));
          }, 100);
        }}
        onF10={() => setActiveTab('compliance')}
        onEscape={() => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))}
      />

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
