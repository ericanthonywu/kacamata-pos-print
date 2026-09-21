const test = require('node:test');
const assert = require('node:assert');
const http = require('http');
const app = require('../src/index');
const { formatReceiptText } = require('../src/formatter');

test('Receipt Formatter - formats sale data into LX-310 layout correctly', () => {
  const sampleData = {
    no_nota: 'INV-2026-001',
    order_date: '2026-09-21',
    tanggal_selesai: '2026-09-22',
    pelanggan_nama: 'Budi Santoso',
    pelanggan_telp: '08123456789',
    sales_nama: 'Andi',
    total: 1500000,
    dp: 500000,
    status_bayar: 'belum_lunas',
    detail: [
      { tipe: 'frame', nama_barang: 'Rayban RB3025', harga: 1000000, jumlah: 1 },
      { tipe: 'lensa_r', nama_barang: 'Essilor Crizal', harga: 250000, jumlah: 1 },
      { tipe: 'lensa_l', nama_barang: 'Essilor Crizal', harga: 250000, jumlah: 1 }
    ],
    sph_r: '-1.00',
    cyl_r: '-0.50',
    axis_r: '90'
  };

  const formatted = formatReceiptText(sampleData);

  assert.ok(formatted.textData.includes('INV-2026-001'));
  assert.ok(formatted.textData.includes('Budi Santoso'));
  assert.ok(formatted.textData.includes('Rayban RB3025'));
  assert.ok(formatted.textData.includes('OPTIK SENTRAL PONTIANAK'));
  assert.strictEqual(formatted.lines.length > 10, true);
});

test('HTTP Routes - GET /api/config returns default configurations', async () => {
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;

  try {
    const res = await fetch(`http://localhost:${port}/api/config`);
    const data = await res.json();

    assert.strictEqual(res.status, 200);
    assert.ok(data.serverApiUrl);
    assert.ok(data.defaultPrinterName);
  } finally {
    server.close();
  }
});

test('HTTP Routes - GET /print/:no_nota renders loading screen page', async () => {
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;

  try {
    const res = await fetch(`http://localhost:${port}/print/INV-12345`);
    const html = await res.text();

    assert.strictEqual(res.status, 200);
    assert.ok(html.includes('Mencetak Nota INV-12345'));
    assert.ok(html.includes('INV-12345'));
  } finally {
    server.close();
  }
});

test('HTTP Routes - POST /api/print-raw handles missing textData', async () => {
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;

  try {
    const res = await fetch(`http://localhost:${port}/api/print-raw`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({})
    });
    const data = await res.json();

    assert.strictEqual(res.status, 400);
    assert.strictEqual(data.success, false);
  } finally {
    server.close();
  }
});
