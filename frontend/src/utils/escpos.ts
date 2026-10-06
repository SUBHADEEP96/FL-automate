import { SaleTransaction } from '../types';

/**
 * Builds binary ESC/POS buffer for 80mm thermal receipt printers.
 * 80mm printers typically have 48 characters per line.
 */
export function generateEscPosBuffer(sale: SaleTransaction): Uint8Array {
  const encoder = new TextEncoder();
  const bytes: number[] = [];

  const addBytes = (...arr: number[]) => bytes.push(...arr);
  const addText = (text: string) => {
    const encoded = encoder.encode(text);
    for (let i = 0; i < encoded.length; i++) {
      bytes.push(encoded[i]);
    }
  };
  const addLine = (text: string = '') => {
    addText(text + '\n');
  };

  // 1. Initialize printer
  addBytes(0x1B, 0x40); // ESC @

  // 2. Center Align Header
  addBytes(0x1B, 0x61, 0x01); // ESC a 1 (Center)

  // Double Height & Width for Shop Name
  addBytes(0x1B, 0x21, 0x30); // ESC ! 0x30
  addLine(sale.shop?.shop_name || 'GOVT OF WB EXCISE FL OFF SHOP');

  // Normal text
  addBytes(0x1B, 0x21, 0x00); // ESC ! 0x00
  addLine(sale.shop?.licensee_name || 'Licensed Retailer');
  addLine(`LIC: ${sale.shop?.license_no || 'WB/EX/FL/OFF/2026'}`);
  addLine(sale.shop?.address || 'Kolkata, West Bengal');
  if (sale.shop?.gstin) addLine(`GSTIN: ${sale.shop.gstin}`);
  addLine('================================================');

  // 3. Bill Metadata (Left Align)
  addBytes(0x1B, 0x61, 0x00); // ESC a 0 (Left)
  addLine(`BILL NO: ${sale.billNo}`);
  addLine(`DATE   : ${new Date(sale.createdAt).toLocaleString('en-IN')}`);
  addLine(`COUNTER: ${sale.cashierId} (${sale.cashierName})`);
  addLine(`PAYMENT: ${sale.paymentMode}${sale.upiRefNo ? ' Ref: ' + sale.upiRefNo : ''}`);
  addLine('------------------------------------------------');

  // 4. Items Table Header
  // Format 48 cols: Item (24) | Qty (4) | Rate (9) | Total (11)
  addLine('ITEM                      QTY    RATE      AMOUNT');
  addLine('------------------------------------------------');

  let totalBottles = 0;
  for (const item of sale.items) {
    totalBottles += item.qty;
    const namePart = (item.name + ' ' + item.packSizeMl + 'ml').slice(0, 24).padEnd(25);
    const qtyPart = String(item.qty).padStart(4);
    const ratePart = (' ' + Number(item.rate).toFixed(2)).padStart(9);
    const amtPart = (' ' + (item.qty * item.rate).toFixed(2)).padStart(10);
    addLine(`${namePart}${qtyPart}${ratePart}${amtPart}`);

    // If item has scanned excise security holograms, print track & trace stamp
    if (item.scannedHolograms && item.scannedHolograms.length > 0) {
      addLine(`  [WB-EXCISE HOLOGRAM VERIFIED: ${item.scannedHolograms.length} Btls]`);
      item.scannedHolograms.slice(0, 3).forEach(sn => {
        addLine(`  * QR/DM: ${sn}`);
      });
      if (item.scannedHolograms.length > 3) {
        addLine(`  * (+${item.scannedHolograms.length - 3} more verified seals)`);
      }
    }
  }

  addLine('------------------------------------------------');

  // 5. Totals
  const btlSummary = `TOTAL BOTTLES: ${totalBottles}`.padEnd(28);
  const subtotalLine = `SUBTOTAL: ₹${Number(sale.subtotal).toFixed(2)}`.padStart(20);
  addLine(`${btlSummary}${subtotalLine}`);

  if (sale.discount > 0) {
    addLine(`DISCOUNT:                               -₹${Number(sale.discount).toFixed(2)}`);
  }

  // Double Height for NET TOTAL
  addBytes(0x1B, 0x21, 0x20); // Double height
  addLine(`NET PAYABLE: ₹${Number(sale.total).toFixed(2)}`);
  addBytes(0x1B, 0x21, 0x00); // Normal font

  if (sale.paymentMode === 'CASH') {
    addLine(`CASH TENDERED: ₹${Number(sale.cashTendered).toFixed(2)}  CHANGE: ₹${Number(sale.changeReturned).toFixed(2)}`);
  }

  addLine('================================================');

  // 6. Center Footer & Statutory Warning
  addBytes(0x1B, 0x61, 0x01); // Center
  addLine('STATE EXCISE TRACK & TRACE SECURED');
  addLine('STATUTORY WARNING:');
  addLine('ALCOHOL CONSUMPTION IS INJURIOUS TO HEALTH');
  addLine('BE SAFE — NEVER DRINK AND DRIVE');
  addLine(sale.shop?.footer_message || 'Thank You! Visit Again.');
  addLine('');
  addLine('');

  // 7. Paper Feed & Cut
  addBytes(0x1D, 0x56, 0x42, 0x00); // GS V 66 0 (Cut paper)

  return new Uint8Array(bytes);
}
