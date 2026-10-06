import React, { useState, useEffect } from 'react';
import { 
  Barcode, 
  Search, 
  Banknote, 
  QrCode, 
  Trash2, 
  Printer, 
  Sparkles, 
  CheckCircle2, 
  ShieldCheck, 
  Zap,
  Layers
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
}

export const CashierScreen: React.FC<CashierScreenProps> = ({
  products,
  onSaleCompleted,
  onRefreshProducts
}) => {
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [selectedIndex, setSelectedIndex] = useState<number>(0);
  const [isCatalogOpen, setIsCatalogOpen] = useState<boolean>(false);
  const [isPaymentOpen, setIsPaymentOpen] = useState<boolean>(false);
  const [paymentMode, setPaymentMode] = useState<PaymentMode>('CASH');
  const [recentSale, setRecentSale] = useState<SaleTransaction | null>(null);
  const [isReceiptOpen, setIsReceiptOpen] = useState<boolean>(false);
  const [scanFeedback, setScanFeedback] = useState<string>('Barcode Wedge Active');

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

  // Attach hologram to currently selected or matching item
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

  // Keyboard wedge scanner hook listener
  const { triggerManualScan } = useBarcodeScanner({
    enabled: !isCatalogOpen && !isPaymentOpen && !isReceiptOpen,
    onScan: (res: ScanResult) => {
      if (res.type === 'PRODUCT' && res.product) {
        addProductToCart(res.product as Product);
        setScanFeedback(`✓ Scanned: ${res.product.name}`);
      } else if (res.type === 'HOLOGRAM') {
        const matchingProd = res.product as Product | undefined;
        attachHologramToCart(res.hologramSerial || res.rawBarcode, matchingProd);
        setScanFeedback(`✓ Hologram Verified: ${res.hologramSerial || res.rawBarcode}`);
      } else {
        setScanFeedback(`✕ Unknown barcode: ${res.rawBarcode}`);
      }
    }
  });

  // Hotkey listener on window
  useEffect(() => {
    const handleGlobalHotkeys = (e: KeyboardEvent) => {
      if (isCatalogOpen || isPaymentOpen || isReceiptOpen) {
        return; // Modal handles its own escape/enter
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
          if (confirm('Clear current bill items?')) {
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
    const serial = prompt(`Enter or Scan West Bengal 2D Hologram Serial for ${item.name}:`, `WB26EX${item.packSizeMl}${Date.now().toString().slice(-6)}`);
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
        cashierName: 'S. Banerjee',
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

      // Auto-trigger ESC/POS print if WebUSB / WebSerial printer is connected
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
    <div className="flex-1 flex flex-col p-3 gap-3 overflow-hidden select-none">
      {/* Top Counter Metrics Banner */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-6">
          <div>
            <div className="text-[11px] font-mono text-slate-400">TOTAL PAYABLE</div>
            <div className="text-3xl font-mono font-black text-emerald-400 tracking-tight tabular-nums">
              {formatINR(totalSubtotal)}
            </div>
          </div>
          <div className="h-8 w-px bg-slate-800" />
          <div className="flex items-center gap-4 text-xs font-mono">
            <div>
              <span className="text-slate-400">Bottles: </span>
              <strong className="text-white text-sm">{totalBottles}</strong>
            </div>
            <div>
              <span className="text-slate-400">Bulk Litres: </span>
              <strong className="text-cyan-400 text-sm">{formatBL(totalBL)}</strong>
            </div>
            <div>
              <span className="text-slate-400">London Proof: </span>
              <strong className="text-amber-400 text-sm">{formatLPL(totalLPL)}</strong>
            </div>
          </div>
        </div>

        {/* Scanner Wedge Status Pill */}
        <div className="flex items-center gap-2 bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-800 text-xs font-mono">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping inline-block" />
          <span className="text-slate-300 font-semibold">{scanFeedback}</span>
        </div>
      </div>

      {/* Main Split Body: Left Cart, Right Actions & Scanner Sweep Simulator */}
      <div className="flex-1 flex flex-col lg:flex-row gap-3 overflow-hidden">
        {/* Left Side: Cart Table */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <CartTable
            items={cartItems}
            selectedIndex={selectedIndex}
            onSelectItem={setSelectedIndex}
            onUpdateQty={updateQuantity}
            onRemoveItem={removeItem}
            onOpenHologramAttach={handleOpenHologramPrompt}
          />
        </div>

        {/* Right Side: Quick Action & Scanner Simulation Panel */}
        <div className="w-full lg:w-80 flex flex-col gap-3">
          {/* Quick Barcode Simulator / Manual Sweep Tool */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
              <Barcode className="w-4 h-4 text-emerald-400" />
              <span>Barcode & Hologram Sweeper</span>
            </div>

            <div className="space-y-1.5">
              <div className="text-[11px] text-slate-400">
                Click sample sweep to test &lt;40ms wedge parsing:
              </div>
              <div className="grid grid-cols-2 gap-1.5 text-[11px] font-mono">
                <button
                  onClick={() => triggerManualScan('8901234001017')}
                  className="p-1.5 bg-slate-950 hover:bg-slate-800 text-slate-200 border border-slate-800 rounded text-left truncate hover:border-emerald-500 transition-colors"
                  title="Royal Challenge 750ml"
                >
                  ⚡ RC 750ml
                </button>
                <button
                  onClick={() => triggerManualScan('8901234009013')}
                  className="p-1.5 bg-slate-950 hover:bg-slate-800 text-slate-200 border border-slate-800 rounded text-left truncate hover:border-emerald-500 transition-colors"
                  title="Kingfisher Strong 650ml"
                >
                  ⚡ KF Strong
                </button>
                <button
                  onClick={() => triggerManualScan('8901234002038')}
                  className="p-1.5 bg-slate-950 hover:bg-slate-800 text-slate-200 border border-slate-800 rounded text-left truncate hover:border-emerald-500 transition-colors"
                  title="McDowell's 180ml"
                >
                  ⚡ McD 180ml
                </button>
                <button
                  onClick={() => triggerManualScan('8901234013010')}
                  className="p-1.5 bg-slate-950 hover:bg-slate-800 text-slate-200 border border-slate-800 rounded text-left truncate hover:border-emerald-500 transition-colors"
                  title="Sula Shiraz 750ml"
                >
                  ⚡ Sula Red
                </button>
                <button
                  onClick={() => triggerManualScan(`WB26EX750${Math.floor(10000 + Math.random() * 90000)}`)}
                  className="col-span-2 p-1.5 bg-amber-950/40 hover:bg-amber-900/60 text-amber-300 border border-amber-800/60 rounded text-center truncate font-bold flex items-center justify-center gap-1 transition-colors"
                >
                  <ShieldCheck className="w-3 h-3 text-amber-400" />
                  <span>Scan 2D Hologram DataMatrix</span>
                </button>
              </div>
            </div>
          </div>

          {/* Quick Counter Fast-Picks (Top Sellers) */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3 flex-1 flex flex-col">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-cyan-400" />
                <span>Fast Counter Picks</span>
              </span>
              <button
                onClick={() => setIsCatalogOpen(true)}
                className="text-[11px] text-cyan-400 hover:text-cyan-300 font-mono font-bold flex items-center gap-1"
              >
                <span>[F1] All</span>
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2 overflow-y-auto flex-1 max-h-48">
              {products.slice(0, 6).map(prod => (
                <button
                  key={prod.id}
                  onClick={() => addProductToCart(prod)}
                  className="p-2 bg-slate-950 hover:bg-slate-800 border border-slate-800 rounded-lg text-left transition-all active:scale-95 group"
                >
                  <div className="font-semibold text-white text-xs truncate group-hover:text-emerald-400">
                    {prod.name.split('(')[0]}
                  </div>
                  <div className="flex justify-between items-center text-[10px] text-slate-400 font-mono mt-1">
                    <span>{prod.pack_size_ml}ml</span>
                    <span className="font-bold text-emerald-400">{formatINR(prod.mrp)}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Primary Checkout Action Buttons */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3 space-y-2">
            <button
              onClick={() => {
                setPaymentMode('CASH');
                setIsPaymentOpen(true);
              }}
              disabled={cartItems.length === 0}
              className={`w-full py-3 px-4 rounded-xl font-black text-sm flex items-center justify-between transition-all ${
                cartItems.length === 0
                  ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                  : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-950 active:scale-95'
              }`}
            >
              <span className="flex items-center gap-2">
                <Banknote className="w-5 h-5" />
                <span>CASH CHECKOUT</span>
              </span>
              <span className="font-mono text-xs bg-black/30 px-2 py-0.5 rounded font-bold">
                F2
              </span>
            </button>

            <button
              onClick={() => {
                setPaymentMode('UPI');
                setIsPaymentOpen(true);
              }}
              disabled={cartItems.length === 0}
              className={`w-full py-2.5 px-4 rounded-xl font-bold text-xs flex items-center justify-between transition-all ${
                cartItems.length === 0
                  ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-500 text-white shadow-md active:scale-95'
              }`}
            >
              <span className="flex items-center gap-2">
                <QrCode className="w-4 h-4" />
                <span>UPI / QR CODE</span>
              </span>
              <span className="font-mono text-xs bg-black/30 px-2 py-0.5 rounded">
                F3
              </span>
            </button>

            <div className="flex gap-2 pt-1">
              <button
                onClick={() => {
                  if (cartItems.length > 0 && confirm('Clear active bill?')) {
                    setCartItems([]);
                  }
                }}
                disabled={cartItems.length === 0}
                className="flex-1 py-1.5 px-3 bg-slate-950 hover:bg-slate-800 text-slate-400 hover:text-rose-400 border border-slate-800 rounded-lg text-xs font-mono flex items-center justify-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Clear [Esc]</span>
              </button>

              {recentSale && (
                <button
                  onClick={() => setIsReceiptOpen(true)}
                  className="flex-1 py-1.5 px-3 bg-slate-950 hover:bg-slate-800 text-cyan-400 border border-slate-800 rounded-lg text-xs font-mono flex items-center justify-center gap-1.5"
                  title="Reprint Last Bill"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Reprint [F4]</span>
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
