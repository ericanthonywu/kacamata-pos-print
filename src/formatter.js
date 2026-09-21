function formatDate(dStr) {
  if (!dStr) return '';
  const dt = new Date(dStr);
  if (isNaN(dt.getTime())) return dStr;
  const day = ('0' + dt.getDate()).slice(-2);
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const month = months[dt.getMonth()];
  const year = dt.getFullYear();
  return `${day}-${month}-${year}`;
}

function formatReceiptText(d, branch) {
  const orderDate = formatDate(d.order_date);
  const tglSelesai = formatDate(d.tanggal_selesai);

  const no = d.no_nota || '-';
  const nama = d.pelanggan_nama || '-';
  const telp = d.pelanggan_telp || '-';
  const sales = d.sales_nama || '-';

  const frameItem = (d.detail || []).find((i) => i.tipe === 'frame');
  const lensaRItem = (d.detail || []).find((i) => i.tipe === 'lensa_r');
  const lensaLItem = (d.detail || []).find((i) => i.tipe === 'lensa_l');
  const aksesorisItem = (d.detail || []).find((i) => i.tipe === 'aksesoris');
  const lainLainItem = (d.detail || []).find((i) => i.tipe === 'lain_lain');

  const subtotal = d.subtotal || d.total || 0;
  const total = d.total || 0;
  let dp = d.dp || 0;
  let sisa = total - dp;
  if (d.status_bayar === 'lunas') {
    dp = total;
    sisa = 0;
  }

  const W = 80; // total character width for full page (Epson LX-310 standard 10 CPI is 80 columns)
  const SP = ' '.repeat(150);
  const padRight = (str, length) => (str + SP).substring(0, length);
  const padLeft = (str, length) => (SP + str).slice(-length);
  const centerText = (str, length) => {
    const pad = Math.max(0, Math.floor((length - str.length) / 2));
    return padRight(SP.substring(0, pad) + str, length);
  };
  const separator = (ch) => ch.repeat(W);

  const lines = [];

  // Margin atas agar teks tidak terpotong di ujung kertas
  lines.push('');

  const branchName = (branch || process.env.BRANCH || '').toLowerCase();
  const storeTitle = process.env.STORE_NAME
    || (branchName === 'pontianak' || branchName === 'pusat' ? 'OPTIK KACAMATA LENSA' : null)
    || (branchName === 'ketapang' || branchName === 'cabang' ? 'OPTIK SENTRAL PONTIANAK' : null)
    || d.store_name
    || 'OPTIK SENTRAL PONTIANAK';
  const storeAddress = process.env.STORE_ADDRESS || 'JL.R.SUPRAPTO NO.41 KETAPANG';
  const storePhone = process.env.STORE_PHONE || 'TELP : 085350509540';

  // Header: 3 columns
  lines.push(padRight('NO INVOICE:', 20) + centerText(storeTitle, W - 40) + padLeft('dikirim', 20));
  lines.push(padRight(no, 20) + centerText(storeAddress, W - 40) + padLeft(orderDate, 20));
  lines.push(padRight('', 20) + centerText(storePhone, W - 40) + padLeft('', 20));

  // Nama, Telp, Tgl Selesai
  const strTglSelesai = 'Tgl. Selesai : ' + tglSelesai;
  lines.push(padRight('Nama      : ' + nama, W - strTglSelesai.length) + strTglSelesai);
  lines.push('Telp      : ' + telp);
  lines.push(separator('-'));

  // Items
  let itemNum = 1;
  if (frameItem) {
    lines.push(padRight(itemNum + '. FRAME   : ' + (frameItem.nama_barang || '-'), W - 25) + padLeft('Rp ' + Number(frameItem.harga * frameItem.jumlah).toLocaleString('id-ID'), 25));
    itemNum++;
  }
  if (lensaRItem) {
    lines.push(padRight(itemNum + '. LENSA(R): ' + (lensaRItem.nama_barang || '-'), W - 25) + padLeft('Rp ' + Number(lensaRItem.harga * lensaRItem.jumlah).toLocaleString('id-ID'), 25));
    itemNum++;
  }
  if (lensaLItem) {
    lines.push(padRight(itemNum + '. LENSA(L): ' + (lensaLItem.nama_barang || '-'), W - 25) + padLeft('Rp ' + Number(lensaLItem.harga * lensaLItem.jumlah).toLocaleString('id-ID'), 25));
    itemNum++;
  }
  if (aksesorisItem) {
    lines.push(padRight(itemNum + '. AKSESORIS: ' + (aksesorisItem.nama_barang || '-'), W - 25) + padLeft('Rp ' + Number(aksesorisItem.harga * aksesorisItem.jumlah).toLocaleString('id-ID'), 25));
    itemNum++;
  }
  if (lainLainItem) {
    lines.push(padRight(itemNum + '. LAIN-LAIN: ' + (lainLainItem.keterangan || '-'), W - 25) + padLeft('Rp ' + Number(lainLainItem.harga * lainLainItem.jumlah).toLocaleString('id-ID'), 25));
    itemNum++;
  }

  // Totals (right-aligned)
  lines.push(padRight('', W - 45) + padRight('Jumlah', 22) + ': ' + padLeft('Rp ' + Number(subtotal).toLocaleString('id-ID'), 21));
  if (d.bpjs > 0) {
    lines.push(padRight('', W - 45) + padRight('BPJS', 22) + ': ' + padLeft('- Rp ' + Number(d.bpjs).toLocaleString('id-ID'), 21));
  }
  lines.push(padRight('', W - 45) + padRight('Uang Muka', 22) + ': ' + padLeft('Rp ' + Number(dp).toLocaleString('id-ID'), 21));
  lines.push(padRight('', W - 45) + padRight('Sisa', 22) + ': ' + padLeft('Rp ' + Number(sisa).toLocaleString('id-ID'), 21));
  if (d.metode_bayar) {
    lines.push(padRight('', W - 45) + padRight('Metode Bayar', 22) + ': ' + padLeft(String(d.metode_bayar).toUpperCase(), 21));
  }
  lines.push(separator('-'));

  // Detail section: left = frame/lensa info, right = no/sales/tgl
  function makeRow(leftText, rightText) {
    return padRight(leftText.substring(0, W - 35), W - 33) + rightText;
  }

  const frameText = 'Frame     : ' + (frameItem ? frameItem.nama_barang || '-' : '-');
  lines.push(makeRow(frameText, 'No.           : ' + no));

  const rResep = [d.sph_r ? 'SPH: ' + d.sph_r : '', d.cyl_r ? 'CYL: ' + d.cyl_r : '', d.axis_r ? 'AXIS: ' + d.axis_r : '', d.add_r ? 'ADD: ' + d.add_r : ''].filter(Boolean).join(' ');
  const lensaRText = 'Lensa (R) : ' + (lensaRItem ? lensaRItem.nama_barang || '-' : '-') + (rResep ? ' (' + rResep + ')' : '');
  lines.push(makeRow(lensaRText, 'Sales         : ' + sales));

  const lResep = [d.sph_l ? 'SPH: ' + d.sph_l : '', d.cyl_l ? 'CYL: ' + d.cyl_l : '', d.axis_l ? 'AXIS: ' + d.axis_l : '', d.add_l ? 'ADD: ' + d.add_l : ''].filter(Boolean).join(' ');
  const lensaLText = 'Lensa (L) : ' + (lensaLItem ? lensaLItem.nama_barang || '-' : '-') + (lResep ? ' (' + lResep + ')' : '');
  lines.push(makeRow(lensaLText, 'Tgl. Selesai  : ' + tglSelesai));

  const rSphStr = d.sph_r ? d.sph_r : '      ';
  const rCylStr = d.cyl_r ? d.cyl_r : '      ';
  const rAxisStr = d.axis_r ? d.axis_r : '      ';
  const rAddStr = d.add_r ? d.add_r : '      ';
  const lSphStr = d.sph_l ? d.sph_l : '      ';
  const lCylStr = d.cyl_l ? d.cyl_l : '      ';
  const lAxisStr = d.axis_l ? d.axis_l : '      ';
  const lAddStr = d.add_l ? d.add_l : '      ';

  if (d.sph_r || d.add_r || d.cyl_r || d.axis_r || d.sph_l || d.add_l || d.cyl_l || d.axis_l || d.pd) {
    if (d.sph_r || d.add_r || d.cyl_r || d.axis_r || d.sph_l || d.add_l || d.cyl_l || d.axis_l) {
      const pdStr = d.pd ? 'PD: ' + d.pd : '';
      lines.push('SPHR: ' + padRight(rSphStr, 10) + ' CYLR: ' + padRight(rCylStr, 10) + ' AXISR: ' + padRight(rAxisStr, 10) + ' ADDR: ' + padRight(rAddStr, 10) + pdStr);
      lines.push('SPHL: ' + padRight(lSphStr, 10) + ' CYLL: ' + padRight(lCylStr, 10) + ' AXISL: ' + padRight(lAxisStr, 10) + ' ADDL: ' + lAddStr);
    } else if (d.pd) {
      lines.push('PD  : ' + d.pd);
    }
  }

  const strDisetujui = 'Disetujui,';
  lines.push(padRight('', W - strDisetujui.length) + strDisetujui);
  lines.push('');
  lines.push('');
  lines.push('');
  const strTtd = '(...........)';
  lines.push(padRight('', W - strTtd.length) + strTtd);
  lines.push('SYARAT DAN KETENTUAN');
  lines.push('* KACAMATA YANG TIDAK DIAMBIL DALAM JANGKA WAKTU 2 BULAN MAKA UANG MUKA');
  lines.push('  AKAN DINYATAKAN HANGUS DAN DILUAR RESIKO KAMI');

  return {
    lines,
    textData: lines.join('\r\n') + '\r\n\r\n'
  };
}

module.exports = {
  formatReceiptText
};
