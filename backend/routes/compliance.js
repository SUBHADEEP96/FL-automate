const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const db = require('../db/database');
const { generateWbsbclDailyReturnExcel } = require('../services/excelReport');
const { runPortalAutomation, fetchPortalCaptcha } = require('../services/portalWorker');
const { computeDSRSummary } = require('../services/exciseEngine');

// Helper to get DSR summary for a date
function getDsrSummaryForDate(dateStr) {
  const products = db.prepare('SELECT * FROM products ORDER BY category, name').all();
  
  // Check if finalized DSR items exist
  const existingDsr = db.prepare('SELECT * FROM daily_stock_register WHERE date = ?').get(dateStr);
  let dsrItemsMap = new Map();
  if (existingDsr) {
    const items = db.prepare('SELECT * FROM dsr_items WHERE dsr_id = ?').all(existingDsr.id);
    dsrItemsMap = new Map(items.map(i => [i.product_id, i]));
  }

  // Get sales and inward for the date
  const salesRows = db.prepare(`
    SELECT si.product_id, SUM(si.qty) as sales_bottles
    FROM sale_items si
    JOIN sales s ON si.sale_id = s.id
    WHERE DATE(s.created_at, 'localtime') = ?
    GROUP BY si.product_id
  `).all(dateStr);
  const salesMap = new Map(salesRows.map(r => [r.product_id, r.sales_bottles]));

  const inwardRows = db.prepare(`
    SELECT ci.product_id, SUM(ci.total_bottles) as inward_bottles
    FROM challan_items ci
    JOIN inward_challans c ON ci.challan_id = c.id
    WHERE c.challan_date = ?
    GROUP BY ci.product_id
  `).all(dateStr);
  const inwardMap = new Map(inwardRows.map(r => [r.product_id, r.inward_bottles]));

  const productRows = products.map(p => {
    const inward = inwardMap.get(p.id) || 0;
    const sales = salesMap.get(p.id) || 0;

    let opening = 0;
    let physicalCount = p.current_stock;

    if (existingDsr && dsrItemsMap.has(p.id)) {
      const saved = dsrItemsMap.get(p.id);
      opening = saved.opening_bottles;
      physicalCount = saved.physical_closing_bottles;
    } else {
      opening = Math.max(0, p.current_stock + sales - inward);
    }

    return {
      productId: p.id,
      code: p.code,
      ean: p.ean,
      name: p.name,
      category: p.category,
      packSizeMl: p.pack_size_ml,
      strengthPct: p.strength_pct,
      mrp: p.mrp,
      costPrice: p.cost_price,
      opening,
      inward,
      sales,
      breakage: 0,
      physicalCount
    };
  });

  return computeDSRSummary(productRows);
}

// 1. GET /api/compliance/export-excel: Download formatted WBSBCL Excel Return
router.get('/export-excel', async (req, res) => {
  try {
    const dateStr = req.query.date || new Date().toISOString().slice(0, 10);
    const shop = db.prepare('SELECT * FROM shop_settings WHERE id = 1').get();
    const summary = getDsrSummaryForDate(dateStr);

    const { filePath, filename } = await generateWbsbclDailyReturnExcel(summary, shop, dateStr);

    res.download(filePath, filename, (err) => {
      if (err) {
        console.error('Error sending excel download:', err);
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 2. GET /api/compliance/portal-info: Pre-flight check before filing
router.get('/portal-info', async (req, res) => {
  try {
    const dateStr = req.query.date || new Date().toISOString().slice(0, 10);
    const shop = db.prepare('SELECT * FROM shop_settings WHERE id = 1').get();
    const dsrRecord = db.prepare('SELECT * FROM daily_stock_register WHERE date = ?').get(dateStr);
    const summary = getDsrSummaryForDate(dateStr);

    res.json({
      success: true,
      data: {
        shop,
        date: dateStr,
        isFinalized: dsrRecord ? dsrRecord.status === 'FINALIZED' || dsrRecord.status === 'SUBMITTED_TO_EABGARI' : false,
        isSubmitted: dsrRecord ? dsrRecord.status === 'SUBMITTED_TO_EABGARI' : false,
        ackNo: dsrRecord ? dsrRecord.eabgari_ack_no : null,
        discrepancyCount: summary.totals.discrepancyCount,
        totals: summary.totals,
        portalUrl: shop.portal_url
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 3. GET /api/compliance/fetch-captcha: Interactively fetch current portal captcha
router.get('/fetch-captcha', async (req, res) => {
  try {
    const shop = db.prepare('SELECT * FROM shop_settings WHERE id = 1').get();
    const captchaData = await fetchPortalCaptcha(shop.portal_url);
    res.json({ success: true, data: captchaData });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 4. POST /api/compliance/trigger-portal-worker: Run Puppeteer Bot to file return
router.post('/trigger-portal-worker', async (req, res) => {
  const {
    date = new Date().toISOString().slice(0, 10),
    captchaSolution,
    headless = false // manager can watch the automated submission in real-time
  } = req.body;

  try {
    const shop = db.prepare('SELECT * FROM shop_settings WHERE id = 1').get();
    const summary = getDsrSummaryForDate(date);

    // Generate Excel statement file
    const { filePath } = await generateWbsbclDailyReturnExcel(summary, shop, date);

    // Progress updates collector
    const progressLogs = [];
    const logProgress = (ev) => {
      progressLogs.push({ ...ev, time: new Date().toISOString() });
    };

    // Run Puppeteer automation
    const outcome = await runPortalAutomation({
      portalUrl: shop.portal_url,
      username: shop.portal_username,
      password: shop.portal_password,
      dateStr: date,
      excelFilePath: filePath,
      captchaSolution,
      headless
    }, logProgress);

    // Update DSR record with Ack No
    const updateStmt = db.prepare(`
      UPDATE daily_stock_register 
      SET eabgari_ack_no = ?, 
          eabgari_submission_time = CURRENT_TIMESTAMP, 
          status = 'SUBMITTED_TO_EABGARI'
      WHERE date = ?
    `);
    const updateResult = updateStmt.run(outcome.ackNo, date);

    // If DSR wasn't recorded yet, create header record
    if (updateResult.changes === 0) {
      db.prepare(`
        INSERT INTO daily_stock_register (
          date, status, eabgari_ack_no, eabgari_submission_time,
          total_opening_bottles, total_inward_bottles, total_sales_bottles, total_closing_bottles,
          total_bulk_litres, total_london_proof_litres, total_sales_value
        ) VALUES (
          ?, 'SUBMITTED_TO_EABGARI', ?, CURRENT_TIMESTAMP,
          ?, ?, ?, ?,
          ?, ?, ?
        )
      `).run(
        date,
        outcome.ackNo,
        summary.totals.totalOpeningBottles,
        summary.totals.totalInwardBottles,
        summary.totals.totalSalesBottles,
        summary.totals.totalClosingBottles,
        summary.totals.totalSalesBL,
        summary.totals.totalSalesLPL,
        summary.totals.totalSalesValue
      );
    }

    res.json({
      success: true,
      data: {
        ackNo: outcome.ackNo,
        message: outcome.message,
        screenshotPath: outcome.screenshotPath,
        logs: progressLogs
      }
    });
  } catch (err) {
    console.error('Portal worker error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
