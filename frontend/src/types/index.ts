export type LiquorCategory = 'IMFL' | 'Beer' | 'Wine' | 'CS';

export interface Product {
  id: number;
  code: string;
  ean: string;
  name: string;
  category: LiquorCategory;
  sub_category?: string;
  pack_size_ml: number;
  strength_pct: number;
  mrp: number;
  cost_price: number;
  current_stock: number;
  min_stock_alert?: number;
  in_stock_hologram_count?: number;
}

export interface CartItem {
  productId: number;
  code: string;
  name: string;
  category: LiquorCategory;
  packSizeMl: number;
  strengthPct: number;
  qty: number;
  rate: number;
  mrp: number;
  bulkLitres: number;
  londonProofLitres: number;
  scannedHolograms: string[];
}

export type PaymentMode = 'CASH' | 'UPI' | 'CARD' | 'SPLIT';

export interface SaleTransaction {
  id: number;
  billNo: string;
  createdAt: string;
  cashierId: string;
  cashierName: string;
  paymentMode: PaymentMode;
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  cashTendered: number;
  changeReturned: number;
  upiRefNo?: string;
  items: CartItem[];
  shop?: ShopSettings;
}

export interface ShopSettings {
  id: number;
  shop_name: string;
  license_no: string;
  licensee_name: string;
  district: string;
  excise_range: string;
  address: string;
  gstin?: string;
  retailer_code: string;
  portal_username: string;
  portal_password?: string;
  portal_url: string;
  auto_submit_enabled: number;
  printer_width_mm: number;
  footer_message: string;
}

export interface DSRItem {
  productId: number;
  code: string;
  name: string;
  category: LiquorCategory;
  packSizeMl: number;
  strengthPct: number;
  mrp: number;
  opening: number;
  inward: number;
  sales: number;
  breakage: number;
  expectedClosing: number;
  physicalClosing: number;
  discrepancy: number;
  salesBL: number;
  salesLPL: number;
  closingBL: number;
  closingLPL: number;
  salesValue: number;
}

export interface DSRSummary {
  items: DSRItem[];
  totals: {
    totalOpeningBottles: number;
    totalInwardBottles: number;
    totalSalesBottles: number;
    totalBreakageBottles: number;
    totalClosingBottles: number;
    totalSalesBL: number;
    totalSalesLPL: number;
    totalClosingBL: number;
    totalClosingLPL: number;
    totalSalesValue: number;
    discrepancyCount: number;
  };
  categoryBreakdown: Record<string, {
    bottlesSold: number;
    salesValue: number;
    bl: number;
    lpl: number;
    closingBottles: number;
  }>;
  sizeBreakdown: Record<string, {
    sizeMl: number;
    bottlesSold: number;
    bl: number;
    lpl: number;
    salesValue: number;
  }>;
}

export interface InwardChallan {
  id: number;
  challan_no: string;
  challan_date: string;
  source_depot: string;
  vehicle_no?: string;
  total_cases: number;
  total_bottles: number;
  total_amount: number;
  status: string;
  items?: Array<{
    id: number;
    product_id: number;
    product_name?: string;
    product_code?: string;
    cases: number;
    bottles_per_case: number;
    total_bottles: number;
    purchase_rate: number;
    mrp: number;
  }>;
}
