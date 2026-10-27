# Risit Buk — receipt, invoice & quote maker

Free app for PNG small businesses. Make a proper receipt, invoice or quotation on the phone, then send it as a PDF on WhatsApp or download it.
Ready Digital Consultancy · Kokopo, ENB · 70254566

## What it does
- Receipts (with PAID stamp), invoices (with due date and how to pay), quotations (with valid-until date)
- Business details, IPA number, TIN and logo saved once and shown on every document
- GST switch for GST-registered businesses: adds 10% and shows "Tax Invoice"
- Automatic numbering: RCT-0001, INV-0001, QUO-0001
- Saved list: see unpaid and overdue invoices, mark an invoice paid and turn it into a receipt in one tap, turn a quote into an invoice
- Send PDF straight to WhatsApp on Android (iPhone shares too on recent iOS), or download it
- Works offline once installed

## Put it online free (Cloudflare Pages)
1. dash.cloudflare.com → Workers & Pages → Create → Pages → Upload assets
2. Project name **risitbuk** → link becomes https://risitbuk.pages.dev
3. Upload this folder or the zip → Deploy
4. If the name is taken, change the og:url and og:image lines in index.html to your new link and upload again.
5. Before posting on Facebook, paste the link into developers.facebook.com/tools/debug → Scrape Again.

## Updating later
Change files, bump VERSION in sw.js (risitbuk-v1 → risitbuk-v2), upload to the same project.

## Security built in (Easttom, Network Defense and Countermeasures)
- Confidentiality: business, customer and bank details stay on the user's phone. No server database to breach.
- Integrity: every value is written into the page as plain text (never as HTML), which blocks script injection (XSS) through customer names or item descriptions. Amounts are cleaned and capped.
- Logo safety: uploaded pictures are type- and size-checked, then redrawn on a canvas, which shrinks them and strips hidden photo data such as GPS location.
- Hardening: _headers sets a strict Content-Security-Policy (scripts only from the app's own files; the PDF libraries are stored in /vendor rather than loaded from outside sites), blocks framing, turns off camera/mic/location and forces HTTPS.
- Availability: works offline through the service worker.

Limit to know: clearing the browser's data removes saved documents and business details. Sent PDFs stay in the user's WhatsApp.

## Deploys
This repo is connected to the Cloudflare Worker **risitbuk**. Every push to `main` builds and deploys automatically (`npx wrangler deploy`, config in wrangler.jsonc).
