# Teknons platform · Teknons Compta · Teknons POS · Teknons Hôtel

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

Teknons POS (shops and supermarkets):

```bash
npm run seed:shop     # optional: demo "Supermarché Le Wouri" (2 shops + warehouse, 51 articles, a week of sales)
npm run start:shop    # same as MODULES=shop npm start
```

Teknons Hôtel (hotels, lodges and resorts, up to 5 stars):

```bash
npm run seed:hotel    # optional: demo 5-star "Palais des Palmiers" in Douala (41 rooms, two weeks of history)
npm run start:hotel   # same as MODULES=hotel npm start
```

Hotel demo accounts, password `demo1234`: `demo@teknons.cm` (owner), `gerant@teknons.cm` (general manager),
`reception@teknons.cm` and `nuit@teknons.cm` (front desk), `menage@teknons.cm` and `menage2@teknons.cm` (housekeeping),
`bar@teknons.cm` and `spa@teknons.cm` (restaurant, bar, spa), `compta@teknons.cm` (accountant). Manager code `2580`.
Guest pages: `/book` (booking engine) and the guest app link printed on each booking and room QR code.

POS demo accounts, password `demo1234`: `demo@teknons.cm` (owner), `gerant@teknons.cm` (store manager),
`caisse@teknons.cm` and `caisse2@teknons.cm` (cashiers), `stock@teknons.cm` (storekeeper), `compta@teknons.cm` (accountant).
Manager code at the till: `2580`.

Demo accounts (after `npm run seed`), password `demo1234`:
`demo@teknons.cm` (owner), `compta@teknons.cm` (accountant), `vente@teknons.cm` (sales), `caisse@teknons.cm` (cashier).

Without the demo, the first visitor creates the company and becomes its owner. Sign-up then closes;
the owner adds staff from **Utilisateurs et rôles**. Set `ALLOW_SIGNUP=1` to let several companies sign up on one server.

## Deploy on Coolify

1. New resource, this repository, build pack **Dockerfile**, base directory **/platform** (or **/** if this folder is its own repository).
2. Port **3000** (Coolify default). Mount a persistent volume at **/data** (it holds `teknons.db`).
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
| `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `ADMIN_NAME`, `ADMIN_COMPANY` | Creates this owner account on start if missing (joins the first company on the server, or creates one) |
| `MODULES` | `accounting` (Teknons Compta, default), `shop` (Teknons POS) or `hotel` (Teknons Hôtel), Compta included. Each deployment is one product with its own colour |
| `LOCK_SYSTEM` | Hotel door locks: `simulation` (default) or `bridge` |
| `LOCK_BRIDGE_URL`, `LOCK_BRIDGE_TOKEN` | Hotel: HTTP bridge to the lock encoder (Salto, VingCard / ASSA ABLOY, dormakaba, Onity…). It receives `POST /encode`, `/revoke` and `/read` |
| `SEED_DEMO=1` | Test servers only: create the demo company of that product on first start |

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


## What Teknons POS does (20 modules)

`MODULES=shop`. Navy `#0A2540` with sky-blue accent `#0B8AC9`. Teknons Compta runs underneath, so
every sale, purchase and payment lands in the SYSCOHADA books without double entry.

| # | Module | What it does |
|---|---|---|
| 1 | Caisse rapide | Full-screen till: USB/Bluetooth barcode scanner (keyboard mode), phone camera scanning, touch buttons by category, name search, `3*code` for quantities, F2/F4/F8 shortcuts, beep |
| 2 | Écran client | Second screen facing the customer (same PC or a tablet): items as they are scanned, promotions, savings, total, change and points earned |
| 3 | Balances | EAN-13 scale labels (prefix 21–29 + PLU + weight or price), articles sold by the kilo |
| 4 | Étiquettes et codes-barres | Internal EAN-13 for articles without one, A4 label sheets (name, price, promo price, barcode) |
| 5 | Prix détail et gros | Two price levels: wholesale from a quantity, or always for "wholesale" customers |
| 6 | Promotions | Percent off (article, category or store), promo price, bundle (3 for 1 000), buy X get Y free, dates and "happy days"; applied automatically |
| 7 | Carte de fidélité | Card number or barcode, points per FCFA spent, points used as a discount, printable card |
| 8 | Compte prépayé et bonus | Customer top-ups with a % bonus, pay with the account or the bonus (account 419) |
| 9 | Crédit client | Credit limit per customer, credit sales become invoices in Compta, repayments at the till, reminders |
| 10 | Retours et échanges | Linked to the original receipt, refund in cash, Mobile Money or to the prepaid account, credit note when it was on credit |
| 11 | Paiements | Cash with change, MTN MoMo and Orange Money (prompt on the customer's phone or transaction number), card, prepaid, credit, split payments |
| 12 | Tickets | 80 mm receipt, sent by WhatsApp or SMS with a link (no app needed), reprint |
| 13 | Sessions de caisse | Opening float, cash in/out, X report, closing with denomination count, Z report, variance alert, one accounting entry per session |
| 14 | Contrôle gérant | Manager code for voids, returns, price changes, large discounts, credit over the limit; price-change alerts; activity log |
| 15 | Stock multi-boutiques | Stock per shop and warehouse, weighted average cost, movements history |
| 16 | Péremptions | Lots with expiry dates (FEFO), alert N days before, expired list |
| 17 | Commandes fournisseurs | Suggestions from low stock grouped by supplier, PDF/WhatsApp order, receipt with lots, supplier bill created in Compta |
| 18 | Transferts | Warehouse → shop and shop → shop, "in transit" until received, shortfall alert |
| 19 | Inventaires | Count on the phone by scanning (camera or scanner), differences valued and posted |
| 20 | Rapports | Live dashboard, margin per article, sales per hour and weekday, per cashier (voids, variances), per shop, Excel export |

The till keeps working without internet: the catalogue, customers and promotions are cached, tickets
are queued and sent when the network returns (no duplicates), and a provisional receipt can be printed.

Accounting at session close (journal CA): D 5711 / 5521 / 5522 / 5211 / 419, C 701 and 4431, with
promotions and points deducted from revenue. Credit sales are validated invoices (D 411). Prepaid
top-ups and bonuses go to 419 per customer. Goods receipts create supplier bills (D 601 / 4452, C 401).

## What Teknons Hôtel does (24 modules)

`MODULES=hotel`. Navy `#0C2D3E` with petrol-blue accent `#0E8F9B`. Teknons Compta runs underneath: every
night, meal, treatment and payment lands in the SYSCOHADA books.

| # | Module | What it does |
|---|---|---|
| 1 | Tableau de bord | Occupancy tonight, ADR, RevPAR, guests in house, in-house balance, arrivals, departures, rooms, revenue by department, payments by method, birthdays, satisfaction |
| 2 | Réception | Arrivals, in house, departures, search; walk-ins; check-in with the police registration card (ID required), room choice, upgrade, dirty-room warning |
| 3 | Planning des chambres | Room rack over 7–14 days, free rooms per type and night, tap a free cell to book, out-of-order rooms |
| 4 | Réservations | Individual, group (up to 50 rooms) and day-use bookings, options, cancellation, no-show, reinstatement, Excel export |
| 5 | Tarifs | Room types with weekday, weekend and day-use prices, rate plans (breakfast, non-refundable, long stay, corporate), seasons, negotiated rates under manager control |
| 6 | Note du client (folio) | Nights, breakfast, tourist tax, outlets, extras; void with reason and manager code; move room; extend; late check-out; loyalty points |
| 7 | Paiements | Cash (FCFA, EUR, USD at the hotel rate), card, MTN MoMo and Orange Money push to the guest's phone, bank, cheque; deposits; refunds |
| 8 | Départ et facturation | Invoice created and posted in Compta, payments linked, keys disabled, room to clean; company billing (city ledger, 411) |
| 9 | Cartes-clés | Encode 1–4 key cards per stay with access (pool, gym, spa, lift, parking, lounge), lost/revoked cards, card reader lookup, automatic expiry |
| 10 | Restaurant, bars, services | Touch sales screen per outlet, charge to the room by number or key card, or collect at once; table and covers; allergies shown |
| 11 | Écran cuisine et bar | Live tickets new → preparing → ready → served, late tickets highlighted, guest-app orders flagged |
| 12 | Room service et minibar | Orders from the guest app, minibar checks by housekeeping charged to the room |
| 13 | Spa et activités | Appointments with therapist clash check, guest requests from the app, done → charged to the room or paid |
| 14 | Blanchisserie, transferts, salles | Laundry, airport transfers, cars with driver, meeting rooms as outlets with their own menus |
| 15 | Conciergerie | Guest requests (towels, taxi, wake-up, airport, restaurant…) live from the app or the desk, assignment, status |
| 16 | Ménage | Room board by floor: clean, cleaning, dirty, inspected, do-not-disturb, assignment, occupancy check that alerts on rooms seen occupied without a registered guest |
| 17 | Maintenance | Issues by room or area, priority, room blocked from sale, cost, back in service automatically |
| 18 | Objets trouvés | Found items with likely owner, storage place, returned or disposed |
| 19 | Audit de nuit | Posts every in-house night, no-shows, stayovers to clean, expires keys, daily statistics, moves the business date; runs by itself at the chosen hour |
| 20 | Rapports | Occupancy, ADR, RevPAR, revenue by channel, room type and department, nationalities, tourist tax to pay, cashier report, Excel |
| 21 | Registre de police | Traveller register for the authorities, printable and Excel |
| 22 | Appli client (QR) | Phone page for each stay and each room: stay details, Wi-Fi, do-not-disturb, room service, spa, concierge, late check-out, bill, Mobile Money payment, review |
| 23 | Moteur de réservation | Commission-free booking page: dates, rooms, offers, deposit by MTN MoMo or Orange Money, link to the guest app |
| 24 | Booking.com, Airbnb, Expedia | iCal import every 30 min and iCal export per room type, so channels never double-book |

Accounting: room nights 7061, food and beverage 7062, spa and other services 7063, VAT 19,25 % (4432), tourist tax
collected in 4428 without VAT. Prices are entered VAT included and invoices match them to the franc. Payments
are posted as they are taken (D 5711 / 5521 / 5522 / 5211, C 411 of the payer) and matched to the invoice at check-out.

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
