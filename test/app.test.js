const test = require('node:test');
const assert = require('node:assert');
const http = require('http');
const app = require('../src/index');

test('HTTP Routes - GET /api/config returns status and default printer', async () => {
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;

  try {
    const res = await fetch(`http://localhost:${port}/api/config`);
    const data = await res.json();

    assert.strictEqual(res.status, 200);
    assert.strictEqual(data.status, 'ok');
    assert.strictEqual(data.service, 'kacamata-pos-print');
    assert.ok(data.defaultPrinterName);
  } finally {
    server.close();
  }
});

test('HTTP Routes - PNA header support on OPTIONS preflight', async () => {
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;

  try {
    const res = await fetch(`http://localhost:${port}/api/print`, {
      method: 'OPTIONS',
      headers: {
        'Access-Control-Request-Private-Network': 'true'
      }
    });

    assert.strictEqual(res.status, 204);
    assert.strictEqual(res.headers.get('access-control-allow-private-network'), 'true');
  } finally {
    server.close();
  }
});

test('HTTP Routes - POST /api/print rejects missing text with 400', async () => {
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;

  try {
    const res = await fetch(`http://localhost:${port}/api/print`, {
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

test('HTTP Routes - POST /api/print accepts plain text and prints', async () => {
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;

  try {
    const res = await fetch(`http://localhost:${port}/api/print`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: 'TEST NOTA PENJUALAN\nLINE 1\nLINE 2',
        printerName: 'TEST_PRINTER'
      })
    });
    const data = await res.json();

    assert.strictEqual(res.status, 200);
    assert.strictEqual(data.success, true);
    assert.ok(data.message.includes('TEST_PRINTER'));
  } finally {
    server.close();
  }
});

test('HTTP Routes - POST /api/print also accepts textData field', async () => {
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;

  try {
    const res = await fetch(`http://localhost:${port}/api/print`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        textData: 'TEST NOTA DENGAN FIELD TEXTDATA',
        printerName: 'LX310'
      })
    });
    const data = await res.json();

    assert.strictEqual(res.status, 200);
    assert.strictEqual(data.success, true);
  } finally {
    server.close();
  }
});

test('TSPL Formatter - generates valid TSPL commands for double and single format', () => {
  const { generateTsplBarcodes } = require('../src/tspl');

  const items = [
    { barcode_id: 'BRG-000001', nama_barang: 'Frame Rayban RB3025', harga_jual: 1500000, jumlah: 1 },
    { barcode_id: 'BRG-000002', nama_barang: 'Lensa Essilor Crizal Anti Radiasi Sangat Panjang', harga_jual: 350000, jumlah: 2 }
  ];

  // Double format
  const tsplDouble = generateTsplBarcodes(items, 'double');
  assert.ok(tsplDouble.includes('SIZE 73 mm, 19 mm'));
  assert.ok(tsplDouble.includes('GAP 2 mm, 0 mm'));
  assert.ok(tsplDouble.includes('DIRECTION 1'));
  assert.ok(tsplDouble.includes('SHIFT -40'));
  assert.ok(tsplDouble.includes('BARCODE 67,32,"128",42,0,0,1,1,"BRG-000001"'));
  assert.ok(tsplDouble.includes('BARCODE 359,32,"128",42,0,0,1,1,"BRG-000001"'));
  assert.ok(tsplDouble.includes('Rp 1.500.000'));
  // Quantity 1 + 2 = 3 labels (each has PRINT 1,1)
  const printOccurrences = (tsplDouble.match(/PRINT 1,1/g) || []).length;
  assert.strictEqual(printOccurrences, 3);

  // Single format
  const tsplSingle = generateTsplBarcodes(items, 'single');
  assert.ok(tsplSingle.includes('SIZE 73 mm, 19 mm'));
  // Items count: 1 + 2 = 3 items -> 2 labels (one full, one with left only)
  const singlePrintOccurrences = (tsplSingle.match(/PRINT 1,1/g) || []).length;
  assert.strictEqual(singlePrintOccurrences, 2);
});

test('HTTP Routes - POST /api/print-barcode prints items array or raw text', async () => {
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;

  try {
    // Test with items array
    const res = await fetch(`http://localhost:${port}/api/print-barcode`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        items: [{ barcode_id: 'BRG-TEST-1', nama_barang: 'Test Item', harga_jual: 100000, jumlah: 1 }],
        printerName: 'TEST_BARCODE_PRINTER'
      })
    });
    const data = await res.json();

    assert.strictEqual(res.status, 200);
    assert.strictEqual(data.success, true);
    assert.ok(data.message.includes('TEST_BARCODE_PRINTER'));

    // Test missing data rejects with 400
    const emptyRes = await fetch(`http://localhost:${port}/api/print-barcode`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({})
    });
    assert.strictEqual(emptyRes.status, 400);
  } finally {
    server.close();
  }
});

