// TSPL (TSC Programming Language) Formatter for Barcode Labels
// Compatible with Node.js 13+ (ES2019 - No optional chaining or nullish coalescing)

function sanitizeText(str) {
  if (!str) return '';
  return String(str)
    .replace(/["\\]/g, '')
    .replace(/[\r\n]/g, ' ')
    .trim();
}

function formatRupiah(num) {
  var n = Number(num) || 0;
  return '- Rp ' + n.toLocaleString('id-ID');
}

/**
 * Generate TSPL commands for 73mm x 19mm 2-column barcode labels
 * @param {Array} items - Array of { barcode_id, nama_barang, harga_jual, jumlah }
 * @param {string} format - 'double' (same item on both halves) or 'single' (sequential)
 * @returns {string} TSPL raw command string
 */
function generateTsplBarcodes(items, format) {
  if (!items || !items.length) return '';
  format = format || 'double';

  var pairs = [];

  if (format === 'double') {
    // Each item is duplicated on both halves for the given quantity
    for (var i = 0; i < items.length; i++) {
      var it = items[i];
      var qty = parseInt(it.jumlah, 10);
      if (isNaN(qty) || qty < 1) qty = 1;
      for (var q = 0; q < qty; q++) {
        pairs.push({ left: it, right: it });
      }
    }
  } else {
    // Single: expand all items by qty, then pair sequentially
    var expanded = [];
    for (var j = 0; j < items.length; j++) {
      var item = items[j];
      var count = parseInt(item.jumlah, 10);
      if (isNaN(count) || count < 1) count = 1;
      for (var k = 0; k < count; k++) {
        expanded.push(item);
      }
    }
    for (var m = 0; m < expanded.length; m += 2) {
      pairs.push({
        left: expanded[m],
        right: (m + 1 < expanded.length) ? expanded[m + 1] : null
      });
    }
  }

  if (pairs.length === 0) return '';

  var commands = [];
  commands.push('SIZE 73 mm, 19 mm');
  commands.push('GAP 2 mm, 0 mm');
  commands.push('DIRECTION 1');
  commands.push('REFERENCE 0,0');

  function renderHalf(item, startX) {
    if (!item) return [];
    var halfCmds = [];
    var rawName = (item.nama_barang || '-').toUpperCase();
    var cleanName = sanitizeText(rawName);
    var cleanBarcode = sanitizeText(item.barcode_id || '');
    var priceStr = sanitizeText(formatRupiah(item.harga_jual));

    // Name line: font "2" (12x20) if short, font "1" (8x12) if long
    if (cleanName.length > 22) {
      var truncatedLong = cleanName.substring(0, 33);
      halfCmds.push('TEXT ' + startX + ',14,"1",0,1,1,"' + truncatedLong + '"');
    } else {
      var truncatedShort = cleanName.substring(0, 22);
      halfCmds.push('TEXT ' + startX + ',10,"2",0,1,1,"' + truncatedShort + '"');
    }

    // Barcode: Code 128
    if (cleanBarcode) {
      // Estimate width at narrow=1: ~11 dots per char + 48 dots overhead
      var approxWidth = (cleanBarcode.length + 3) * 11 + 15;
      var offset = 0;
      if (approxWidth < 270) {
        offset = Math.floor((270 - approxWidth) / 2);
      }
      var barcodeX = startX + offset;
      halfCmds.push('BARCODE ' + barcodeX + ',36,"128",48,0,0,1,1,"' + cleanBarcode + '"');
    }

    // Bottom info: barcode on left, price on right
    halfCmds.push('TEXT ' + startX + ',92,"1",0,1,1,"' + cleanBarcode + '"');
    var priceWidth = priceStr.length * 8;
    var priceX = Math.max(startX + 120, (startX + 270) - priceWidth);
    halfCmds.push('TEXT ' + priceX + ',92,"1",0,1,1,"' + priceStr + '"');

    return halfCmds;
  }

  for (var p = 0; p < pairs.length; p++) {
    var pair = pairs[p];
    commands.push('CLS');
    // Left half: startX = 16
    var leftCmds = renderHalf(pair.left, 16);
    for (var l = 0; l < leftCmds.length; l++) {
      commands.push(leftCmds[l]);
    }
    // Right half: startX = 312
    if (pair.right) {
      var rightCmds = renderHalf(pair.right, 312);
      for (var r = 0; r < rightCmds.length; r++) {
        commands.push(rightCmds[r]);
      }
    }
    commands.push('PRINT 1,1');
  }

  return commands.join('\r\n') + '\r\n';
}

module.exports = {
  sanitizeText: sanitizeText,
  formatRupiah: formatRupiah,
  generateTsplBarcodes: generateTsplBarcodes
};
