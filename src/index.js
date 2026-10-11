const express = require('express');
const cors = require('cors');
require('dotenv').config();

const { printRawText } = require('./printer');
const { generateTsplBarcodes } = require('./tspl');
const { formatReceiptText, getTestNotaText } = require('./receipt');

const app = express();
const PORT = process.env.PORT || 3000;
const BRANCH = (process.env.BRANCH || 'ketapang').toLowerCase();
const DEFAULT_PRINTER_NAME = process.env.PRINTER_NAME || (BRANCH === 'pontianak' ? 'XH-80UL' : 'LX310');
const DEFAULT_BARCODE_PRINTER_NAME = process.env.BARCODE_PRINTER_NAME || 'BARCODE';

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
app.use(express.json({ limit: '10mb' }));
app.use(express.text({ type: ['text/plain', 'text/*'], limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Health-check / Config endpoint
app.get(['/', '/health', '/api/config'], (req, res) => {
  res.json({
    status: 'ok',
    service: 'kacamata-pos-print',
    branch: BRANCH,
    paperWidth: BRANCH === 'pontianak' ? 48 : 80,
    printerType: BRANCH === 'pontianak' ? 'thermal' : 'dotmatrix',
    defaultPrinterName: DEFAULT_PRINTER_NAME,
    defaultBarcodePrinterName: DEFAULT_BARCODE_PRINTER_NAME
  });
});

// Agnostic print handler — receives plain text or data object and directly prints to printer
const handlePrint = (req, res) => {
  let text = null;
  let printer = DEFAULT_PRINTER_NAME;

  if (typeof req.body === 'string') {
    text = req.body;
  } else if (req.body && typeof req.body === 'object') {
    if (req.body.printerName || req.body.printer) {
      printer = req.body.printerName || req.body.printer;
    } else if (req.body.printerType === 'barcode' || req.body.type === 'barcode') {
      printer = DEFAULT_BARCODE_PRINTER_NAME;
    }

    if (req.body.type === 'test_nota' || req.body.action === 'test_nota') {
      text = getTestNotaText(req.body.branch || BRANCH, printer);
    } else if (req.body.data || req.body.penjualan) {
      const branchParam = req.body.branch || BRANCH;
      const formatted = formatReceiptText(req.body.data || req.body.penjualan, branchParam);
      text = formatted.textData;
    } else if (req.body.text && req.body.text.indexOf('TEST CETAK NOTA KACAMATA POS') !== -1) {
      text = getTestNotaText(req.body.branch || BRANCH, printer);
    } else if (req.body.text || req.body.textData || req.body.raw) {
      text = req.body.text || req.body.textData || req.body.raw;
    }
  }

  if (!text || !text.trim()) {
    return res.status(400).json({
      success: false,
      message: 'Parameter "text", "textData", atau "data" wajib diisi'
    });
  }

  printRawText(text, printer, (err, output) => {
    if (err) {
      console.error('Gagal mencetak ke printer:', err.message);
      return res.status(500).json({
        success: false,
        message: 'Gagal mencetak: ' + err.message
      });
    }
    console.log(`[PRINT] Berhasil dikirim ke printer "${printer}" (${text.length} karakter)`);
    res.json({
      success: true,
      message: 'Berhasil dikirim ke printer ' + printer
    });
  });
};

// Barcode print handler — supports raw TSPL text or { items, format } array
const handlePrintBarcode = (req, res) => {
  let text = null;
  let printer = DEFAULT_BARCODE_PRINTER_NAME;

  if (typeof req.body === 'string') {
    text = req.body;
  } else if (req.body && typeof req.body === 'object') {
    if (req.body.printerName || req.body.printer) {
      printer = req.body.printerName || req.body.printer;
    }
    if (req.body.text || req.body.textData || req.body.raw) {
      text = req.body.text || req.body.textData || req.body.raw;
    } else if (Array.isArray(req.body.items)) {
      var opts = req.body.options || {};
      if (typeof req.body.shiftY !== 'undefined') opts.shiftY = req.body.shiftY;
      if (typeof req.body.shiftX !== 'undefined') opts.shiftX = req.body.shiftX;
      text = generateTsplBarcodes(req.body.items, req.body.format || 'double', opts);
    }
  }

  if (!text || !text.trim()) {
    return res.status(400).json({
      success: false,
      message: 'Parameter "text", "textData", atau array "items" wajib diisi'
    });
  }

  printRawText(text, printer, (err, output) => {
    if (err) {
      console.error('Gagal mencetak barcode ke printer:', err.message);
      return res.status(500).json({
        success: false,
        message: 'Gagal mencetak: ' + err.message
      });
    }
    console.log(`[PRINT-BARCODE] Berhasil dikirim ke printer "${printer}" (${text.length} karakter)`);
    res.json({
      success: true,
      message: 'Berhasil dikirim ke printer ' + printer
    });
  });
};

// Endpoints
app.post('/api/print', handlePrint);
app.post('/api/print-barcode', handlePrintBarcode);
app.post('/api/print/barcode', handlePrintBarcode);

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`=========================================`);
    console.log(`Kacamata POS Print Service (Agnostic + Barcode)`);
    console.log(`Listening on http://localhost:${PORT}`);
    console.log(`Default Receipt Printer : ${DEFAULT_PRINTER_NAME}`);
    console.log(`Default Barcode Printer : ${DEFAULT_BARCODE_PRINTER_NAME}`);
    console.log(`Endpoints:`);
    console.log(`- GET  /api/config        (Health check & printer config)`);
    console.log(`- POST /api/print         (Body: { text: "...", printerName: "..." })`);
    console.log(`- POST /api/print-barcode (Body: { text: "..." } or { items: [...], format: "..." })`);
    console.log(`=========================================`);
  });
}

module.exports = app;
