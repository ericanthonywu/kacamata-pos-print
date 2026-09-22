const express = require('express');
const cors = require('cors');
require('dotenv').config();

const { printRawText } = require('./printer');

const app = express();
const PORT = process.env.PORT || 3000;
const DEFAULT_PRINTER_NAME = process.env.PRINTER_NAME || 'LX310';

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
    defaultPrinterName: DEFAULT_PRINTER_NAME
  });
});

// Agnostic print handler — receives plain text and directly prints to printer
const handlePrint = (req, res) => {
  let text = null;
  let printer = DEFAULT_PRINTER_NAME;

  if (typeof req.body === 'string') {
    text = req.body;
  } else if (req.body && typeof req.body === 'object') {
    text = req.body.text || req.body.textData || req.body.raw;
    if (req.body.printerName || req.body.printer) {
      printer = req.body.printerName || req.body.printer;
    }
  }

  if (!text || !text.trim()) {
    return res.status(400).json({
      success: false,
      message: 'Parameter "text" atau "textData" wajib diisi'
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

// Endpoint for printing plain text
app.post('/api/print', handlePrint);

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`=========================================`);
    console.log(`Kacamata POS Print Service (Agnostic)`);
    console.log(`Listening on http://localhost:${PORT}`);
    console.log(`Default Printer: ${DEFAULT_PRINTER_NAME}`);
    console.log(`Endpoints:`);
    console.log(`- GET  /api/config (Health check)`);
    console.log(`- POST /api/print  (Body: { text: "...", printerName: "..." })`);
    console.log(`=========================================`);
  });
}

module.exports = app;
