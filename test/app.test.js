const test = require('node:test');
const assert = require('node:assert');
const http = require('http');
const app = require('../src/index');
const { formatReceiptText } = require('../src/formatter');

test('Receipt Formatter - formats sale data into LX-310 layout with store name from API', () => {
  const sampleDataKetapang = {
    no_nota: 'INV-2026-001',
    order_date: '2026-09-21',
    tanggal_selesai: '2026-09-22',
    pelanggan_nama: 'Budi Santoso',
    pelanggan_telp: '08123456789',
    sales_nama: 'Andi',
    total: 1500000,
    dp: 500000,
    status_bayar: 'belum_lunas',
    store_name: 'OPTIK SENTRAL PONTIANAK',
    detail: [
      { tipe: 'frame', nama_barang: 'Rayban RB3025', harga: 1000000, jumlah: 1 },
      { tipe: 'lensa_r', nama_barang: 'Essilor Crizal', harga: 250000, jumlah: 1 },
      { tipe: 'lensa_l', nama_barang: 'Essilor Crizal', harga: 250000, jumlah: 1 }
    ]
  };

  const formattedKetapang = formatReceiptText(sampleDataKetapang);
  assert.ok(formattedKetapang.textData.includes('INV-2026-001'));
  assert.ok(formattedKetapang.textData.includes('Budi Santoso'));
  assert.ok(formattedKetapang.textData.includes('OPTIK SENTRAL PONTIANAK'));
  assert.strictEqual(formattedKetapang.lines.length > 10, true);

  // Test branch determined by process.env.BRANCH
  const originalBranch = process.env.BRANCH;
  try {
    process.env.BRANCH = 'pontianak';
    const formattedByEnvPonti = formatReceiptText({ no_nota: 'INV-ENV-01' });
    assert.ok(formattedByEnvPonti.textData.includes('OPTIK KACAMATA LENSA'));

    process.env.BRANCH = 'ketapang';
    const formattedByEnvKtp = formatReceiptText({ no_nota: 'INV-ENV-02' });
    assert.ok(formattedByEnvKtp.textData.includes('OPTIK SENTRAL PONTIANAK'));
  } finally {
    process.env.BRANCH = originalBranch;
  }
});

test('HTTP Routes - GET /api/config returns configuration', async () => {
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;

  try {
    const res = await fetch(`http://localhost:${port}/api/config`);
    const data = await res.json();

    assert.strictEqual(res.status, 200);
    assert.strictEqual(typeof data.serverApiUrl, 'string');
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

test('Native HTTP Client - fetchJson successfully fetches JSON data and follows redirects', async () => {
  const { fetchJson } = require('../src/http-client');
  const testServer = http.createServer((req, res) => {
    if (req.url === '/redirect') {
      res.writeHead(302, { Location: '/data' });
      res.end();
    } else if (req.url === '/data') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true, message: 'hello from test' }));
    } else {
      res.writeHead(404);
      res.end(JSON.stringify({ success: false, message: 'not found' }));
    }
  });

  await new Promise((resolve) => testServer.listen(0, resolve));
  const port = testServer.address().port;

  try {
    const directResult = await fetchJson(`http://localhost:${port}/data`);
    assert.strictEqual(directResult.success, true);
    assert.strictEqual(directResult.message, 'hello from test');

    const redirectResult = await fetchJson(`http://localhost:${port}/redirect`);
    assert.strictEqual(redirectResult.success, true);
    assert.strictEqual(redirectResult.message, 'hello from test');
  } finally {
    testServer.close();
  }
});
