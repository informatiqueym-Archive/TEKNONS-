# Teknons platform · Teknons Compta

The shared core for the 10 Teknons sector platforms, with the first complete
module: **Teknons Compta**, accounting and invoicing for Cameroonian SMEs
(SYSCOHADA révisé, FCFA, TVA 19,25 %, MTN MoMo and Orange Money, French and English).

This folder is independent from the website at the root of the repository.
It can be moved to its own repository as is.

## Run it

Requires Node.js 22.13 or later. There is nothing to install (`npm install` is not needed).

```bash
cd platform
npm run seed          # optional: demo company "Kmer Digital Services SARL" with 6 months of activity
npm start             # http://localhost:3100
npm test              # automated accounting tests
```

Demo accounts (after `npm run seed`), password `demo1234`:
`demo@teknons.cm` (owner), `compta@teknons.cm` (accountant), `vente@teknons.cm` (sales), `caisse@teknons.cm` (cashier).

Without the demo, the first visitor creates the company and becomes its owner. Sign-up then closes;
the owner adds staff from **Utilisateurs et rôles**. Set `ALLOW_SIGNUP=1` to let several companies sign up on one server.

## Deploy on Coolify

1. New resource, this repository, build pack **Dockerfile**, base directory **/platform**.
2. Port **3100**. Mount a persistent volume at **/data** (it holds `teknons.db`).
3. Environment variables:

| Variable | Purpose |
|---|---|
| `COOKIE_SECURE=1` | Set when served over HTTPS (recommended) |
| `PUBLIC_URL` | e.g. `https://compta.teknons.com`, used for Mobile Money callbacks |
| `MOMO_MODE` | `simulation` (default, no real money), `sandbox` or `live` |
| `MTN_MOMO_SUBSCRIPTION_KEY`, `MTN_MOMO_API_USER`, `MTN_MOMO_API_KEY`, `MTN_MOMO_TARGET_ENV` | MTN MoMo Collections API (momodeveloper.mtn.com). Target env is `mtncameroon` in production |
| `ORANGE_MONEY_BASE_URL`, `ORANGE_MONEY_CONSUMER_KEY`, `ORANGE_MONEY_CONSUMER_SECRET`, `ORANGE_MONEY_API_USERNAME`, `ORANGE_MONEY_API_PASSWORD`, `ORANGE_MONEY_MERCHANT_NUMBER`, `ORANGE_MONEY_PIN` | Orange Money Cameroon merchant payment API, from the Orange merchant contract |
| `MOMO_AGGREGATOR=campay`, `CAMPAY_USERNAME`, `CAMPAY_PASSWORD`, `CAMPAY_BASE_URL` | Collect MTN and Orange through one Campay account instead of two operator contracts (fastest to open) |
| `ALLOW_SIGNUP=1` | Allow several companies to sign up |

Backups: copy `/data/teknons.db` (SQLite) every night.

## What Teknons Compta does (20 modules)

| # | Module | What it does |
|---|---|---|
| 1 | Tableau de bord | Live phone dashboard: cash available, today's receipts, sales, profit, receivables, overdue, 12-month chart |
| 2 | Clients | Customer file, statement of account, WhatsApp and call buttons |
| 3 | Fournisseurs | Supplier file and statement |
| 4 | Articles et services | Price list with VAT rate and ledger account per item |
| 5 | Devis | Quotes with validity date, sent/accepted/refused, one-click conversion to invoice |
| 6 | Factures | Sequential numbering on validation (FAC-2026-0001), locked once posted, amount in French words, PDF |
| 7 | Avoirs | Credit notes linked to the invoice, full or partial |
| 8 | Encaissements | Cash, bank, cheque, MTN MoMo, Orange Money; receipt PDF; partial payments |
| 9 | Paiement Mobile Money | Payment link per invoice (WhatsApp, SMS, QR code on the PDF): the customer picks MTN MoMo or Orange Money (guessed from the number), confirms with their PIN, and the invoice settles itself. Manual USSD fallback with "J'ai payé" alert. One-tap reminders for overdue invoices |
| 10 | Factures fournisseurs | Supplier bills with deductible VAT, paid in one or several times |
| 11 | Dépenses | Quick expense entry (fuel, rent, power…) by nature of expense |
| 12 | Trésorerie | Cash, bank and Mobile Money balances, internal transfers with fees |
| 13 | Plan comptable | SYSCOHADA révisé chart (about 200 accounts), sub-accounts |
| 14 | Journaux et écritures | VT, AC, BQ, CA, MM, OD, AN; manual entries; reversal instead of deletion |
| 15 | Grand livre et balance | General ledger with running balance; 6-column trial balance |
| 16 | Bilan | Balance sheet (actif / passif) at any date |
| 17 | Compte de résultat | Income statement with margin, value added, EBE, operating, financial and HAO results |
| 18 | TVA | Collected vs deductible, split 17,5 % + CAC, settlement entry |
| 19 | Relances et balance âgée | Aged receivables and payables, overdue alerts |
| 20 | Administration | Users and 6 roles, company settings, period lock and year-end closing, activity log, alerts |

Every report exports to **Excel (.xlsx)** and **PDF** (print page, "Enregistrer en PDF").

## Shared core (reused by the other 9 platforms)

- `core/`: database, HTTP routing, accounts and roles, sessions, clients/suppliers, products,
  alerts, activity log, live updates (Server-Sent Events), Excel writer, FCFA formatting and
  amounts in French words, MTN MoMo and Orange Money connectors.
- `public/js/api.js`: **offline mode**. Screens already opened stay readable without network, and
  new clients, invoices, payments, expenses and entries are queued on the phone, then sent when
  the connection returns (no duplicates thanks to `Idempotency-Key`).
- `public/js/ui.js`, `public/css/app.css`: the Teknons interface, phone-first, French and English.

A new sector (restaurant, shop, school, hotel, clinic…) is a folder in `modules/` with
`migrate`, `routes`, `onCompanyCreated` and `jobs`, registered in `modules/index.js`, plus its
screens. It gets users, roles, clients, products, Mobile Money, alerts, offline mode and the
accounting module for free (`MODULES=accounting,restaurant`).

## Accounting rules used

- Amounts are whole FCFA. VAT is computed per line and rounded to the franc.
- Invoice: D 411 client / C 701 (goods) or 706 (services) / C 4431 or 4432 VAT.
- Supplier bill: D 60x–63x / D 4452 or 4454 / C 401.
- Receipt: D 5211 bank, 5711 cash, 5521 MTN MoMo or 5522 Orange Money / C 411.
- Validated documents and entries are never edited or deleted: use a credit note, cancel the payment
  (reversal entry) or reverse the entry. Closed periods refuse new entries.

Check the chart mapping and report layouts with a chartered accountant before using the figures for
the annual DSF filing; the app produces the working figures, not the official DSF form.
