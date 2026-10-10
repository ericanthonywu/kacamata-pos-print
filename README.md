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
   Copy `.env.example` to `.env` and configure printer share names:
   ```env
   PORT=3000
   PRINTER_NAME=LX310
   BARCODE_PRINTER_NAME=BARCODE

   # Contoh untuk komputer toko Ketapang:
   SERVER_API_URL=https://pos.yourdomain.com/ketapang

   # Contoh untuk komputer toko Pontianak:
   # SERVER_API_URL=https://pos.yourdomain.com/pontianak
   ```

3. **Printer Setup (Windows 7 / 10 / 11)**
   Ensure your printers are connected and shared in Windows:
   - Go to **Control Panel** > **Devices and Printers**.
   - **Nota Printer** (e.g. Epson LX-310): Right-click -> **Printer Properties** -> **Sharing** tab -> Check **"Share this printer"** -> Set name matching `PRINTER_NAME` (e.g. `LX310`).
   - **Barcode Label Printer** (e.g. Xprinter XP-4601B / XP-460B): Right-click -> **Printer Properties** -> **Sharing** tab -> Check **"Share this printer"** -> Set name matching `BARCODE_PRINTER_NAME` (e.g. `BARCODE` atau `XP-460B`).

4. **Run the Application**
   ```bash
   npm start
   ```

## Usage
- **Nota Penjualan**: `POST /api/print` with `{ text: "...", printerName: "LX310" }`
- **Barcode Label**: `POST /api/print-barcode` with `{ text: "...", printerName: "BARCODE" }` or `{ items: [...], format: "double|single", printerName: "..." }`
- **Config & Health**: `GET /api/config`

