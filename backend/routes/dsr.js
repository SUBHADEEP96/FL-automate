const express = require('express');
const router = express.Router();
const db = require('../db/database');
const { computeDSRSummary, calculateBulkLitres, calculateLondonProofLitres } = require('../services/exciseEngine');

// Helper to compute live DSR data for a given date
function getLiveDSRDataForDate(dateStr) {
  // Check if finalized DSR already exists
  const existingDsr = db.prepare('SELECT * FROM daily_stock_register WHERE date = ?').get(dateStr);

  // Get all active products
  const products = db.prepare('SELECT * FROM products ORDER BY category, name').all();

  // Get inward receipts today
  const inwardRows = db.prepare(`
    SELECT ci.product_id, SUM(ci.total_bottles) as inward_bottles
    FROM challan_items ci
    JOIN inward_challans c ON ci.challan_id = c.id
    WHERE c.challan_date = ?
    GROUP BY ci.product_id
  `).all(dateStr);
  const inwardMap = new Map(inwardRows.map(r => [r.product_id, r.inward_bottles]));

  // Get sales today
  const salesRows = db.prepare(`
    SELECT si.product_id, SUM(si.qty) as sales_bottles
    FROM sale_items si
    JOIN sales s ON si.sale_id = s.id
    WHERE DATE(s.created_at, 'localtime') = ?
    GROUP BY si.product_id
  `).all(dateStr);
  const salesMap = new Map(salesRows.map(r => [r.product_id, r.sales_bottles]));

  // If already finalized, fetch dsr_items
  let dsrItemsMap = new Map();
  if (existingDsr) {
    const items = db.prepare('SELECT * FROM dsr_items WHERE dsr_id = ?').all(existingDsr.id);
    dsrItemsMap = new Map(items.map(i => [i.product_id, i]));
  }

  // Construct items
  const productRows = products.map(p => {
    const inward = inwardMap.get(p.id) || 0;
    const sales = salesMap.get(p.id) || 0;
    const breakage = 0;

    let opening = 0;
    let physicalCount = null;

    if (existingDsr && dsrItemsMap.has(p.id)) {
      const saved = dsrItemsMap.get(p.id);
      opening = saved.opening_bottles;
      physicalCount = saved.physical_closing_bottles;
    } else {
      // Opening = current_stock + sales - inward
      // (since current_stock has already deducted sales and added inward)
      opening = Math.max(0, p.current_stock + sales - inward);
      physicalCount = p.current_stock;
    }

    return {
      productId: p.id,
      code: p.code,
      ean: p.ean,
      name: p.name,
      category: p.category,
      subCategory: p.sub_category,
      packSizeMl: p.pack_size_ml,
      strengthPct: p.strength_pct,
      mrp: p.mrp,
      costPrice: p.cost_price,
      opening,
      inward,
      sales,
      breakage,
      physicalCount: physicalCount !== null ? physicalCount : (opening + inward - sales)
    };
  });

  const dsrSummary = computeDSRSummary(productRows);

  return {
    date: dateStr,
    status: existingDsr ? existingDsr.status : 'OPEN',
    existingDsr: existingDsr || null,
    summary: dsrSummary
  };
}

// GET today's DSR
router.get('/today', (req, res) => {
  try {
    const today = new Date().toISOString().slice(0, 10);
    const data = getLiveDSRDataForDate(today);
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET DSR for a specific date
router.get('/:date', (req, res) => {
  try {
    const dateStr = req.params.date;
    const data = getLiveDSRDataForDate(dateStr);
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST finalize End-Of-Day (EOD) Day-Close Wizard
router.post('/close-day', (req, res) => {
  const {
    date = new Date().toISOString().slice(0, 10),
    closedBy = 'Manager',
    physicalCounts = {}, // map of productId -> physical bottle count
    breakages = {}       // map of productId -> breakage bottle count
  } = req.body;

  try {
    const closeTransaction = db.transaction(() => {
      // 1. Get baseline data
      const liveData = getLiveDSRDataForDate(date);
      const itemsToProcess = liveData.summary.items.map(item => {
        const physical = physicalCounts[item.productId] !== undefined 
          ? Number(physicalCounts[item.productId]) 
          : item.expectedClosing;
        const breakage = breakages[item.productId] !== undefined 
          ? Number(breakages[item.productId]) 
          : 0;

        return {
          ...item,
          physicalCount: physical,
          breakage
        };
      });

      const updatedSummary = computeDSRSummary(itemsToProcess);

      // Check if DSR header already exists
      let dsr = db.prepare('SELECT id FROM daily_stock_register WHERE date = ?').get(date);
      let dsrId;

      if (dsr) {
        dsrId = dsr.id;
        db.prepare(`
          UPDATE daily_stock_register SET
            closing_time = CURRENT_TIMESTAMP,
            closed_by = ?,
            status = 'FINALIZED',
            total_opening_bottles = ?,
            total_inward_bottles = ?,
            total_sales_bottles = ?,
            total_breakage_bottles = ?,
            total_closing_bottles = ?,
            total_bulk_litres = ?,
            total_london_proof_litres = ?,
            total_sales_value = ?,
            discrepancy_count = ?
          WHERE id = ?
        `).run(
          closedBy,
          updatedSummary.totals.totalOpeningBottles,
          updatedSummary.totals.totalInwardBottles,
          updatedSummary.totals.totalSalesBottles,
          updatedSummary.totals.totalBreakageBottles,
          updatedSummary.totals.totalClosingBottles,
          updatedSummary.totals.totalSalesBL,
          updatedSummary.totals.totalSalesLPL,
          updatedSummary.totals.totalSalesValue,
          updatedSummary.totals.discrepancyCount,
          dsrId
        );

        db.prepare('DELETE FROM dsr_items WHERE dsr_id = ?').run(dsrId);
      } else {
        const insertDsr = db.prepare(`
          INSERT INTO daily_stock_register (
            date, opening_time, closing_time, closed_by, status,
            total_opening_bottles, total_inward_bottles, total_sales_bottles, total_breakage_bottles, total_closing_bottles,
            total_bulk_litres, total_london_proof_litres, total_sales_value, discrepancy_count
          ) VALUES (
            ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, ?, 'FINALIZED',
            ?, ?, ?, ?, ?,
            ?, ?, ?, ?
          )
        `);

        const res = insertDsr.run(
          date,
          closedBy,
          updatedSummary.totals.totalOpeningBottles,
          updatedSummary.totals.totalInwardBottles,
          updatedSummary.totals.totalSalesBottles,
          updatedSummary.totals.totalBreakageBottles,
          updatedSummary.totals.totalClosingBottles,
          updatedSummary.totals.totalSalesBL,
          updatedSummary.totals.totalSalesLPL,
          updatedSummary.totals.totalSalesValue,
          updatedSummary.totals.discrepancyCount
        );
        dsrId = res.lastInsertRowid;
      }

      // Insert dsr_items
      const insertDsrItem = db.prepare(`
        INSERT INTO dsr_items (
          dsr_id, product_id, opening_bottles, inward_bottles, sales_bottles, breakage_bottles,
          expected_closing_bottles, physical_closing_bottles, discrepancy_bottles,
          bulk_litres, london_proof_litres, sales_value
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      for (const item of updatedSummary.items) {
        insertDsrItem.run(
          dsrId,
          item.productId,
          item.opening,
          item.inward,
          item.sales,
          item.breakage,
          item.expectedClosing,
          item.physicalClosing,
          item.discrepancy,
          item.salesBL,
          item.salesLPL,
          item.salesValue
        );

        // Synchronize product current_stock to physical closing
        db.prepare('UPDATE products SET current_stock = ? WHERE id = ?').run(item.physicalClosing, item.productId);
      }

      return {
        dsrId,
        date,
        status: 'FINALIZED',
        summary: updatedSummary
      };
    });

    const result = closeTransaction();
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
