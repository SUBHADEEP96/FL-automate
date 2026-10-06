import React, { useState, useEffect } from 'react';
import { 
  Barcode, 
  Search, 
  Banknote, 
  QrCode, 
  Trash2, 
  Printer, 
  ShoppingBag
} from 'lucide-react';
import { Product, CartItem, SaleTransaction, PaymentMode } from '../../types';
import { CartTable } from './CartTable';
import { ProductCatalogModal } from './ProductCatalogModal';
import { PaymentModal } from './PaymentModal';
import { ReceiptPreviewModal } from './ReceiptPreviewModal';
import { useBarcodeScanner, ScanResult } from '../../hooks/useBarcodeScanner';
import { useThermalPrinter } from '../../hooks/useThermalPrinter';
import { calculateBulkLitres, calculateLondonProofLitres, formatINR, formatBL, formatLPL } from '../../utils/exciseCalc';

interface CashierScreenProps {
  products: Product[];
  onSaleCompleted?: (sale: SaleTransaction) => void;
  onRefreshProducts: () => void;
  onNavigateTab?: (tab: 'pos' | 'ledger' | 'challan' | 'compliance' | 'settings') => void;
  onOpenInwardChallan?: () => void;
}

export const CashierScreen: React.FC<CashierScreenProps> = ({
  products,
  onSaleCompleted,
  onRefreshProducts,
  onNavigateTab,
  onOpenInwardChallan
}) => {
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [selectedIndex, setSelectedIndex] = useState<number>(0);
  const [isCatalogOpen, setIsCatalogOpen] = useState<boolean>(false);
  const [isPaymentOpen, setIsPaymentOpen] = useState<boolean>(false);
  const [paymentMode, setPaymentMode] = useState<PaymentMode>('CASH');
  const [recentSale, setRecentSale] = useState<SaleTransaction | null>(null);
  const [isReceiptOpen, setIsReceiptOpen] = useState<boolean>(false);
  const [scanFeedback, setScanFeedback] = useState<string>('✓ Scanner Ready');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('ALL');
  const [quickSearchQuery, setQuickSearchQuery] = useState<string>('');

  const { printReceipt, isPrinting, connectionType } = useThermalPrinter();

  // Helper to add a product to the cart
  const addProductToCart = (product: Product, customHologram?: string) => {
    setCartItems(prev => {
      const existingIdx = prev.findIndex(item => item.productId === product.id);
      if (existingIdx >= 0) {
        const updated = [...prev];
        const existing = updated[existingIdx];
        const newQty = existing.qty + 1;
        const bl = calculateBulkLitres(newQty, product.pack_size_ml);
        const lpl = calculateLondonProofLitres(bl, product.strength_pct);
        const holograms = customHologram && !existing.scannedHolograms.includes(customHologram)
          ? [...existing.scannedHolograms, customHologram]
          : existing.scannedHolograms;

        updated[existingIdx] = {
          ...existing,
          qty: newQty,
          bulkLitres: bl,
          londonProofLitres: lpl,
          scannedHolograms: holograms
        };
        setSelectedIndex(existingIdx);
        return updated;
      } else {
        const bl = calculateBulkLitres(1, product.pack_size_ml);
        const lpl = calculateLondonProofLitres(bl, product.strength_pct);
        const newItem: CartItem = {
          productId: product.id,
          code: product.code,
          name: product.name,
          category: product.category,
          packSizeMl: product.pack_size_ml,
          strengthPct: product.strength_pct,
          qty: 1,
          rate: product.mrp,
          mrp: product.mrp,
          bulkLitres: bl,
          londonProofLitres: lpl,
          scannedHolograms: customHologram ? [customHologram] : []
        };
        setSelectedIndex(prev.length);
        return [...prev, newItem];
      }
    });
  };

  // Attach hologram to item
  const attachHologramToCart = (hologramSerial: string, matchedProduct?: Product) => {
    if (matchedProduct) {
      addProductToCart(matchedProduct, hologramSerial);
      return;
    }

    setCartItems(prev => {
      if (prev.length === 0) return prev;
      const targetIdx = selectedIndex < prev.length ? selectedIndex : 0;
      const updated = [...prev];
      const target = updated[targetIdx];
      if (!target.scannedHolograms.includes(hologramSerial)) {
        updated[targetIdx] = {
          ...target,
          scannedHolograms: [...target.scannedHolograms, hologramSerial]
        };
      }
      return updated;
    });
  };

  // Barcode scanner wedge listener
  const { triggerManualScan } = useBarcodeScanner({
    enabled: !isCatalogOpen && !isPaymentOpen && !isReceiptOpen,
    onScan: (res: ScanResult) => {
      if (res.type === 'PRODUCT' && res.product) {
        addProductToCart(res.product as Product);
        setScanFeedback(`✓ Added: ${res.product.name}`);
      } else if (res.type === 'HOLOGRAM') {
        const matchingProd = res.product as Product | undefined;
        attachHologramToCart(res.hologramSerial || res.rawBarcode, matchingProd);
        setScanFeedback(`✓ Hologram Linked: ${res.hologramSerial || res.rawBarcode}`);
      } else {
        setScanFeedback(`✕ Unknown Code: ${res.rawBarcode}`);
      }
    }
  });

  // Global hotkeys
  useEffect(() => {
    const handleGlobalHotkeys = (e: KeyboardEvent) => {
      if (isCatalogOpen || isPaymentOpen || isReceiptOpen) {
        return;
      }

      if (e.key === 'F1') {
        e.preventDefault();
        setIsCatalogOpen(true);
      } else if (e.key === 'F2') {
        e.preventDefault();
        if (cartItems.length > 0) {
          setPaymentMode('CASH');
          setIsPaymentOpen(true);
        }
      } else if (e.key === 'F3') {
        e.preventDefault();
        if (cartItems.length > 0) {
          setPaymentMode('UPI');
          setIsPaymentOpen(true);
        }
      } else if (e.key === 'F4') {
        e.preventDefault();
        if (recentSale) {
          setIsReceiptOpen(true);
        }
      } else if (e.key === 'Escape') {
        e.preventDefault();
        if (cartItems.length > 0) {
          if (confirm('Are you sure you want to clear all items in the current bill? [Esc]')) {
            setCartItems([]);
          }
        }
      } else if (e.key === '+' || e.key === '=') {
        e.preventDefault();
        updateQuantity(selectedIndex, 1);
      } else if (e.key === '-' || e.key === '_') {
        e.preventDefault();
        updateQuantity(selectedIndex, -1);
      } else if (e.key === 'Delete') {
        e.preventDefault();
        removeItem(selectedIndex);
      }
    };

    window.addEventListener('keydown', handleGlobalHotkeys);
    return () => window.removeEventListener('keydown', handleGlobalHotkeys);
  }, [isCatalogOpen, isPaymentOpen, isReceiptOpen, cartItems, selectedIndex, recentSale]);

  const updateQuantity = (idx: number, delta: number) => {
    setCartItems(prev => {
      if (idx < 0 || idx >= prev.length) return prev;
      const updated = [...prev];
      const item = updated[idx];
      const newQty = item.qty + delta;
      if (newQty <= 0) {
        return prev.filter((_, i) => i !== idx);
      }
      const bl = calculateBulkLitres(newQty, item.packSizeMl);
      const lpl = calculateLondonProofLitres(bl, item.strengthPct);
      updated[idx] = {
        ...item,
        qty: newQty,
        bulkLitres: bl,
        londonProofLitres: lpl
      };
      return updated;
    });
  };

  const removeItem = (idx: number) => {
    setCartItems(prev => prev.filter((_, i) => i !== idx));
    setSelectedIndex(prev => Math.max(0, prev - 1));
  };

  const handleOpenHologramPrompt = (idx: number) => {
    const item = cartItems[idx];
    if (!item) return;
    const serial = prompt(`Enter or Scan 2D Hologram Serial for ${item.name}:`, `WB26EX${item.packSizeMl}${Date.now().toString().slice(-6)}`);
    if (serial && serial.trim()) {
      setCartItems(prev => {
        const updated = [...prev];
        const target = updated[idx];
        if (!target.scannedHolograms.includes(serial.trim())) {
          updated[idx] = {
            ...target,
            scannedHolograms: [...target.scannedHolograms, serial.trim()]
          };
        }
        return updated;
      });
    }
  };

  // Cart Totals
  const totalBottles = cartItems.reduce((acc, it) => acc + it.qty, 0);
  const totalSubtotal = cartItems.reduce((acc, it) => acc + it.qty * it.rate, 0);
  const totalBL = cartItems.reduce((acc, it) => acc + it.bulkLitres, 0);
  const totalLPL = cartItems.reduce((acc, it) => acc + it.londonProofLitres, 0);

  // Filter products for right panel
  const displayProducts = products.filter(p => {
    const matchesCategory = selectedCategoryFilter === 'ALL' || p.category === selectedCategoryFilter;
    const q = quickSearchQuery.toLowerCase().trim();
    const matchesQuery = !q || p.name.toLowerCase().includes(q) || p.code.toLowerCase().includes(q) || p.ean.includes(q);
    return matchesCategory && matchesQuery;
  });

  // Commit sale to backend
  const handleConfirmPayment = async (payData: {
    paymentMode: PaymentMode;
    cashTendered: number;
    changeReturned: number;
    upiRefNo?: string;
  }) => {
    try {
      const payload = {
        cashierId: 'COUNTER_01',
        cashierName: 'Krishnanagar Staff',
        paymentMode: payData.paymentMode,
        subtotal: totalSubtotal,
        discount: 0,
        tax: 0,
        total: totalSubtotal,
        cashTendered: payData.cashTendered,
        changeReturned: payData.changeReturned,
        upiRefNo: payData.upiRefNo,
        items: cartItems.map(it => ({
          productId: it.productId,
          qty: it.qty,
          rate: it.rate,
          mrp: it.mrp,
          scannedHolograms: it.scannedHolograms
        }))
      };

      const res = await fetch('/api/sales', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const json = await res.json();
      if (!json.success) throw new Error(json.error || 'Checkout failed');

      const completedSale: SaleTransaction = json.data;
      setRecentSale(completedSale);
      setCartItems([]);
      setIsPaymentOpen(false);
      setIsReceiptOpen(true);

      if (connectionType !== 'NONE' && connectionType !== 'BROWSER_DIALOG') {
        printReceipt(completedSale);
      }

      onRefreshProducts();
      if (onSaleCompleted) onSaleCompleted(completedSale);
    } catch (err: any) {
      alert(`Checkout failed: ${err.message}`);
    }
  };

  return (
    <div className="flex-1 flex flex-col p-3.5 gap-3.5 overflow-hidden select-none bg-slate-100">
      {/* Top Banner: Crisp White Card with Huge Total */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-4 shadow-sm">
        <div className="flex items-center gap-6">
          <div className="bg-emerald-50 border-2 border-emerald-500 px-5 py-2.5 rounded-2xl">
            <div className="text-xs font-black text-emerald-800 uppercase tracking-wider">
              BILL TOTAL
            </div>
            <div className="text-3xl sm:text-4xl font-mono font-black text-emerald-700 tracking-tight tabular-nums">
              {formatINR(totalSubtotal)}
            </div>
          </div>

          <div className="h-10 w-px bg-slate-200 hidden sm:block" />

          <div className="flex items-center gap-4 text-sm font-sans">
            <div className="bg-slate-50 px-3.5 py-2 rounded-xl border border-slate-200">
              <span className="text-slate-500 text-xs font-semibold">Bottles: </span>
              <strong className="text-slate-900 font-mono text-base font-black ml-1">{totalBottles} pcs</strong>
            </div>
            <div className="bg-slate-50 px-3.5 py-2 rounded-xl border border-slate-200">
              <span className="text-slate-500 text-xs font-semibold">Bulk Litres: </span>
              <strong className="text-blue-700 font-mono text-base font-bold ml-1">{formatBL(totalBL)}</strong>
            </div>
            <div className="bg-slate-50 px-3.5 py-2 rounded-xl border border-slate-200">
              <span className="text-slate-500 text-xs font-semibold">Proof Litres: </span>
              <strong className="text-amber-700 font-mono text-base font-bold ml-1">{formatLPL(totalLPL)}</strong>
            </div>
          </div>
        </div>

        {/* Right Utility & Quick Jump Actions */}
        <div className="flex items-center gap-2 flex-wrap">
          {onNavigateTab && (
            <button
              onClick={() => onNavigateTab('ledger')}
              className="px-3 py-1.5 bg-teal-50 hover:bg-teal-100 text-teal-800 border-2 border-teal-300 rounded-xl text-xs font-black flex items-center gap-1 transition-colors shadow-xs pos-btn-press cursor-pointer"
              title="Open Daily Stock Register (DSR)"
            >
              <span>Stock Register [F9]</span>
            </button>
          )}

          {onOpenInwardChallan && (
            <button
              onClick={onOpenInwardChallan}
              className="px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 border-2 border-amber-300 rounded-xl text-xs font-black flex items-center gap-1 transition-colors shadow-xs pos-btn-press cursor-pointer"
              title="Record Inward Depot Challan"
            >
              <span>Inward Challan [F8]</span>
            </button>
          )}

          {/* Live Scanner Indicator */}
          <div className="flex items-center gap-2 bg-emerald-50 px-3.5 py-1.5 rounded-xl border-2 border-emerald-300 text-xs font-black text-emerald-800 shadow-xs">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping inline-block" />
            <span>{scanFeedback}</span>
          </div>
        </div>
      </div>

      {/* Main Split: Left Cart, Right Touch Picker & Big Checkout Buttons */}
      <div className="flex-1 flex flex-col lg:flex-row gap-3.5 overflow-hidden">
        {/* Left Side: Cart Table */}
        <div className="flex-[3] flex flex-col overflow-hidden">
          <CartTable
            items={cartItems}
            selectedIndex={selectedIndex}
            onSelectItem={setSelectedIndex}
            onUpdateQty={updateQuantity}
            onRemoveItem={removeItem}
            onOpenHologramAttach={handleOpenHologramPrompt}
          />
        </div>

        {/* Right Side: Friendly Quick Picker & Big Checkout Buttons */}
        <div className="flex-[2] flex flex-col gap-3 overflow-hidden">
          {/* Quick Search & Category Filter Box */}
          <div className="bg-white border border-slate-200 rounded-2xl p-3.5 shadow-sm flex flex-col gap-2.5">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={quickSearchQuery}
                onChange={e => setQuickSearchQuery(e.target.value)}
                placeholder="🔍 Search brand name, SKU code, or scan barcode..."
                className="w-full bg-slate-50 border-2 border-slate-200 focus:border-blue-500 rounded-xl pl-10 pr-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:outline-none"
              />
            </div>

            {/* Category Filter Tabs */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5">
              {[
                { id: 'ALL', label: 'All Brands' },
                { id: 'IMFL', label: 'IMFL Spirits' },
                { id: 'Beer', label: 'Beer' },
                { id: 'Wine', label: 'Wine' },
                { id: 'CS', label: 'Country Spirit (CS)' }
              ].map(cat => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategoryFilter(cat.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap pos-btn-press cursor-pointer ${
                    selectedCategoryFilter === cat.id
                      ? 'bg-blue-600 text-white shadow-sm font-black'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          {/* Quick Touch/Click Brand Grid */}
          <div className="bg-white border border-slate-200 rounded-2xl p-3.5 flex-1 flex flex-col overflow-hidden shadow-sm">
            <div className="flex items-center justify-between mb-2.5">
              <span className="text-xs font-extrabold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <ShoppingBag className="w-4 h-4 text-emerald-600" />
                <span>Quick Brand Touch Picker (Click to Add)</span>
              </span>
              <button
                onClick={() => setIsCatalogOpen(true)}
                className="text-xs text-blue-600 hover:text-blue-700 font-extrabold font-mono cursor-pointer"
              >
                [F1] Full Catalog
              </button>
            </div>

            {/* Product Cards Grid */}
            <div className="grid grid-cols-2 gap-2.5 overflow-y-auto flex-1 pr-1">
              {displayProducts.slice(0, 10).map(prod => (
                <button
                  key={prod.id}
                  onClick={() => addProductToCart(prod)}
                  className="p-3 bg-slate-50 hover:bg-blue-50/60 border border-slate-200 hover:border-blue-400 rounded-xl text-left transition-all pos-btn-press flex flex-col justify-between group shadow-sm cursor-pointer"
                >
                  <div>
                    <div className="font-extrabold text-slate-900 text-sm group-hover:text-blue-700 line-clamp-1">
                      {prod.name.split('(')[0]}
                    </div>
                    <div className="text-[11px] font-bold text-blue-700 mt-0.5">
                      {prod.pack_size_ml === 750 ? '750ml (Quart)' :
                       prod.pack_size_ml === 375 ? '375ml (Pint)' :
                       prod.pack_size_ml === 180 ? '180ml (Nip)' :
                       prod.pack_size_ml === 650 ? '650ml (Beer)' :
                       `${prod.pack_size_ml}ml`}
                    </div>
                  </div>

                  <div className="flex items-center justify-between mt-2.5 pt-1.5 border-t border-slate-200">
                    <span className="text-base font-black font-mono text-emerald-700">
                      {formatINR(prod.mrp)}
                    </span>
                    <span className="text-[10px] text-slate-500 font-medium">
                      Stock: {prod.current_stock}
                    </span>
                  </div>
                </button>
              ))}
            </div>

            {/* Test Barcode Sweeps for Training */}
            <div className="mt-2.5 pt-2 border-t border-slate-200 flex items-center gap-1.5 overflow-x-auto text-[11px] font-mono">
              <span className="text-slate-500 font-bold flex items-center gap-1 whitespace-nowrap">
                <Barcode className="w-3.5 h-3.5 text-blue-600" />
                <span>Test Scans:</span>
              </span>
              <button
                onClick={() => triggerManualScan('8901234001017')}
                className="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded border border-slate-300 whitespace-nowrap font-bold cursor-pointer"
              >
                RC 750ml
              </button>
              <button
                onClick={() => triggerManualScan('8901234009013')}
                className="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded border border-slate-300 whitespace-nowrap font-bold cursor-pointer"
              >
                KF Strong
              </button>
              <button
                onClick={() => triggerManualScan(`WB26EX750${Math.floor(10000 + Math.random() * 90000)}`)}
                className="px-2 py-0.5 bg-amber-100 hover:bg-amber-200 text-amber-900 rounded border border-amber-300 whitespace-nowrap font-bold cursor-pointer"
              >
                2D Hologram
              </button>
            </div>
          </div>

          {/* Big Checkout Buttons */}
          <div className="bg-white border border-slate-200 rounded-2xl p-3.5 space-y-2.5 shadow-sm">
            <div className="grid grid-cols-2 gap-2.5">
              <button
                onClick={() => {
                  setPaymentMode('CASH');
                  setIsPaymentOpen(true);
                }}
                disabled={cartItems.length === 0}
                className={`py-4 px-4 rounded-xl font-black text-sm flex flex-col items-center justify-center gap-1 transition-all pos-btn-press ${
                  cartItems.length === 0
                    ? 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed'
                    : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-600/30 cursor-pointer'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Banknote className="w-6 h-6" />
                  <span className="text-base">CASH PAYMENT</span>
                </div>
                <span className="text-[11px] font-mono bg-black/20 text-white px-2.5 py-0.5 rounded font-bold">
                  Hotkey [F2]
                </span>
              </button>

              <button
                onClick={() => {
                  setPaymentMode('UPI');
                  setIsPaymentOpen(true);
                }}
                disabled={cartItems.length === 0}
                className={`py-4 px-4 rounded-xl font-black text-sm flex flex-col items-center justify-center gap-1 transition-all pos-btn-press ${
                  cartItems.length === 0
                    ? 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed'
                    : 'bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-600/30 cursor-pointer'
                }`}
              >
                <div className="flex items-center gap-2">
                  <QrCode className="w-6 h-6" />
                  <span className="text-base">ONLINE UPI / QR</span>
                </div>
                <span className="text-[11px] font-mono bg-black/20 text-white px-2.5 py-0.5 rounded font-bold">
                  Hotkey [F3]
                </span>
              </button>
            </div>

            <div className="flex gap-2.5">
              <button
                onClick={() => {
                  if (cartItems.length > 0 && confirm('Clear active bill items?')) {
                    setCartItems([]);
                  }
                }}
                disabled={cartItems.length === 0}
                className="flex-1 py-2.5 px-3 bg-slate-100 hover:bg-rose-50 text-slate-700 hover:text-rose-700 border border-slate-200 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <Trash2 className="w-4 h-4 text-slate-500" />
                <span>Clear Bill [Esc]</span>
              </button>

              {recentSale && (
                <button
                  onClick={() => setIsReceiptOpen(true)}
                  className="flex-1 py-2.5 px-3 bg-slate-100 hover:bg-blue-50 text-blue-700 border border-slate-200 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Printer className="w-4 h-4 text-blue-600" />
                  <span>Print Receipt [F4]</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Catalog Search Modal */}
      <ProductCatalogModal
        isOpen={isCatalogOpen}
        onClose={() => setIsCatalogOpen(false)}
        products={products}
        onSelectProduct={addProductToCart}
      />

      {/* Payment Settlement Modal */}
      <PaymentModal
        isOpen={isPaymentOpen}
        onClose={() => setIsPaymentOpen(false)}
        totalAmount={totalSubtotal}
        initialMode={paymentMode}
        onConfirmPayment={handleConfirmPayment}
      />

      {/* Receipt Preview & ESC/POS Print Modal */}
      <ReceiptPreviewModal
        isOpen={isReceiptOpen}
        onClose={() => setIsReceiptOpen(false)}
        sale={recentSale}
        onPrintDirect={() => recentSale && printReceipt(recentSale)}
        isPrinting={isPrinting}
      />
    </div>
  );
};
