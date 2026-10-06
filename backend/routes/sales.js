const express = require('express');
const router = express.Router();
const db = require('../db/database');
const { calculateBulkLitres, calculateLondonProofLitres } = require('../services/exciseEngine');

// GET today's sales
router.get('/today', (req, res) => {
  try {
    const today = new Date().toISOString().slice(0, 10);
    const sales = db.prepare(`
      SELECT * FROM sales 
      WHERE DATE(created_at, 'localtime') = ?
      ORDER BY id DESC
    `).all(today);

    // Attach items for each sale
    const getItems = db.prepare(`
      SELECT si.*, p.name, p.code, p.category, p.pack_size_ml, p.strength_pct 
      FROM sale_items si
      JOIN products p ON si.product_id = p.id
      WHERE si.sale_id = ?
    `);

    const result = sales.map(s => ({
      ...s,
      items: getItems.all(s.id).map(item => ({
        ...item,
        hologram_serials: item.hologram_serials ? JSON.parse(item.hologram_serials) : []
      }))
    }));

    res.json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST new sale transaction (Atomic zero-latency checkout)
router.post('/', (req, res) => {
  const {
    cashierId = 'COUNTER_01',
    cashierName = 'Counter Staff',
    paymentMode = 'CASH',
    items = [],
    subtotal,
    discount = 0,
    tax = 0,
    total,
    cashTendered = 0,
    changeReturned = 0,
    upiRefNo = null
  } = req.body;

  if (!items || items.length === 0) {
    return res.status(400).json({ success: false, message: 'Cart items cannot be empty' });
  }

  try {
    // Generate Bill Number
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const countToday = db.prepare(`
      SELECT COUNT(*) as count FROM sales WHERE DATE(created_at, 'localtime') = DATE('now', 'localtime')
    `).get().count;

    const seq = String(countToday + 1).padStart(4, '0');
    const billNo = `WB-FL-${dateStr}-${seq}`;

    // Execute within a single atomic SQLite transaction
    const executeCheckout = db.transaction(() => {
      // 1. Insert Sales Header
      const insertSale = db.prepare(`
        INSERT INTO sales (
          bill_no, cashier_id, cashier_name, payment_mode, subtotal,
          discount, tax, total, cash_tendered, change_returned, upi_ref_no, status
        ) VALUES (
          ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'COMPLETED'
        )
      `);

      const saleResult = insertSale.run(
        billNo, cashierId, cashierName, paymentMode,
        subtotal || total, discount, tax, total,
        cashTendered, changeReturned, upiRefNo
      );
      const saleId = saleResult.lastInsertRowid;

      const insertItem = db.prepare(`
        INSERT INTO sale_items (
          sale_id, product_id, qty, rate, mrp, bulk_litres, london_proof_litres, hologram_serials
        ) VALUES (
          ?, ?, ?, ?, ?, ?, ?, ?
        )
      `);

      const updateStock = db.prepare(`
        UPDATE products SET current_stock = current_stock - ? WHERE id = ?
      `);

      const updateHologram = db.prepare(`
        UPDATE holograms 
        SET status = 'SOLD', sale_id = ?, scanned_at = CURRENT_TIMESTAMP
        WHERE serial_number = ? AND product_id = ?
      `);

      const processedItems = [];

      for (const item of items) {
        const prod = db.prepare('SELECT * FROM products WHERE id = ?').get(item.productId);
        if (!prod) {
          throw new Error(`Product ID ${item.productId} not found`);
        }

        const qty = Number(item.qty || 1);
        const rate = Number(item.rate || prod.mrp);
        const bl = calculateBulkLitres(qty, prod.pack_size_ml);
        const lpl = calculateLondonProofLitres(bl, prod.strength_pct);
        const holograms = Array.isArray(item.scannedHolograms) ? item.scannedHolograms : [];

        // Insert item record
        insertItem.run(
          saleId,
          prod.id,
          qty,
          rate,
          prod.mrp,
          bl,
          lpl,
          JSON.stringify(holograms)
        );

        // Deduct inventory
        updateStock.run(qty, prod.id);

        // Mark scanned holograms as sold
        for (const serial of holograms) {
          updateHologram.run(saleId, serial, prod.id);
        }

        processedItems.push({
          productId: prod.id,
          code: prod.code,
          name: prod.name,
          category: prod.category,
          packSizeMl: prod.pack_size_ml,
          strengthPct: prod.strength_pct,
          qty,
          rate,
          mrp: prod.mrp,
          bulkLitres: bl,
          londonProofLitres: lpl,
          holograms
        });
      }

      return { saleId, billNo, items: processedItems };
    });

    const checkoutData = executeCheckout();

    // Fetch shop settings for receipt
    const shop = db.prepare('SELECT * FROM shop_settings WHERE id = 1').get();

    res.json({
      success: true,
      data: {
        id: checkoutData.saleId,
        billNo: checkoutData.billNo,
        createdAt: new Date().toISOString(),
        cashierId,
        cashierName,
        paymentMode,
        subtotal: subtotal || total,
        discount,
        total,
        cashTendered,
        changeReturned,
        upiRefNo,
        items: checkoutData.items,
        shop
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
