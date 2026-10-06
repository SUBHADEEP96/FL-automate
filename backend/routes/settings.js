const express = require('express');
const router = express.Router();
const db = require('../db/database');

// GET settings
router.get('/', (req, res) => {
  try {
    const settings = db.prepare('SELECT * FROM shop_settings WHERE id = 1').get();
    res.json({ success: true, data: settings });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// PUT update settings
router.put('/', (req, res) => {
  const {
    shop_name,
    license_no,
    licensee_name,
    district,
    excise_range,
    address,
    gstin,
    retailer_code,
    portal_username,
    portal_password,
    portal_url,
    auto_submit_enabled,
    printer_width_mm,
    footer_message
  } = req.body;

  try {
    db.prepare(`
      UPDATE shop_settings SET
        shop_name = COALESCE(?, shop_name),
        license_no = COALESCE(?, license_no),
        licensee_name = COALESCE(?, licensee_name),
        district = COALESCE(?, district),
        excise_range = COALESCE(?, excise_range),
        address = COALESCE(?, address),
        gstin = COALESCE(?, gstin),
        retailer_code = COALESCE(?, retailer_code),
        portal_username = COALESCE(?, portal_username),
        portal_password = COALESCE(?, portal_password),
        portal_url = COALESCE(?, portal_url),
        auto_submit_enabled = COALESCE(?, auto_submit_enabled),
        printer_width_mm = COALESCE(?, printer_width_mm),
        footer_message = COALESCE(?, footer_message)
      WHERE id = 1
    `).run(
      shop_name, license_no, licensee_name, district, excise_range, address, gstin,
      retailer_code, portal_username, portal_password, portal_url,
      auto_submit_enabled, printer_width_mm, footer_message
    );

    const updated = db.prepare('SELECT * FROM shop_settings WHERE id = 1').get();
    res.json({ success: true, data: updated });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
