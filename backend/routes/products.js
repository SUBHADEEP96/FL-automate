const express = require('express');
const router = express.Router();
const db = require('../db/database');

// GET all products with stock and barcode info
router.get('/', (req, res) => {
  try {
    const products = db.prepare(`
      SELECT 
        p.*,
        (SELECT COUNT(*) FROM holograms h WHERE h.product_id = p.id AND h.status = 'IN_STOCK') as in_stock_hologram_count
      FROM products p
      ORDER BY p.category, p.name
    `).all();
    res.json({ success: true, data: products });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET search products by name, code, or ean
router.get('/search', (req, res) => {
  try {
    const query = req.query.q ? req.query.q.trim() : '';
    if (!query) {
      const all = db.prepare('SELECT * FROM products ORDER BY name LIMIT 50').all();
      return res.json({ success: true, data: all });
    }

    const products = db.prepare(`
      SELECT * FROM products 
      WHERE name LIKE ? OR code LIKE ? OR ean LIKE ?
      ORDER BY name LIMIT 30
    `).all(`%${query}%`, `%${query}%`, `%${query}%`);

    res.json({ success: true, data: products });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET resolve barcode (EAN-13 or 2D Excise Hologram serial)
router.get('/by-barcode/:code', (req, res) => {
  try {
    const code = req.params.code.trim();

    // 1. Check if it matches an Excise Security Hologram Serial Number
    const hologram = db.prepare(`
      SELECT h.*, p.id as product_id, p.code, p.ean, p.name, p.category, p.pack_size_ml, p.strength_pct, p.mrp, p.cost_price, p.current_stock
      FROM holograms h
      JOIN products p ON h.product_id = p.id
      WHERE h.serial_number = ?
    `).get(code);

    if (hologram) {
      return res.json({
        success: true,
        type: 'HOLOGRAM',
        matchedHologram: hologram.serial_number,
        hologramStatus: hologram.status,
        product: {
          id: hologram.product_id,
          code: hologram.code,
          ean: hologram.ean,
          name: hologram.name,
          category: hologram.category,
          pack_size_ml: hologram.pack_size_ml,
          strength_pct: hologram.strength_pct,
          mrp: hologram.mrp,
          cost_price: hologram.cost_price,
          current_stock: hologram.current_stock
        }
      });
    }

    // 2. Check if it matches an EAN-13 or SKU Code
    const product = db.prepare(`
      SELECT * FROM products WHERE ean = ? OR code = ?
    `).get(code, code);

    if (product) {
      return res.json({
        success: true,
        type: 'PRODUCT',
        product
      });
    }

    res.status(404).json({
      success: false,
      message: `No product or excise security seal found matching '${code}'`
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
