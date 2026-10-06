import React, { useState, useEffect } from 'react';
import { Settings, Printer, Shield, Save, X, Usb, Cable, CheckCircle2 } from 'lucide-react';
import { ShopSettings } from '../../types';
import { useThermalPrinter } from '../../hooks/useThermalPrinter';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  shopSettings: ShopSettings | null;
  onSaveSettings: (settings: Partial<ShopSettings>) => Promise<void>;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  shopSettings,
  onSaveSettings
}) => {
  const [formData, setFormData] = useState<Partial<ShopSettings>>({});
  const [isSaving, setIsSaving] = useState<boolean>(false);

  const {
    connectionType,
    printerDeviceName,
    lastPrintStatus,
    connectWebUsb,
    connectWebSerial,
    printReceipt
  } = useThermalPrinter();

  useEffect(() => {
    if (shopSettings) {
      setFormData(shopSettings);
    }
  }, [shopSettings]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await onSaveSettings(formData);
      alert('✓ Settings updated successfully');
      onClose();
    } catch (err: any) {
      alert(`Failed to save settings: ${err.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleTestPrint = () => {
    printReceipt({
      id: 9999,
      billNo: 'WB-FL-TEST-0001',
      createdAt: new Date().toISOString(),
      cashierId: 'TEST_COUNTER',
      cashierName: 'Admin',
      paymentMode: 'CASH',
      subtotal: 780,
      discount: 0,
      tax: 0,
      total: 780,
      cashTendered: 1000,
      changeReturned: 220,
      items: [
        {
          productId: 1,
          code: 'IMFL-RC-750',
          name: 'Royal Challenge Premium Whisky',
          category: 'IMFL',
          packSizeMl: 750,
          strengthPct: 42.8,
          qty: 1,
          rate: 780,
          mrp: 780,
          bulkLitres: 0.75,
          londonProofLitres: 0.562,
          scannedHolograms: ['WB26EX75099901']
        }
      ],
      shop: shopSettings || undefined
    });
  };

  return (
    <div 
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 select-none overflow-y-auto"
      onClick={onClose}
    >
      <div 
        className="bg-white border border-slate-200 rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col my-8 animate-in fade-in zoom-in-95 duration-150"
        onClick={e => e.stopPropagation()}
      >
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-800 flex items-center justify-center font-black">
              <Settings className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900 uppercase tracking-wider">
                Store Settings & Hardware Configuration
              </h3>
              <div className="text-xs text-slate-500 font-medium">
                Receipt Printer, Excise License, and e-Abgari Portal Credentials
              </div>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-200 cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6 overflow-y-auto max-h-[70vh]">
          {/* Thermal Printer Hardware Section */}
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-black text-slate-800 uppercase tracking-wider">
                <Printer className="w-4 h-4 text-blue-600" />
                <span>80mm Thermal ESC/POS Receipt Printer</span>
              </div>
              <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-white border border-slate-300 text-blue-700 font-bold">
                Connection Mode: {connectionType}
              </span>
            </div>

            <p className="text-xs text-slate-600 font-medium">
              Direct hardware printing via WebUSB or WebSerial with zero print dialog delay.
            </p>

            <div className="flex flex-wrap items-center gap-2 pt-1">
              <button
                type="button"
                onClick={connectWebUsb}
                className="px-3.5 py-1.5 bg-white hover:bg-slate-100 text-blue-700 border border-slate-300 rounded-lg text-xs font-mono font-bold flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
              >
                <Usb className="w-3.5 h-3.5" />
                <span>Connect WebUSB</span>
              </button>

              <button
                type="button"
                onClick={connectWebSerial}
                className="px-3.5 py-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-lg text-xs font-mono font-bold flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
              >
                <Cable className="w-3.5 h-3.5" />
                <span>Connect COM / WebSerial</span>
              </button>

              <button
                type="button"
                onClick={handleTestPrint}
                className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-mono font-bold ml-auto shadow-sm cursor-pointer"
              >
                Print Test Slip
              </button>
            </div>

            {lastPrintStatus && (
              <div className="text-[11px] font-mono text-slate-600 bg-white p-2 rounded-lg border border-slate-200">
                Printer Status: {lastPrintStatus}
              </div>
            )}
          </div>

          {/* Store & Excise License Info */}
          <div className="space-y-3">
            <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
              <Shield className="w-4 h-4 text-emerald-600" />
              <span>West Bengal Retail License Profile</span>
            </h4>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <label className="block text-slate-700 font-bold mb-1">Shop Name</label>
                <input
                  type="text"
                  value={formData.shop_name || ''}
                  onChange={e => setFormData({ ...formData, shop_name: e.target.value })}
                  className="w-full bg-white border border-slate-300 rounded-lg p-2 text-slate-900 font-bold focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Excise License Number</label>
                <input
                  type="text"
                  value={formData.license_no || ''}
                  onChange={e => setFormData({ ...formData, license_no: e.target.value })}
                  className="w-full bg-white border border-slate-300 rounded-lg p-2 text-slate-900 font-mono font-bold focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Licensee Firm Name</label>
                <input
                  type="text"
                  value={formData.licensee_name || ''}
                  onChange={e => setFormData({ ...formData, licensee_name: e.target.value })}
                  className="w-full bg-white border border-slate-300 rounded-lg p-2 text-slate-900 font-medium focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Excise District & Range</label>
                <input
                  type="text"
                  value={formData.district || ''}
                  onChange={e => setFormData({ ...formData, district: e.target.value })}
                  className="w-full bg-white border border-slate-300 rounded-lg p-2 text-slate-900 font-medium focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="col-span-2">
                <label className="block text-slate-700 font-bold mb-1">Shop Address</label>
                <input
                  type="text"
                  value={formData.address || ''}
                  onChange={e => setFormData({ ...formData, address: e.target.value })}
                  className="w-full bg-white border border-slate-300 rounded-lg p-2 text-slate-900 font-medium focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">WBSBCL Retailer Code</label>
                <input
                  type="text"
                  value={formData.retailer_code || ''}
                  onChange={e => setFormData({ ...formData, retailer_code: e.target.value })}
                  className="w-full bg-white border border-slate-300 rounded-lg p-2 text-slate-900 font-mono font-bold focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">GSTIN Number</label>
                <input
                  type="text"
                  value={formData.gstin || ''}
                  onChange={e => setFormData({ ...formData, gstin: e.target.value })}
                  className="w-full bg-white border border-slate-300 rounded-lg p-2 text-slate-900 font-mono font-bold focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>
          </div>

          {/* e-Abgari Portal Credentials */}
          <div className="space-y-3">
            <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider">
              e-Abgari Portal Automation Credentials
            </h4>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="col-span-2">
                <label className="block text-slate-700 font-bold mb-1">Retailer Portal URL</label>
                <input
                  type="text"
                  value={formData.portal_url || ''}
                  onChange={e => setFormData({ ...formData, portal_url: e.target.value })}
                  className="w-full bg-white border border-slate-300 rounded-lg p-2 text-slate-900 font-mono focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Portal User ID</label>
                <input
                  type="text"
                  value={formData.portal_username || ''}
                  onChange={e => setFormData({ ...formData, portal_username: e.target.value })}
                  className="w-full bg-white border border-slate-300 rounded-lg p-2 text-slate-900 font-mono font-bold focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Portal Password</label>
                <input
                  type="password"
                  value={formData.portal_password || ''}
                  onChange={e => setFormData({ ...formData, portal_password: e.target.value })}
                  className="w-full bg-white border border-slate-300 rounded-lg p-2 text-slate-900 font-mono focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>
          </div>

          <div className="pt-2 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-xl text-xs font-bold cursor-pointer"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={isSaving}
              className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black flex items-center gap-2 shadow-md pos-btn-press cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>{isSaving ? 'Saving Settings...' : 'Save Settings'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
