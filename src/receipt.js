// Receipt formatter for Kacamata POS Print Service
// Compatible with Node.js 13+ (ES2019, Windows 7 compatible)

function formatThermalReceipt(d) {
  var W = 48; // Standard 80mm thermal receipt width (Font A, 12x24, 48 columns)
  var SP = '                                                                ';
  var padRight = function (str, len) {
    str = String(str || '');
    return (str + SP).substring(0, len);
  };
  var padLeft = function (str, len) {
    str = String(str || '');
    return (SP + str).slice(-len);
  };
  var centerText = function (str, len) {
    str = String(str || '');
    var pad = Math.max(0, Math.floor((len - str.length) / 2));
    return padRight(SP.substring(0, pad) + str, len);
  };
  var separator = function (ch) {
    var s = '';
    for (var i = 0; i < W; i++) s += ch;
    return s;
  };
  var fmtNum = function (num) {
    return Number(num || 0).toLocaleString('id-ID');
  };
  var dFormatDate = function (dStr) {
    if (!dStr) return '';
    var dt = new Date(dStr);
    if (isNaN(dt.getTime())) return String(dStr);
    var months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return ('0' + dt.getDate()).slice(-2) + '-' + months[dt.getMonth()] + '-' + dt.getFullYear();
  };

  var orderDate = dFormatDate(d.order_date);
  var tglSelesai = dFormatDate(d.tanggal_selesai);
  var no = d.no_nota || '-';
  var nama = d.pelanggan_nama || '-';
  var telp = d.pelanggan_telp || d.no_telp || d.telp || d.pelanggan_no_telp || '-';
  var sales = d.sales_nama || '-';

  var subtotal = d.subtotal || d.total || 0;
  var total = d.total || 0;
  var dp = d.dp || 0;
  var sisa = total - dp;
  if (d.status_bayar === 'lunas') {
    dp = total;
    sisa = 0;
  }

  var lines = [];
  lines.push('');
  lines.push(centerText('OPTIK KACAMATA LENSA', W));
  lines.push(centerText('PONTIANAK', W));
  lines.push(separator('='));

  lines.push(padRight('No. Nota  : ' + no, W));
  lines.push(padRight('Tanggal   : ' + orderDate, W));
  var pelangganLine = 'Pelanggan : ' + nama;
  if (pelangganLine.length > W) pelangganLine = pelangganLine.substring(0, W);
  lines.push(padRight(pelangganLine, W));
  lines.push(padRight('No. Telp  : ' + (telp && telp !== '-' ? telp : '-'), W));
  if (sales && sales !== '-') {
    lines.push(padRight('Sales     : ' + sales, W));
  }
  if (tglSelesai) {
    lines.push(padRight('Selesai   : ' + tglSelesai, W));
  }
  lines.push(separator('-'));

  var itemNum = 1;
  var items = d.detail || [];
  if (d.is_b2b) {
    items.forEach(function (item) {
      var catName = (item.kategori_nama || (item.tipe && item.tipe !== 'lain_lain' ? item.tipe : 'BARANG')).toUpperCase().replace(/_/g, ' ');
      var namaItem = item.nama_barang || item.keterangan || '-';
      var headerItem = itemNum + '. [' + catName + '] ' + namaItem;
      if (headerItem.length > W) headerItem = headerItem.substring(0, W);
      lines.push(headerItem);
      var subtotalItem = 'Rp ' + fmtNum((item.harga || 0) * (item.jumlah || 1));
      var detailQty = '   ' + (item.jumlah || 1) + ' pcs @ Rp ' + fmtNum(item.harga || 0);
      if (detailQty.length + subtotalItem.length >= W) {
        detailQty = detailQty.substring(0, W - subtotalItem.length - 1);
      }
      lines.push(padRight(detailQty, W - subtotalItem.length) + subtotalItem);
      itemNum++;
    });
  } else {
    var frameItem = items.find(function (i) { return i.tipe === 'frame'; });
    var lensaRItem = items.find(function (i) { return i.tipe === 'lensa_r'; });
    var lensaLItem = items.find(function (i) { return i.tipe === 'lensa_l'; });
    var aksesorisItem = items.find(function (i) { return i.tipe === 'aksesoris'; });
    var lainLainItems = items.filter(function (i) { return i.tipe === 'lain_lain'; });

    var addItemThermal = function (label, name, qty, price) {
      var title = itemNum + '. ' + label + ': ' + (name || '-');
      if (title.length > W) title = title.substring(0, W);
      lines.push(title);
      var totalStr = 'Rp ' + fmtNum(price * qty);
      var qtyStr = '   ' + qty + ' pcs @ Rp ' + fmtNum(price);
      if (qtyStr.length + totalStr.length >= W) {
        qtyStr = qtyStr.substring(0, W - totalStr.length - 1);
      }
      lines.push(padRight(qtyStr, W - totalStr.length) + totalStr);
      itemNum++;
    };

    if (frameItem) addItemThermal('FRAME', frameItem.nama_barang, frameItem.jumlah || 1, frameItem.harga || 0);
    if (lensaRItem) addItemThermal('LENSA(R)', lensaRItem.nama_barang, lensaRItem.jumlah || 1, lensaRItem.harga || 0);
    if (lensaLItem) addItemThermal('LENSA(L)', lensaLItem.nama_barang, lensaLItem.jumlah || 1, lensaLItem.harga || 0);
    if (aksesorisItem) addItemThermal('AKSESORIS', aksesorisItem.nama_barang, aksesorisItem.jumlah || 1, aksesorisItem.harga || 0);
    lainLainItems.forEach(function (item) {
      var catName = (item.kategori_nama || 'LAIN-LAIN').toUpperCase();
      addItemThermal(catName, item.nama_barang || item.keterangan, item.jumlah || 1, item.harga || 0);
    });
  }

  lines.push(separator('-'));
  var addTotalRow = function (label, valueStr) {
    var lbl = padRight(label, 20) + ': ';
    lines.push(lbl + padLeft(valueStr, W - lbl.length));
  };
  addTotalRow('Jumlah', 'Rp ' + fmtNum(subtotal));
  if (d.bpjs > 0) {
    addTotalRow('BPJS', '- Rp ' + fmtNum(d.bpjs));
    addTotalRow('Total', 'Rp ' + fmtNum(total));
  }
  addTotalRow('Uang Muka', 'Rp ' + fmtNum(dp));
  addTotalRow('Sisa', 'Rp ' + fmtNum(sisa));
  if (d.metode_bayar) {
    addTotalRow('Metode Bayar', String(d.metode_bayar).toUpperCase());
  }
  lines.push(separator('-'));

  if (!d.is_b2b) {
    var hasResep = d.sph_r || d.add_r || d.cyl_r || d.axis_r || d.sph_l || d.add_l || d.cyl_l || d.axis_l || d.pd;
    if (hasResep) {
      lines.push(centerText('[UKURAN RESEP LENSA]', W));

      var cleanSphR = String(d.sph_r || '').replace(/^sph[:\s]*/i, '').trim();
      var cleanCylR = String(d.cyl_r || '').replace(/^cyl[:\s]*/i, '').trim();
      var cleanAxisR = String(d.axis_r || '').replace(/^ax(is)?[:\s]*/i, '').trim();
      var cleanAddR = String(d.add_r || '').replace(/^add[:\s]*/i, '').trim();

      var cleanSphL = String(d.sph_l || '').replace(/^sph[:\s]*/i, '').trim();
      var cleanCylL = String(d.cyl_l || '').replace(/^cyl[:\s]*/i, '').trim();
      var cleanAxisL = String(d.axis_l || '').replace(/^ax(is)?[:\s]*/i, '').trim();
      var cleanAddL = String(d.add_l || '').replace(/^add[:\s]*/i, '').trim();

      var cleanPd = String(d.pd || '').replace(/^pd[:\s]*/i, '').trim();

      var hasR = Boolean(cleanSphR || cleanCylR || cleanAxisR || cleanAddR);
      var hasL = Boolean(cleanSphL || cleanCylL || cleanAxisL || cleanAddL);
      var hasAnyCyl = Boolean(cleanCylR || cleanAxisR || cleanCylL || cleanAxisL);
      var hasAnyAdd = Boolean(cleanAddR || cleanAddL);

      var formatCyl = function (cyl, axis) {
        if (!cyl && !axis) return '';
        if (cyl && axis) {
          var s = 'CYL:' + cyl + ' AXIS:' + axis;
          if (s.length > 19) {
            s = 'CYL:' + cyl + ' AX:' + axis;
          }
          return s.substring(0, 19);
        }
        if (cyl) return ('CYL: ' + cyl).substring(0, 19);
        return ('AXIS: ' + axis).substring(0, 19);
      };

      var trimRightSpaces = function (str) {
        return String(str || '').replace(/\s+$/, '');
      };

      if (hasR || hasL) {
        var pdPlaced = false;

        if (hasAnyCyl || hasAnyAdd) {
          // Format 4 kolom proporsional (lebar total maks 46 < 48 kolom thermal)
          // Col 1 (R/L SPH): 9 char | Col 2 (CYL/AXIS): 19 char | Col 3 (ADD): 10 char | Col 4 (PD): 8 char
          if (hasR) {
            var r1 = padRight('R: ' + (cleanSphR || '-'), 9);
            var r2 = padRight(formatCyl(cleanCylR, cleanAxisR), 19);
            var r3 = padRight(cleanAddR ? 'ADD: ' + cleanAddR : '', 10);
            var r4 = cleanPd ? 'PD: ' + cleanPd : '';
            if (r4) pdPlaced = true;
            var lineR = trimRightSpaces(r1 + r2 + r3 + r4);
            if (lineR.length > W) lineR = lineR.substring(0, W);
            lines.push(lineR);
          }

          if (hasL) {
            var l1 = padRight('L: ' + (cleanSphL || '-'), 9);
            var l2 = padRight(formatCyl(cleanCylL, cleanAxisL), 19);
            var l3 = padRight(cleanAddL ? 'ADD: ' + cleanAddL : '', 10);
            var l4 = (!pdPlaced && cleanPd) ? 'PD: ' + cleanPd : '';
            var lineL = trimRightSpaces(l1 + l2 + l3 + l4);
            if (lineL.length > W) lineL = lineL.substring(0, W);
            lines.push(lineL);
          }
        } else {
          // Hanya ada SPH (dan opsional PD)
          if (hasR) {
            var rText = 'R: ' + (cleanSphR || '-');
            var rPd = cleanPd ? 'PD: ' + cleanPd : '';
            if (rPd) pdPlaced = true;
            var lineR = rPd ? (padRight(rText, 20) + rPd) : rText;
            if (lineR.length > W) lineR = lineR.substring(0, W);
            lines.push(lineR);
          }
          if (hasL) {
            var lText = 'L: ' + (cleanSphL || '-');
            var lPd = (!pdPlaced && cleanPd) ? 'PD: ' + cleanPd : '';
            var lineL = lPd ? (padRight(lText, 20) + lPd) : lText;
            if (lineL.length > W) lineL = lineL.substring(0, W);
            lines.push(lineL);
          }
        }

        if (!pdPlaced && cleanPd) {
          lines.push(padRight('PD: ' + cleanPd, W));
        }
      } else if (cleanPd) {
        lines.push(padRight('PD: ' + cleanPd, W));
      }

      lines.push(separator('-'));
    }
  }

  lines.push(padRight('Disetujui,', W));
  lines.push('');
  lines.push('');
  lines.push('(.......................)');
  lines.push('');
  if (!d.is_b2b) {
    lines.push('SYARAT & KETENTUAN:');
    lines.push('* Kacamata yang tidak diambil dalam waktu 2');
    lines.push('  bulan, uang muka dinyatakan hangus.');
    lines.push('');
  }
  lines.push(centerText('TERIMA KASIH ATAS KUNJUNGAN ANDA', W));
  lines.push('');
  lines.push('');
  lines.push('');
  lines.push('\x1d\x56\x01'); // ESC/POS cut

  return {
    lines: lines,
    textData: lines.join('\r\n') + '\r\n\r\n'
  };
}

function formatDotMatrixReceipt(d) {
  var W = 80; // Standard 80-column continuous dot-matrix (Epson LX-310)
  var SP = '                                                                                                                                    ';
  var padRight = function (str, len) {
    str = String(str || '');
    return (str + SP).substring(0, len);
  };
  var padLeft = function (str, len) {
    str = String(str || '');
    return (SP + str).slice(-len);
  };
  var centerText = function (str, len) {
    str = String(str || '');
    var pad = Math.max(0, Math.floor((len - str.length) / 2));
    return padRight(SP.substring(0, pad) + str, len);
  };
  var separator = function (ch) {
    var s = '';
    for (var i = 0; i < W; i++) s += ch;
    return s;
  };
  var fmtNum = function (num) {
    return Number(num || 0).toLocaleString('id-ID');
  };
  var dFormatDate = function (dStr) {
    if (!dStr) return '';
    var dt = new Date(dStr);
    if (isNaN(dt.getTime())) return String(dStr);
    var months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return ('0' + dt.getDate()).slice(-2) + '-' + months[dt.getMonth()] + '-' + dt.getFullYear();
  };

  var orderDate = dFormatDate(d.order_date);
  var tglSelesai = dFormatDate(d.tanggal_selesai);
  var no = d.no_nota || '-';
  var nama = d.pelanggan_nama || '-';
  var telp = d.pelanggan_telp || '-';
  var sales = d.sales_nama || '-';

  var items = d.detail || [];
  var frameItem = items.find(function (i) { return i.tipe === 'frame'; });
  var lensaRItem = items.find(function (i) { return i.tipe === 'lensa_r'; });
  var lensaLItem = items.find(function (i) { return i.tipe === 'lensa_l'; });
  var aksesorisItem = items.find(function (i) { return i.tipe === 'aksesoris'; });
  var lainLainItems = items.filter(function (i) { return i.tipe === 'lain_lain'; });

  var subtotal = d.subtotal || d.total || 0;
  var total = d.total || 0;
  var dp = d.dp || 0;
  var sisa = total - dp;
  if (d.status_bayar === 'lunas') {
    dp = total;
    sisa = 0;
  }

  var lines = [];
  lines.push('');

  // Header: 3 columns
  lines.push(padRight('NO INVOICE:', 20) + centerText('OPTIK SENTRAL KETAPANG', W - 40) + padLeft('dikirim', 20));
  lines.push(padRight(no, 20) + centerText('JL.R.SUPRAPTO NO.41 KETAPANG', W - 40) + padLeft(orderDate, 20));
  lines.push(padRight('', 20) + centerText('TELP : 085350509540', W - 40) + padLeft('', 20));

  var strTglSelesai = 'Tgl. Selesai : ' + tglSelesai;
  lines.push(padRight('Nama      : ' + nama, W - strTglSelesai.length) + strTglSelesai);
  lines.push('Telp      : ' + telp);
  lines.push(separator('-'));

  var itemNum = 1;
  if (d.is_b2b) {
    items.forEach(function (item) {
      var catName = (item.kategori_nama || (item.tipe && item.tipe !== 'lain_lain' ? item.tipe : 'BARANG')).toUpperCase().replace(/_/g, ' ');
      if (catName.length > 9) catName = catName.substring(0, 9);
      var labelPrefix = itemNum + '. ' + padRight(catName + ':', 11);
      var namaItem = item.nama_barang || item.keterangan || '-';
      var subtotalItem = fmtNum((item.harga || 0) * (item.jumlah || 1));
      lines.push(padRight(labelPrefix + namaItem, W - 25) + padLeft('Rp ' + subtotalItem, 25));
      if (item.jumlah > 1) {
        lines.push(padRight('    (' + item.jumlah + ' pcs @ Rp ' + fmtNum(item.harga || 0) + ')', W));
      }
      itemNum++;
    });
  } else {
    if (frameItem) {
      lines.push(padRight(itemNum + '. FRAME   : ' + (frameItem.nama_barang || '-'), W - 25) + padLeft('Rp ' + fmtNum(frameItem.harga * frameItem.jumlah), 25));
      itemNum++;
    }
    if (lensaRItem) {
      lines.push(padRight(itemNum + '. LENSA(R): ' + (lensaRItem.nama_barang || '-'), W - 25) + padLeft('Rp ' + fmtNum(lensaRItem.harga * lensaRItem.jumlah), 25));
      itemNum++;
    }
    if (lensaLItem) {
      lines.push(padRight(itemNum + '. LENSA(L): ' + (lensaLItem.nama_barang || '-'), W - 25) + padLeft('Rp ' + fmtNum(lensaLItem.harga * lensaLItem.jumlah), 25));
      itemNum++;
    }
    if (aksesorisItem) {
      lines.push(padRight(itemNum + '. AKSESORIS: ' + (aksesorisItem.nama_barang || '-'), W - 25) + padLeft('Rp ' + fmtNum(aksesorisItem.harga * aksesorisItem.jumlah), 25));
      itemNum++;
    }
    lainLainItems.forEach(function (item) {
      var catName = (item.kategori_nama || 'LAIN-LAIN').toUpperCase();
      if (catName.length > 9) catName = catName.substring(0, 9);
      var labelPrefix = itemNum + '. ' + padRight(catName + ':', 11);
      var namaItem = item.nama_barang || item.keterangan || '-';
      lines.push(padRight(labelPrefix + namaItem, W - 25) + padLeft('Rp ' + fmtNum(item.harga * item.jumlah), 25));
      itemNum++;
    });
  }

  lines.push(padRight('', W - 45) + padRight('Jumlah', 22) + ': ' + padLeft('Rp ' + fmtNum(subtotal), 21));
  if (d.bpjs > 0) {
    lines.push(padRight('', W - 45) + padRight('BPJS', 22) + ': ' + padLeft('- Rp ' + fmtNum(d.bpjs), 21));
  }
  lines.push(padRight('', W - 45) + padRight('Uang Muka', 22) + ': ' + padLeft('Rp ' + fmtNum(dp), 21));
  lines.push(padRight('', W - 45) + padRight('Sisa', 22) + ': ' + padLeft('Rp ' + fmtNum(sisa), 21));
  if (d.metode_bayar) {
    lines.push(padRight('', W - 45) + padRight('Metode Bayar', 22) + ': ' + padLeft(String(d.metode_bayar).toUpperCase(), 21));
  }
  lines.push(separator('-'));

  function makeRow(leftText, rightText) {
    return padRight(leftText.substring(0, W - 35), W - 33) + rightText;
  }

  if (!d.is_b2b) {
    var frameText = 'Frame     : ' + (frameItem ? frameItem.nama_barang || '-' : '-');
    lines.push(makeRow(frameText, 'No.           : ' + no));

    var rParts = [];
    if (d.sph_r) rParts.push('SPH: ' + d.sph_r);
    if (d.cyl_r) rParts.push('CYL: ' + d.cyl_r);
    if (d.axis_r) rParts.push('AXIS: ' + d.axis_r);
    if (d.add_r) rParts.push('ADD: ' + d.add_r);
    var rResep = rParts.join(' ');
    var lensaRText = 'Lensa (R) : ' + (lensaRItem ? lensaRItem.nama_barang || '-' : '-') + (rResep ? ' (' + rResep + ')' : '');
    lines.push(makeRow(lensaRText, 'Sales         : ' + sales));

    var lParts = [];
    if (d.sph_l) lParts.push('SPH: ' + d.sph_l);
    if (d.cyl_l) lParts.push('CYL: ' + d.cyl_l);
    if (d.axis_l) lParts.push('AXIS: ' + d.axis_l);
    if (d.add_l) lParts.push('ADD: ' + d.add_l);
    var lResep = lParts.join(' ');
    var lensaLText = 'Lensa (L) : ' + (lensaLItem ? lensaLItem.nama_barang || '-' : '-') + (lResep ? ' (' + lResep + ')' : '');
    lines.push(makeRow(lensaLText, 'Tgl. Selesai  : ' + tglSelesai));

    if (d.sph_r || d.add_r || d.cyl_r || d.axis_r || d.sph_l || d.add_l || d.cyl_l || d.axis_l || d.pd) {
      if (d.sph_r || d.add_r || d.cyl_r || d.axis_r || d.sph_l || d.add_l || d.cyl_l || d.axis_l) {
        var rSphStr = d.sph_r || '      ';
        var rCylStr = d.cyl_r || '      ';
        var rAxisStr = d.axis_r || '      ';
        var rAddStr = d.add_r || '      ';
        var lSphStr = d.sph_l || '      ';
        var lCylStr = d.cyl_l || '      ';
        var lAxisStr = d.axis_l || '      ';
        var lAddStr = d.add_l || '      ';
        var pdStr = d.pd ? 'PD: ' + d.pd : '';
        lines.push('SPHR: ' + padRight(rSphStr, 10) + ' CYLR: ' + padRight(rCylStr, 10) + ' AXISR: ' + padRight(rAxisStr, 10) + ' ADDR: ' + padRight(rAddStr, 10) + pdStr);
        lines.push('SPHL: ' + padRight(lSphStr, 10) + ' CYLL: ' + padRight(lCylStr, 10) + ' AXISL: ' + padRight(lAxisStr, 10) + ' ADDL: ' + lAddStr);
      } else if (d.pd) {
        lines.push('PD  : ' + d.pd);
      }
    }
  } else {
    lines.push(makeRow('Jenis     : PENJUALAN TOKO (B2B)', 'No.           : ' + no));
    if (tglSelesai) {
      lines.push(makeRow('Jatuh Tempo: ' + tglSelesai, 'Tgl. Order    : ' + orderDate));
    }
  }

  var strDisetujui = 'Disetujui,';
  lines.push(padRight('', W - strDisetujui.length) + strDisetujui);
  lines.push('');
  lines.push('');
  lines.push('');
  var strTtd = '(...........)';
  lines.push(padRight('', W - strTtd.length) + strTtd);
  if (!d.is_b2b) {
    lines.push('SYARAT DAN KETENTUAN');
    lines.push('* KACAMATA YANG TIDAK DIAMBIL DALAM JANGKA WAKTU 2 BULAN MAKA UANG MUKA');
    lines.push('  AKAN DINYATAKAN HANGUS DAN DILUAR RESIKO KAMI');
  }

  return {
    lines: lines,
    textData: lines.join('\r\n') + '\r\n\r\n'
  };
}

function formatReceiptText(d, branch) {
  d = d || {};
  var br = (branch || process.env.BRANCH || 'ketapang').toLowerCase();
  if (br === 'pontianak' || br === 'pusat') {
    return formatThermalReceipt(d);
  }
  return formatDotMatrixReceipt(d);
}

function getTestNotaText(branch, printer) {
  var br = (branch || process.env.BRANCH || 'ketapang').toLowerCase();
  printer = printer || (br === 'pontianak' ? 'XH-80UL' : 'LX310');
  if (br === 'pontianak' || br === 'pusat') {
    return '       TEST CETAK NOTA KACAMATA POS\r\n' +
           '------------------------------------------------\r\n' +
           'Toko   : OPTIK KACAMATA LENSA PONTIANAK\r\n' +
           'Format : THERMAL 80mm (48 KOLOM)\r\n' +
           'Printer: ' + printer + '\r\n' +
           'Status : PRINTER CONNECTED & READY\r\n' +
           '------------------------------------------------\r\n\r\n\r\n\r\n\x1d\x56\x01';
  }
  return 'TEST CETAK NOTA KACAMATA POS\r\n' +
         '--------------------------------------------------------------------------------\r\n' +
         'Toko   : OPTIK SENTRAL KETAPANG\r\n' +
         'Format : DOT MATRIX 80 KOLOM (LX-310)\r\n' +
         'Printer: ' + printer + '\r\n' +
         'Status : PRINTER CONNECTED & READY\r\n' +
         '--------------------------------------------------------------------------------\r\n\r\n\r\n\r\n';
}

module.exports = {
  formatReceiptText,
  formatThermalReceipt,
  formatDotMatrixReceipt,
  getTestNotaText
};
