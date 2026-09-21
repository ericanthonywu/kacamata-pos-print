# Kacamata POS Print Service

A lightweight Node.js microservice running on each store's local computer (Windows 7 / 10 / 11) to handle raw dot-matrix printing (e.g. Epson LX-310) for **Kacamata POS**.

## Features
- **Clean Standard URL**: `http://localhost:3000/print/:no_nota`
- **Windows 7 & Node.js 14 Compatible**: Zero external HTTP dependencies; uses native Node.js `https`/`http` request handling.
- **Automatic Store Header**: Prints correct store branding (`OPTIK SENTRAL PONTIANAK` or `OPTIK KACAMATA LENSA`) provided by the server API response.
- **HTTPS POS Compatible**: Seamlessly connects to remote HTTPS POS server APIs from local Node.js without mixed-content issues.
- Formats sale receipts specifically for Epson LX-310 (80 columns continuous dot matrix).
- Sends raw print command directly via Windows terminal (`copy /b`).
- Automatically closes the browser tab after successful printing.

## Setup Instructions

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Configure Environment**
   Copy `.env.example` to `.env` and set the URL of the POS server for this store:
   ```env
   PORT=3000
   PRINTER_NAME=LX310

   # Contoh untuk komputer toko Ketapang:
   SERVER_API_URL=https://pos.yourdomain.com/ketapang

   # Contoh untuk komputer toko Pontianak:
   # SERVER_API_URL=https://pos.yourdomain.com/pontianak
   ```

3. **Printer Setup (Windows 7 / 10 / 11)**
   Ensure your printer (e.g., Epson LX-310) is connected and shared:
   - Go to **Control Panel** > **Devices and Printers**.
   - Right-click your printer -> **Printer Properties** -> **Sharing** tab.
   - Check **"Share this printer"** and set the Share Name to match `PRINTER_NAME` in `.env` (e.g., `LX310`).

4. **Run the Application**
   ```bash
   npm start
   ```

## Usage
The web POS application triggers printing automatically when clicking **Simpan & Print** or **Print Nota**:
`http://localhost:3000/print/INV-YYYYMMDD-XXXX`
