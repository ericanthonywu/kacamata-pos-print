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
