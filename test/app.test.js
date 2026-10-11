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
    assert.ok(data.branch);
    assert.strictEqual(typeof data.paperWidth, 'number');
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

test('Receipt Formatter - formats Pontianak thermal (48 col) and Ketapang dot matrix (80 col)', () => {
  const { formatReceiptText } = require('../src/receipt');
  const sampleSale = {
    no_nota: 'INV-20261011-0001',
    order_date: '2026-10-10',
    pelanggan_nama: 'test',
    pelanggan_telp: '08123456789',
    sales_nama: 'Budi',
    total: 120000,
    dp: 120000,
    status_bayar: 'lunas',
    metode_bayar: 'cash',
    detail: [
      { tipe: 'frame', nama_barang: 'frame 120', harga: 120000, jumlah: 1 }
    ]
  };

  // 1. Pontianak (Thermal 80mm / 48 columns)
  const ponti = formatReceiptText(sampleSale, 'pontianak');
  assert.ok(ponti.textData.includes('OPTIK KACAMATA LENSA'));
  assert.ok(ponti.textData.includes('PONTIANAK'));
  assert.ok(ponti.textData.includes('INV-20261011-0001'));
  assert.ok(ponti.textData.includes('No. Telp  : 08123456789'));
  // Ensure lines do not exceed 48 characters (except trailing cut command)
  ponti.lines.forEach((line) => {
    if (!line.includes('\x1d\x56')) {
      assert.ok(line.length <= 48, `Line exceeds 48 chars: "${line}" (${line.length})`);
    }
  });

  // Test prescription edge cases for Pontianak
  const resepSale = {
    ...sampleSale,
    sph_r: '-0.25',
    cyl_r: '-0.50',
    axis_r: '180',
    add_r: '1',
    sph_l: '-0.25',
    cyl_l: '-0.50',
    axis_l: '180',
    add_l: '1',
    pd: '64'
  };
  const pontiResep = formatReceiptText(resepSale, 'pontianak');
  assert.ok(pontiResep.textData.includes('R: -0.25'));
  assert.ok(pontiResep.textData.includes('CYL:'));
  assert.ok(pontiResep.textData.includes('AXIS: 180'));
  assert.ok(pontiResep.textData.includes('ADD: 1'));
  assert.ok(pontiResep.textData.includes('PD: 64'));
  pontiResep.lines.forEach((line) => {
    if (!line.includes('\x1d\x56')) {
      assert.ok(line.length <= 48, `Line exceeds 48 chars: "${line}" (${line.length})`);
    }
  });

  // 2. Ketapang (Dot matrix / 80 columns)
  const ktp = formatReceiptText(sampleSale, 'ketapang');
  assert.ok(ktp.textData.includes('OPTIK SENTRAL KETAPANG'));
  assert.ok(ktp.textData.includes('JL.R.SUPRAPTO NO.41 KETAPANG'));
  assert.ok(ktp.textData.includes('INV-20261011-0001'));
  ktp.lines.forEach((line) => {
    assert.ok(line.length <= 80, `Line exceeds 80 chars: "${line}" (${line.length})`);
  });
});

test('HTTP Routes - POST /api/print accepts data object and formats receipt', async () => {
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;

  try {
    const res = await fetch(`http://localhost:${port}/api/print`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        data: {
          no_nota: 'INV-TEST-DATA',
          order_date: '2026-10-10',
          pelanggan_nama: 'Customer Test',
          total: 50000,
          dp: 50000,
          status_bayar: 'lunas',
          detail: [{ tipe: 'frame', nama_barang: 'Test Frame', harga: 50000, jumlah: 1 }]
        },
        branch: 'pontianak',
        printerName: 'TEST_PRINTER'
      })
    });
    const data = await res.json();

    assert.strictEqual(res.status, 200);
    assert.strictEqual(data.success, true);
  } finally {
    server.close();
  }
});

test('HTTP Routes - POST /api/print accepts type: test_nota and formats matching branch', async () => {
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;

  try {
    const res = await fetch(`http://localhost:${port}/api/print`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'test_nota',
        printerName: 'TEST_PRINTER'
      })
    });
    const data = await res.json();

    assert.strictEqual(res.status, 200);
    assert.strictEqual(data.success, true);
  } finally {
    server.close();
  }
});


