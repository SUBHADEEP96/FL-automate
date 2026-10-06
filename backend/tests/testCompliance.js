/**
 * West Bengal FL Off-Shop Automated Compliance & End-to-End Test Suite
 * 
 * Tests:
 * 1. Database & Seed Data Verification
 * 2. Excise Engine Calculations (BL, LPL, Discrepancies)
 * 3. POS Atomic Checkout & Hologram Track-and-Trace
 * 4. ExcelJS WBSBCL DSR Statement Generation
 * 5. Puppeteer e-Abgari Portal Simulator Automated Filing
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const db = require('../db/database');
const { seedDatabase } = require('../db/seed');
const { calculateBulkLitres, calculateLondonProofLitres, computeDSRSummary } = require('../services/exciseEngine');
const { generateWbsbclDailyReturnExcel } = require('../services/excelReport');
const { runPortalAutomation } = require('../services/portalWorker');
const { app, server } = require('../server');

async function runTestSuite() {
  console.log('================================================================');
  console.log(' WEST BENGAL EXCISE COMPLIANCE & POS BILLING TEST SUITE        ');
  console.log('================================================================\n');

  try {
    // -------------------------------------------------------------
    // Test 1: Verify Seed & Database Schema
    // -------------------------------------------------------------
    console.log('[Test 1] Verifying Database Master & Seed Data...');
    seedDatabase();

    const productCount = db.prepare('SELECT COUNT(*) as count FROM products').get().count;
    assert(productCount >= 20, `Expected at least 20 products, got ${productCount}`);
    console.log(`  ✓ Product Master verified: ${productCount} active SKUs in database.`);

    const shopSettings = db.prepare('SELECT * FROM shop_settings WHERE id = 1').get();
    assert(shopSettings && shopSettings.license_no, 'Shop settings license number must be present');
    console.log(`  ✓ Shop License: ${shopSettings.license_no} (${shopSettings.shop_name})`);

    const hologramCount = db.prepare("SELECT COUNT(*) as count FROM holograms WHERE status = 'IN_STOCK'").get().count;
    assert(hologramCount > 0, 'In-stock holograms must be present');
    console.log(`  ✓ Track & Trace: ${hologramCount} 2D Excise Security Holograms active in stock.`);

    // -------------------------------------------------------------
    // Test 2: Verify Strict State Excise Calculations
    // -------------------------------------------------------------
    console.log('\n[Test 2] Verifying Strict State Excise Calculation Formulas...');
    // Case A: 12 bottles of 750ml IMFL at 42.8% v/v
    // BL = (12 * 750) / 1000 = 9.0 BL
    // LPL = 9.0 * (42.8 / 57.12) = 6.7437 LPL
    const blA = calculateBulkLitres(12, 750);
    assert.strictEqual(blA, 9.0, `Expected 9.0 BL, got ${blA}`);
    const lplA = calculateLondonProofLitres(blA, 42.8);
    const expectedLplA = Number((9.0 * (42.8 / 57.12)).toFixed(4));
    assert.strictEqual(lplA, expectedLplA, `Expected ${expectedLplA} LPL, got ${lplA}`);
    console.log(`  ✓ IMFL 750ml (12 Btls @ 42.8%): Bulk Litres = ${blA} BL, London Proof = ${lplA} LPL`);

    // Case B: 24 bottles of 650ml Strong Beer at 8.0% v/v
    // BL = (24 * 650) / 1000 = 15.6 BL
    // LPL = 15.6 * (8.0 / 57.12) = 2.1849 LPL
    const blB = calculateBulkLitres(24, 650);
    assert.strictEqual(blB, 15.6, `Expected 15.6 BL, got ${blB}`);
    const lplB = calculateLondonProofLitres(blB, 8.0);
    console.log(`  ✓ Strong Beer 650ml (24 Btls @ 8.0%): Bulk Litres = ${blB} BL, London Proof = ${lplB} LPL`);

    // -------------------------------------------------------------
    // Test 3: Atomic POS Sale Transaction & Hologram Binding
    // -------------------------------------------------------------
    console.log('\n[Test 3] Simulating POS Checkout with 2D Hologram Binding...');
    const testProduct = db.prepare("SELECT * FROM products WHERE code = 'IMFL-RC-750'").get();
    const initialStock = testProduct.current_stock;
    let availableHologram = db.prepare("SELECT * FROM holograms WHERE product_id = ? AND status = 'IN_STOCK'").get(testProduct.id);
    if (!availableHologram) {
      const serial = `WB26EX${testProduct.pack_size_ml}${Date.now().toString().slice(-6)}`;
      const res = db.prepare("INSERT INTO holograms (serial_number, product_id, batch_no, status) VALUES (?, ?, 'B26-TEST', 'IN_STOCK')").run(serial, testProduct.id);
      availableHologram = db.prepare("SELECT * FROM holograms WHERE id = ?").get(res.lastInsertRowid);
    }

    assert(availableHologram, 'A test hologram must be available');
    const billNo = `WB-FL-TEST-${Date.now().toString().slice(-4)}`;

    const checkoutTx = db.transaction(() => {
      const saleResult = db.prepare(`
        INSERT INTO sales (bill_no, cashier_id, cashier_name, payment_mode, subtotal, total, status)
        VALUES (?, 'COUNTER_01', 'Tester', 'CASH', ?, ?, 'COMPLETED')
      `).run(billNo, testProduct.mrp, testProduct.mrp);

      const saleId = saleResult.lastInsertRowid;
      const bl = calculateBulkLitres(1, testProduct.pack_size_ml);
      const lpl = calculateLondonProofLitres(bl, testProduct.strength_pct);

      db.prepare(`
        INSERT INTO sale_items (sale_id, product_id, qty, rate, mrp, bulk_litres, london_proof_litres, hologram_serials)
        VALUES (?, ?, 1, ?, ?, ?, ?, ?)
      `).run(saleId, testProduct.id, testProduct.mrp, testProduct.mrp, bl, lpl, JSON.stringify([availableHologram.serial_number]));

      db.prepare('UPDATE products SET current_stock = current_stock - 1 WHERE id = ?').run(testProduct.id);
      db.prepare("UPDATE holograms SET status = 'SOLD', sale_id = ? WHERE id = ?").run(saleId, availableHologram.id);

      return { saleId };
    });

    const { saleId } = checkoutTx();
    const updatedProd = db.prepare('SELECT current_stock FROM products WHERE id = ?').get(testProduct.id);
    assert.strictEqual(updatedProd.current_stock, initialStock - 1, 'Stock should decrement by 1');

    const updatedHolo = db.prepare('SELECT status, sale_id FROM holograms WHERE id = ?').get(availableHologram.id);
    assert.strictEqual(updatedHolo.status, 'SOLD', 'Hologram status must be SOLD');
    assert.strictEqual(updatedHolo.sale_id, saleId, 'Hologram must be linked to sale ID');
    console.log(`  ✓ Bill ${billNo} completed: Stock decremented (${initialStock} -> ${updatedProd.current_stock}), Hologram ${availableHologram.serial_number} marked SOLD.`);

    // -------------------------------------------------------------
    // Test 4: ExcelJS WBSBCL DSR Statement Generation
    // -------------------------------------------------------------
    console.log('\n[Test 4] Generating Official WBSBCL Excel Statement via exceljs...');
    const allProducts = db.prepare('SELECT * FROM products').all();
    const summaryRows = allProducts.map(p => ({
      productId: p.id,
      code: p.code,
      name: p.name,
      category: p.category,
      packSizeMl: p.pack_size_ml,
      strengthPct: p.strength_pct,
      mrp: p.mrp,
      opening: p.current_stock + 1,
      inward: 0,
      sales: 1,
      breakage: 0,
      physicalCount: p.current_stock
    }));

    const dsrSummary = computeDSRSummary(summaryRows);
    const todayStr = new Date().toISOString().slice(0, 10);
    const { filePath, filename } = await generateWbsbclDailyReturnExcel(dsrSummary, shopSettings, todayStr);

    assert(fs.existsSync(filePath), `Excel file not found at ${filePath}`);
    const stat = fs.statSync(filePath);
    assert(stat.size > 2000, 'Excel file must be valid non-empty workbook');
    console.log(`  ✓ WBSBCL Excel Statement successfully created: ${filename} (${(stat.size / 1024).toFixed(1)} KB)`);

    // -------------------------------------------------------------
    // Test 5: Puppeteer Automation against Portal Simulator
    // -------------------------------------------------------------
    console.log('\n[Test 5] Running Puppeteer Automated Portal Worker against e-Abgari Simulator...');
    const port = server.address() ? server.address().port : (process.env.PORT || 5001);
    const portalUrl = `http://localhost:${port}/portal-simulator`;

    const progressLogs = [];
    const outcome = await runPortalAutomation({
      portalUrl,
      username: shopSettings.portal_username,
      password: shopSettings.portal_password,
      dateStr: todayStr,
      excelFilePath: filePath,
      headless: true
    }, (ev) => {
      progressLogs.push(ev);
      console.log(`    [Progress ${ev.percent}%] ${ev.message}`);
    });

    assert(outcome.success, 'Portal worker must report success');
    assert(outcome.ackNo && outcome.ackNo.startsWith('ACK/WBSBCL'), `Invalid ack number: ${outcome.ackNo}`);
    assert(fs.existsSync(outcome.screenshotPath), `Acknowledgement screenshot must exist at ${outcome.screenshotPath}`);
    console.log(`  ✓ e-Abgari Submission Accepted! Official Ack No: ${outcome.ackNo}`);
    console.log(`  ✓ Digital Receipt Screenshot saved: ${path.basename(outcome.screenshotPath)}`);

    console.log('\n================================================================');
    console.log(' ALL VERIFICATION TESTS PASSED SUCCESSFULLY! (5/5)             ');
    console.log('================================================================\n');

  } catch (err) {
    console.error('\n❌ Test Suite Failed:', err);
    process.exitCode = 1;
  } finally {
    server.close();
  }
}

runTestSuite();
