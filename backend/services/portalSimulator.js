/**
 * West Bengal e-Abgari / WBSBCL Retailer Portal Simulator
 * 
 * Provides an authentic Government of West Bengal Excise Retailer Portal UI
 * for end-to-end testing and demonstration of the Puppeteer automation worker.
 */

const express = require('express');
const router = express.Router();
const multer = require('multer');
const upload = multer({ dest: 'backend/data/uploads/' });

// In-memory simulator session store
const simulatorSessions = new Map();

// Helper to generate a random 5-character Captcha string
function generateCaptcha() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 5; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

// 1. GET /portal-simulator: Login Page
router.get('/', (req, res) => {
  const captcha = generateCaptcha();
  simulatorSessions.set('current_captcha', captcha);

  res.send(`
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>West Bengal State Beverages Corp (WBSBCL) - Retailer Portal</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif; background: #f0f4f8; margin: 0; padding: 0; color: #1e293b; }
    .header { background: #064e3b; color: #ffffff; padding: 16px 32px; display: flex; align-items: center; justify-content: space-between; border-bottom: 4px solid #10b981; }
    .header h1 { margin: 0; font-size: 20px; font-weight: 700; letter-spacing: 0.5px; }
    .header p { margin: 4px 0 0; font-size: 13px; color: #a7f3d0; }
    .container { max-width: 520px; margin: 48px auto; background: #ffffff; border-radius: 8px; box-shadow: 0 4px 20px rgba(0,0,0,0.08); overflow: hidden; border: 1px solid #e2e8f0; }
    .panel-header { background: #0f172a; color: white; padding: 16px 24px; font-size: 16px; font-weight: 600; }
    .panel-body { padding: 28px 24px; }
    .form-group { margin-bottom: 20px; }
    label { display: block; font-size: 13px; font-weight: 600; color: #334155; margin-bottom: 6px; }
    input[type="text"], input[type="password"] { width: 100%; box-sizing: border-box; padding: 10px 12px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 14px; }
    input:focus { border-color: #059669; outline: none; box-shadow: 0 0 0 3px rgba(5,150,105,0.15); }
    .captcha-container { display: flex; align-items: center; gap: 12px; }
    .captcha-badge { background: #1e293b; color: #38bdf8; font-family: monospace; font-size: 22px; font-weight: bold; letter-spacing: 6px; padding: 8px 16px; border-radius: 6px; text-decoration: line-through; user-select: none; }
    .btn-submit { width: 100%; background: #059669; color: white; border: none; padding: 12px; border-radius: 6px; font-size: 15px; font-weight: 600; cursor: pointer; transition: background 0.2s; }
    .btn-submit:hover { background: #047857; }
    .footer { text-align: center; margin-top: 32px; font-size: 12px; color: #64748b; }
    .error-msg { background: #fee2e2; border: 1px solid #ef4444; color: #991b1b; padding: 10px 14px; border-radius: 6px; font-size: 13px; margin-bottom: 16px; }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <h1>e-Abgari | Directorate of Excise</h1>
      <p>Government of West Bengal — WBSBCL Retailer Compliance System</p>
    </div>
    <div style="font-size: 12px; background: #047857; padding: 6px 12px; border-radius: 4px;">SECURE SSL GATEWAY</div>
  </div>

  <div class="container">
    <div class="panel-header">Retailer Login (FL Off-Shop Returns)</div>
    <div class="panel-body">
      ${req.query.error ? `<div class="error-msg">${req.query.error}</div>` : ''}
      <form action="/portal-simulator/login" method="POST" id="loginForm">
        <div class="form-group">
          <label for="username">Retailer ID / User ID</label>
          <input type="text" id="username" name="username" placeholder="e.g. RET_KOL_8912" required value="${req.query.user || ''}">
        </div>
        <div class="form-group">
          <label for="password">Portal Password</label>
          <input type="password" id="password" name="password" placeholder="••••••••••••" required>
        </div>
        <div class="form-group">
          <label>Security Code (Captcha)</label>
          <div class="captcha-container">
            <span class="captcha-badge" id="captchaText">${captcha}</span>
            <input type="text" id="captchaInput" name="captcha" placeholder="Enter 5 characters" style="width: 160px;" required>
          </div>
        </div>
        <button type="submit" id="submitLoginBtn" class="btn-submit">Authenticate & Access e-Abgari</button>
      </form>
    </div>
  </div>

  <div class="footer">
    © 2026 Directorate of Excise, Government of West Bengal. All rights reserved.
  </div>
</body>
</html>
  `);
});

// 2. POST /portal-simulator/login
router.post('/login', express.urlencoded({ extended: true }), (req, res) => {
  const { username, password, captcha } = req.body;
  const currentCaptcha = simulatorSessions.get('current_captcha');

  // Verify Captcha
  if (!captcha || captcha.toUpperCase() !== currentCaptcha) {
    return res.redirect(`/portal-simulator?error=Invalid%20Security%20Captcha%20Code&user=${encodeURIComponent(username || '')}`);
  }

  // Set session
  const token = 'WB-EXCISE-SESSION-' + Math.random().toString(36).substring(2, 10).toUpperCase();
  simulatorSessions.set(token, { username, loginTime: new Date() });

  res.redirect(`/portal-simulator/dashboard?token=${token}`);
});

// 3. GET /portal-simulator/dashboard (Daily Return Upload form)
router.get('/dashboard', (req, res) => {
  const token = req.query.token;
  if (!token || !simulatorSessions.has(token)) {
    return res.redirect('/portal-simulator?error=Session%20expired.%20Please%20log%20in%20again.');
  }

  const session = simulatorSessions.get(token);
  const todayStr = new Date().toISOString().slice(0, 10);

  res.send(`
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>e-Abgari - Daily Return Filing</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif; background: #f8fafc; margin: 0; color: #1e293b; }
    .topbar { background: #064e3b; color: white; padding: 14px 28px; display: flex; justify-content: space-between; align-items: center; }
    .card { max-width: 760px; margin: 36px auto; background: white; border-radius: 8px; border: 1px solid #cbd5e1; box-shadow: 0 4px 12px rgba(0,0,0,0.05); }
    .card-header { background: #0f172a; color: white; padding: 16px 24px; border-radius: 7px 7px 0 0; font-weight: 600; }
    .card-body { padding: 28px; }
    .info-row { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 20px; background: #f1f5f9; padding: 16px; border-radius: 6px; font-size: 13px; }
    .form-group { margin-bottom: 20px; }
    label { display: block; font-size: 13px; font-weight: 600; margin-bottom: 6px; color: #334155; }
    input[type="text"], input[type="date"], input[type="file"] { width: 100%; box-sizing: border-box; padding: 10px; border: 1px solid #cbd5e1; border-radius: 6px; }
    .btn-upload { background: #059669; color: white; border: none; padding: 14px 24px; border-radius: 6px; font-size: 15px; font-weight: 600; cursor: pointer; width: 100%; margin-top: 10px; }
    .btn-upload:hover { background: #047857; }
  </style>
</head>
<body>
  <div class="topbar">
    <div><strong>e-Abgari Daily Return Portal</strong> | West Bengal State Beverages Corp Ltd.</div>
    <div style="font-size: 13px;">Logged in: <strong>${session.username}</strong> | License: <strong>WB/EX/FL/KOL-NORTH/0492</strong></div>
  </div>

  <div class="card">
    <div class="card-header">Form DSR-3: Retail Off-Shop Daily Sales & Stock Register Submission</div>
    <div class="card-body">
      <div class="info-row">
        <div><strong>Licensee:</strong> M/s Ghosh & Banerjee Enterprises</div>
        <div><strong>Range:</strong> Cossipore - Shyambazar Range</div>
        <div><strong>Category:</strong> Foreign Liquor (FL "OFF" SHOP)</div>
        <div><strong>Session Valid Till:</strong> 23:59:59 IST</div>
      </div>

      <form action="/portal-simulator/submit-return" method="POST" enctype="multipart/form-data" id="returnForm">
        <input type="hidden" name="token" value="${token}">
        <div class="form-group">
          <label for="returnDate">Date of Return</label>
          <input type="date" id="returnDate" name="returnDate" value="${todayStr}" required>
        </div>
        <div class="form-group">
          <label for="closingFile">Upload Official WBSBCL Excel Statement (.xlsx)</label>
          <input type="file" id="closingFile" name="closingFile" accept=".xlsx,.xls,.csv" required>
          <div style="font-size: 12px; color: #64748b; margin-top: 4px;">Ensure the uploaded file is generated from the certified retail POS module.</div>
        </div>
        <div class="form-group">
          <label for="remarks">Manager Declaration / Remarks</label>
          <input type="text" id="remarks" name="remarks" value="Reconciled with physical counter stock. No discrepancies found.">
        </div>
        <button type="submit" id="btnSubmitReturn" class="btn-upload">Submit Daily Return to West Bengal Excise</button>
      </form>
    </div>
  </div>
</body>
</html>
  `);
});

// 4. POST /portal-simulator/submit-return: Receive file and issue Acknowledgement
router.post('/submit-return', upload.single('closingFile'), (req, res) => {
  const { token, returnDate, remarks } = req.body;
  const ackNumber = 'ACK/WBSBCL/' + returnDate.replace(/-/g, '') + '/' + Math.floor(100000 + Math.random() * 900000);
  const timestamp = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });

  res.send(`
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>e-Abgari Acknowledgement Receipt</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif; background: #f8fafc; margin: 0; color: #1e293b; }
    .receipt-box { max-width: 650px; margin: 40px auto; background: white; border: 2px solid #059669; border-radius: 8px; padding: 32px; box-shadow: 0 10px 25px rgba(0,0,0,0.06); }
    .stamp { border: 2px dashed #059669; color: #059669; font-weight: bold; padding: 12px; text-align: center; font-size: 18px; margin: 20px 0; border-radius: 6px; letter-spacing: 1px; }
    .table { width: 100%; border-collapse: collapse; margin-top: 16px; }
    .table td { padding: 8px 12px; border-bottom: 1px solid #e2e8f0; font-size: 14px; }
    .table td:first-child { font-weight: 600; color: #475569; width: 40%; }
    .print-btn { background: #0f172a; color: white; border: none; padding: 10px 20px; border-radius: 6px; cursor: pointer; font-size: 14px; margin-top: 20px; }
  </style>
</head>
<body>
  <div class="receipt-box" id="ackReceiptCard">
    <div style="text-align: center;">
      <h2 style="margin: 0; color: #064e3b;">DIRECTORATE OF EXCISE</h2>
      <h3 style="margin: 4px 0; color: #334155;">GOVERNMENT OF WEST BENGAL</h3>
      <div style="font-size: 12px; color: #64748b;">West Bengal State Beverages Corporation Limited (WBSBCL)</div>
    </div>

    <div class="stamp" id="ackStamp">
      ✓ RETURN ACCEPTED & RECORDED
    </div>

    <table class="table">
      <tr><td>e-Abgari Ack No:</td><td id="ackNumber"><strong>${ackNumber}</strong></td></tr>
      <tr><td>Filing Date:</td><td>${returnDate}</td></tr>
      <tr><td>Submission Time:</td><td id="submissionTime">${timestamp} IST</td></tr>
      <tr><td>License Number:</td><td>WB/EX/FL/KOL-NORTH/0492/2024-25</td></tr>
      <tr><td>Retailer Code:</td><td>WBSBCL-RET-KOL-8912</td></tr>
      <tr><td>File Uploaded:</td><td>${req.file ? req.file.originalname : 'WBSBCL_Daily_Return.xlsx'}</td></tr>
      <tr><td>Excise Verification:</td><td><span style="color: #059669; font-weight: 600;">DIGITALLY VERIFIED (NO DISCREPANCIES)</span></td></tr>
      <tr><td>Remarks:</td><td>${remarks || 'Reconciled'}</td></tr>
    </table>

    <div style="margin-top: 24px; text-align: center; font-size: 12px; color: #64748b;">
      This is a system generated acknowledgement for statutory compliance under Bengal Excise Act, 1909.
    </div>
  </div>
</body>
</html>
  `);
});

// JSON API for programmatically reading captcha or verification
router.get('/api/captcha-value', (req, res) => {
  const currentCaptcha = simulatorSessions.get('current_captcha') || generateCaptcha();
  simulatorSessions.set('current_captcha', currentCaptcha);
  res.json({ captcha: currentCaptcha });
});

module.exports = router;
