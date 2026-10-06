const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const { seedDatabase } = require('./db/seed');
const productsRouter = require('./routes/products');
const salesRouter = require('./routes/sales');
const inventoryRouter = require('./routes/inventory');
const dsrRouter = require('./routes/dsr');
const complianceRouter = require('./routes/compliance');
const settingsRouter = require('./routes/settings');
const portalSimulatorRouter = require('./services/portalSimulator');

const app = express();
const PORT = process.env.PORT || 5001;

// Ensure directories exist
const dataDir = path.join(__dirname, 'data');
const exportsDir = path.join(dataDir, 'exports');
const receiptsDir = path.join(dataDir, 'receipts');
[dataDir, exportsDir, receiptsDir].forEach(dir => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static exports & receipt screenshots
app.use('/data/exports', express.static(exportsDir));
app.use('/data/receipts', express.static(receiptsDir));

// Mount e-Abgari / WBSBCL Retailer Portal Simulator
app.use('/portal-simulator', portalSimulatorRouter);

// Mount POS & Compliance API Routes
app.use('/api/products', productsRouter);
app.use('/api/sales', salesRouter);
app.use('/api/inventory', inventoryRouter);
app.use('/api/dsr', dsrRouter);
app.use('/api/compliance', complianceRouter);
app.use('/api/settings', settingsRouter);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ONLINE',
    service: 'West Bengal FL Off-Shop POS & Compliance Engine',
    timestamp: new Date().toISOString(),
    version: '2.4.0'
  });
});

// Run seed on launch
try {
  seedDatabase();
} catch (err) {
  console.error('[Error] Seed execution failed:', err);
}

// Start local Express server
const server = app.listen(PORT, () => {
  console.log(`================================================================`);
  console.log(` West Bengal FL Off-Shop POS Engine & Compliance Server Started `);
  console.log(` Listening on: http://localhost:${PORT}                           `);
  console.log(` Portal Simulator: http://localhost:${PORT}/portal-simulator       `);
  console.log(`================================================================`);
});

module.exports = { app, server };
