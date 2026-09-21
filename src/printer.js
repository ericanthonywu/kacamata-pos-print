const fs = require('fs');
const path = require('path');
const os = require('os');
const { exec } = require('child_process');

function sanitizePrinterName(printerName) {
  if (typeof printerName !== 'string') return 'LX310';
  // Allow alphanumeric, spaces, hyphens, underscores
  const sanitized = printerName.replace(/[^a-zA-Z0-9_\-\s]/g, '').trim();
  return sanitized || 'LX310';
}

function printRawText(textData, printerName, callback) {
  const safePrinterName = sanitizePrinterName(printerName);
  const tempFile = path.join(os.tmpdir(), `nota_temp_${Date.now()}_${Math.random().toString(36).substring(2, 7)}.txt`);

  fs.writeFile(tempFile, textData, 'utf8', (err) => {
    if (err) {
      return callback(err);
    }

    let printCommand;
    if (process.platform === 'win32') {
      const host = os.hostname();
      printCommand = `copy /b "${tempFile}" "\\\\${host}\\${safePrinterName}"`;
    } else {
      // Unix/Linux/macOS lp command
      printCommand = `lp -d "${safePrinterName}" "${tempFile}" || cat "${tempFile}"`;
    }

    exec(printCommand, (error, stdout, stderr) => {
      fs.unlink(tempFile, () => {});
      if (error) {
        console.error('Print command error:', error || stderr);
        return callback(error);
      }
      callback(null, stdout);
    });
  });
}

module.exports = {
  sanitizePrinterName,
  printRawText
};
