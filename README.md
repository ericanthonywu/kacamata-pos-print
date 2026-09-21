# Kacamata POS Print Service

A simple Node.js microservice running on the client local machine to handle raw dot-matrix printing (e.g. Epson LX-310) for **Kacamata POS**.

## Features
- Opens print URL (e.g., `http://localhost:3001/print/:no_nota`) in a new browser tab.
- Displays a loading screen while fetching sale/invoice details from the main POS server API.
- Formats the sale receipt formatted specifically for LX-310 (80 columns dot matrix).
- Triggers terminal/system print command directly to the shared local printer.
- Automatically closes the browser tab after successful printing.

## Setup Instructions

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Configure Environment**
   Copy `.env.example` to `.env` and set your configuration:
   ```env
   PORT=3001
   SERVER_API_URL=http://your-pos-server.com
   PRINTER_NAME=LX310
   ```

3. **Printer Setup (Windows)**
   Ensure your printer (e.g., Epson LX-310) is connected and shared over the network:
   - Go to Control Panel > Devices and Printers.
   - Right-click your printer -> Printer Properties -> Sharing tab.
   - Check "Share this printer" and set the share name to match `PRINTER_NAME` in `.env` (e.g., `LX310`).

4. **Run the Application**
   ```bash
   npm start
   ```

## Usage
To trigger printing from the POS web client, open a link or window targeting:
```
http://localhost:3001/print/INV-202609001
```
Or with query parameter:
```
http://localhost:3001/print?no_nota=INV-202609001
```
