const express = require('express');
const router = express.Router();
const db = require('../db/database');

// GET all inward challans
router.get('/challans', (req, res) => {
  try {
    const challans = db.prepare(`
      SELECT * FROM inward_challans ORDER BY id DESC
    `).all();

    const getItems = db.prepare(`
      SELECT ci.*, p.name as product_name, p.code as product_code, p.category, p.pack_size_ml
      FROM challan_items ci
      JOIN products p ON ci.product_id = p.id
      WHERE ci.challan_id = ?
    `);

    const result = challans.map(c => ({
      ...c,
      items: getItems.all(c.id)
    }));

    res.json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST receive new Inward Challan (updates stock and adds holograms)
router.post('/challans', (req, res) => {
  const {
    challanNo,
    challanDate = new Date().toISOString().slice(0, 10),
    sourceDepot = 'WBSBCL Central Depot - Kolkata',
    vehicleNo,
    items = [] // array of { productId, batchNo, cases, bottlesPerCase, purchaseRate, mrp }
  } = req.body;

  if (!challanNo || !items || items.length === 0) {
    return res.status(400).json({ success: false, message: 'Challan No and items are required' });
  }

  try {
    const processChallan = db.transaction(() => {
      let totalCases = 0;
      let totalBottles = 0;
      let totalAmount = 0;

      for (const item of items) {
        const cases = Number(item.cases || 0);
        const bottlesPerCase = Number(item.bottlesPerCase || 12);
        const btls = Number(item.totalBottles || cases * bottlesPerCase);
        const rate = Number(item.purchaseRate || 0);

        totalCases += cases;
        totalBottles += btls;
        totalAmount += btls * rate;
      }

      // Insert Challan Header
      const insertChallan = db.prepare(`
        INSERT INTO inward_challans (
          challan_no, challan_date, source_depot, vehicle_no, total_cases, total_bottles, total_amount, status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, 'VERIFIED')
      `);
      const challanRes = insertChallan.run(
        challanNo, challanDate, sourceDepot, vehicleNo, totalCases, totalBottles, totalAmount
      );
      const challanId = challanRes.lastInsertRowid;

      const insertItem = db.prepare(`
        INSERT INTO challan_items (
          challan_id, product_id, batch_no, cases, bottles_per_case, total_bottles, purchase_rate, mrp
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `);

      const updateStock = db.prepare(`
        UPDATE products SET current_stock = current_stock + ? WHERE id = ?
      `);

      const insertHologram = db.prepare(`
        INSERT INTO holograms (serial_number, product_id, batch_no, inward_challan_id, status)
        VALUES (?, ?, ?, ?, 'IN_STOCK')
      `);

      for (const item of items) {
        const cases = Number(item.cases || 0);
        const bottlesPerCase = Number(item.bottlesPerCase || 12);
        const btls = Number(item.totalBottles || cases * bottlesPerCase);
        const rate = Number(item.purchaseRate || 0);
        const mrp = Number(item.mrp || 0);

        insertItem.run(challanId, item.productId, item.batchNo || 'B26-GEN', cases, bottlesPerCase, btls, rate, mrp);
        updateStock.run(btls, item.productId);

        // Generate track & trace security hologram entries for the newly received consignment
        const prod = db.prepare('SELECT * FROM products WHERE id = ?').get(item.productId);
        const stamp = Date.now().toString().slice(-4);
        for (let i = 1; i <= Math.min(btls, 12); i++) {
          const serial = `WB26EX${prod.pack_size_ml}${challanId}${stamp}${String(i).padStart(3, '0')}`;
          insertHologram.run(serial, prod.id, item.batchNo || 'B26-GEN', challanId);
        }
      }

      return { challanId, totalBottles, totalAmount };
    });

    const result = processChallan();
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET holograms for product
router.get('/holograms', (req, res) => {
  try {
    const { productId, status } = req.query;
    let sql = 'SELECT h.*, p.name, p.code, p.category, p.pack_size_ml FROM holograms h JOIN products p ON h.product_id = p.id WHERE 1=1';
    const params = [];

    if (productId) {
      sql += ' AND h.product_id = ?';
      params.push(productId);
    }
    if (status) {
      sql += ' AND h.status = ?';
      params.push(status);
    }

    sql += ' ORDER BY h.id DESC LIMIT 100';

    const list = db.prepare(sql).all(...params);
    res.json({ success: true, data: list });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
