const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const { formatReceiptText } = require('./formatter');
const { printRawText } = require('./printer');
const { fetchJson } = require('./http-client');

const app = express();
const PORT = process.env.PORT || 3000;
const SERVER_API_URL = process.env.SERVER_API_URL || process.env.KETAPANG_SERVER_URL || process.env.PONTIANAK_SERVER_URL || 'http://localhost:3000';
const DEFAULT_PRINTER_NAME = process.env.PRINTER_NAME || 'LX310';

function resolveServerUrl(branch) {
  if (process.env.SERVER_API_URL) return process.env.SERVER_API_URL;
  const b = (branch || '').toLowerCase();
  if (b === 'pontianak' || b === 'pusat') {
    return process.env.PONTIANAK_SERVER_URL || process.env.HOST_PONTIANAK || 'http://localhost:9090';
  }
  if (b === 'ketapang' || b === 'cabang') {
    return process.env.KETAPANG_SERVER_URL || process.env.HOST_KETAPANG || 'http://localhost:8080';
  }
  return SERVER_API_URL;
}

// Enable CORS and Private Network Access (PNA) for requests from HTTPS sites
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Access-Control-Request-Private-Network');
  if (req.headers['access-control-request-private-network']) {
    res.setHeader('Access-Control-Allow-Private-Network', 'true');
  }
  if (req.method === 'OPTIONS') {
    return res.sendStatus(204);
  }
  next();
});
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Config endpoint
app.get('/api/config', (req, res) => {
  res.json({
    serverApiUrl: SERVER_API_URL,
    defaultPrinterName: DEFAULT_PRINTER_NAME
  });
});

// API endpoint to directly trigger raw print with text data
app.post('/api/print-raw', (req, res) => {
  const { textData, printerName } = req.body;
  if (!textData) {
    return res.status(400).json({ success: false, message: 'textData is required' });
  }

  const printer = printerName || DEFAULT_PRINTER_NAME;

  printRawText(textData, printer, (err, output) => {
    if (err) {
      return res.status(500).json({
        success: false,
        message: 'Gagal print: ' + err.message
      });
    }
    res.json({
      success: true,
      message: 'Berhasil dikirim ke printer ' + printer
    });
  });
});

// API endpoint to fetch detail from remote POS server and print directly
app.post('/api/print-by-nota', async (req, res) => {
  const { no_nota, branch, printerName } = req.body;
  if (!no_nota) {
    return res.status(400).json({ success: false, message: 'no_nota is required' });
  }

  const serverUrl = resolveServerUrl(branch);

  try {
    const fetchUrl = `${serverUrl.replace(/\/$/, '')}/api/penjualan/nota/${encodeURIComponent(no_nota)}`;
    const result = await fetchJson(fetchUrl);

    if (!result.success || !result.data) {
      return res.status(404).json({
        success: false,
        message: result.message || 'Data nota tidak ditemukan di server'
      });
    }

    const formatted = formatReceiptText(result.data, branch);
    const printer = printerName || DEFAULT_PRINTER_NAME;

    printRawText(formatted.textData, printer, (err) => {
      if (err) {
        return res.status(500).json({
          success: false,
          message: 'Gagal print: ' + err.message,
          formattedLines: formatted.lines
        });
      }
      res.json({
        success: true,
        message: 'Berhasil dikirim ke printer ' + printer,
        formattedLines: formatted.lines
      });
    });
  } catch (err) {
    const statusCode = err.response ? err.response.status : null;
    const errMsg = (err.response && err.response.data && err.response.data.message)
      || err.message
      || 'Gagal mengambil data dari server POS';

    console.error(`Error fetching sales detail for ${no_nota}:`, errMsg);
    res.status(statusCode === 404 ? 404 : 500).json({
      success: false,
      message: statusCode === 404
        ? 'Nota tidak ditemukan di server POS'
        : 'Gagal mengambil data dari server POS: ' + errMsg
    });
  }
});

// Serve the printing UI page
const servePrintPage = (req, res) => {
  const noNotaParam = req.params.no_nota || req.query.no_nota || '';
  const branchParam = req.params.branch || req.query.branch || '';

  const html = `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Mencetak Nota ${noNotaParam}</title>
  <style>
    * { box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      background-color: #f8f9fa;
      margin: 0;
      padding: 0;
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 100vh;
      color: #333;
    }
    .card {
      background: #ffffff;
      padding: 2.2rem 2rem;
      border-radius: 12px;
      box-shadow: 0 4px 20px rgba(0,0,0,0.08);
      width: 90%;
      max-width: 440px;
      text-align: center;
    }
    .spinner {
      border: 4px solid #f3f3f3;
      border-top: 4px solid #0d6efd;
      border-radius: 50%;
      width: 48px;
      height: 48px;
      animation: spin 1s linear infinite;
      margin: 15px auto 20px auto;
    }
    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
    .status {
      font-size: 1.15rem;
      font-weight: 600;
      margin-bottom: 8px;
    }
    .subtitle {
      font-size: 0.9rem;
      color: #6c757d;
    }
    .error-box {
      background-color: #f8d7da;
      color: #842029;
      padding: 12px;
      border-radius: 6px;
      margin-top: 18px;
      font-size: 0.9rem;
      text-align: left;
      word-break: break-word;
      display: none;
    }
  </style>
</head>
<body>
  <div class="card">
    <div id="spinner" class="spinner"></div>
    <div id="status" class="status">Mengambil data & mencetak...</div>
    <div id="subtitle" class="subtitle">Mohon tunggu, tab ini akan tertutup otomatis.</div>
    <div id="errorBox" class="error-box"></div>
  </div>

  <script>
    const noNota = ${JSON.stringify(noNotaParam)};
    const branch = ${JSON.stringify(branchParam)};

    async function processPrint() {
      if (!noNota) {
        showError("Nomor nota tidak ditemukan pada parameter URL.");
        return;
      }

      try {
        const response = await fetch('/api/print-by-nota', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ no_nota: noNota, branch: branch })
        });

        const result = await response.json();

        if (result.success) {
          document.getElementById('spinner').style.display = 'none';
          document.getElementById('status').innerText = 'Pencetakan Berhasil!';
          document.getElementById('subtitle').innerText = 'Menutup halaman...';

          setTimeout(() => {
            window.close();
          }, 800);
        } else {
          showError(result.message || 'Gagal melakukan pencetakan');
        }
      } catch (err) {
        showError("Terjadi kesalahan jaringan atau service: " + err.message);
      }
    }

    function showError(msg) {
      document.getElementById('spinner').style.display = 'none';
      document.getElementById('status').innerText = 'Pencetakan Gagal';
      document.getElementById('subtitle').innerText = 'Silakan tutup tab ini dan coba lagi.';
      const errBox = document.getElementById('errorBox');
      errBox.innerText = msg;
      errBox.style.display = 'block';
    }

    window.onload = processPrint;
  </script>
</body>
</html>`;

  res.send(html);
};

// Standard print routes (No prefix needed)
app.get('/print/:no_nota', servePrintPage);
app.get('/print', servePrintPage);

// Backward-compatible branch routes
app.get('/ketapang/print/:no_nota', (req, res) => { req.params.branch = 'ketapang'; servePrintPage(req, res); });
app.get('/ketapang/print', (req, res) => { req.params.branch = 'ketapang'; servePrintPage(req, res); });
app.get('/pontianak/print/:no_nota', (req, res) => { req.params.branch = 'pontianak'; servePrintPage(req, res); });
app.get('/pontianak/print', (req, res) => { req.params.branch = 'pontianak'; servePrintPage(req, res); });

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Kacamata POS Print Service running on http://localhost:${PORT}`);
    console.log(`- Print URL: http://localhost:${PORT}/print/:no_nota`);
    console.log(`- Connected POS Server: ${SERVER_API_URL}`);
  });
}

module.exports = app;
