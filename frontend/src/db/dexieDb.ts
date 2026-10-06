import Dexie, { type Table } from 'dexie';

export interface LocalProduct {
  id: number;
  code: string;
  ean: string;
  name: string;
  category: 'IMFL' | 'Beer' | 'Wine' | 'CS';
  sub_category?: string;
  pack_size_ml: number;
  strength_pct: number;
  mrp: number;
  cost_price: number;
  current_stock: number;
  min_stock_alert?: number;
}

export interface LocalHologram {
  id: number;
  serial_number: string;
  product_id: number;
  batch_no: string;
  status: 'IN_STOCK' | 'SOLD' | 'DAMAGED' | 'RETURNED';
}

export interface LocalOfflineSale {
  id?: number;
  bill_no: string;
  created_at: string;
  cashier_id: string;
  payment_mode: string;
  total: number;
  payload: any;
  synced: boolean;
}

export class FlOffshopDatabase extends Dexie {
  products!: Table<LocalProduct, number>;
  holograms!: Table<LocalHologram, number>;
  offlineSales!: Table<LocalOfflineSale, number>;

  constructor() {
    super('FlOffshopDexieDB');
    this.version(1).stores({
      products: 'id, code, ean, name, category, pack_size_ml, mrp, current_stock',
      holograms: 'id, serial_number, product_id, status',
      offlineSales: '++id, bill_no, created_at, synced'
    });
  }
}

export const localDb = new FlOffshopDatabase();

/**
 * Synchronizes local IndexedDB cache with backend SQLite master.
 * Ensures zero-latency (<2ms) scanner lookups even during network hiccups.
 */
export async function syncCatalogFromBackend(): Promise<{ productCount: number; syncedAt: string }> {
  try {
    const res = await fetch('/api/products');
    if (!res.ok) throw new Error('Failed to fetch products');
    const json = await res.json();
    if (!json.success || !Array.isArray(json.data)) return { productCount: 0, syncedAt: '' };

    const products: LocalProduct[] = json.data;

    await localDb.transaction('rw', localDb.products, async () => {
      await localDb.products.clear();
      await localDb.products.bulkAdd(products);
    });

    return {
      productCount: products.length,
      syncedAt: new Date().toLocaleTimeString()
    };
  } catch (err) {
    console.warn('[Dexie Sync] Offline or failed to sync catalog, using local cache:', err);
    const count = await localDb.products.count();
    return { productCount: count, syncedAt: 'Offline Cache' };
  }
}

/**
 * Rapid in-memory/IndexedDB barcode lookup (<5ms)
 */
export async function resolveBarcodeOffline(barcode: string): Promise<{
  type: 'PRODUCT' | 'HOLOGRAM' | 'UNKNOWN';
  product?: LocalProduct;
  hologramSerial?: string;
}> {
  const code = barcode.trim();

  // 1. Direct EAN-13 lookup
  const byEan = await localDb.products.where('ean').equals(code).first();
  if (byEan) return { type: 'PRODUCT', product: byEan };

  // 2. Direct SKU Code lookup
  const byCode = await localDb.products.where('code').equalsIgnoreCase(code).first();
  if (byCode) return { type: 'PRODUCT', product: byCode };

  // 3. Excise Hologram serial lookup (e.g. starts with WB26)
  const byHologram = await localDb.holograms.where('serial_number').equals(code).first();
  if (byHologram) {
    const prod = await localDb.products.get(byHologram.product_id);
    return { type: 'HOLOGRAM', product: prod, hologramSerial: byHologram.serial_number };
  }

  // 4. Fallback pattern matching for WB e-Abgari 2D holograms (e.g. WB26EX...)
  if (/^WB\d{2}/i.test(code)) {
    return { type: 'HOLOGRAM', hologramSerial: code };
  }

  return { type: 'UNKNOWN' };
}
