# Software Requirements Specification (SRS)
## MWINUKA ENTERPRISES CO. LTD — Point of Sale System (MVP)

- **Version:** 1.1
- **Date:** 2026-10-01
- **Status:** Live MVP
- **Owner:** Mwinuka Enterprises Co. Ltd, Mbeya, Tanzania

---

## 1. Introduction

### 1.1 Purpose
This document defines the software requirements for the MWINUKA Point of Sale (POS) system. The system records sales, manages products, prices, stock, customers, orders and generates printed receipts for a retail shop.

### 1.2 Scope
In scope:
- Product catalogue with multi-unit price matrix (Retail / Wholesale / Optional)
- Packaged stock tracking (cartons, dozens, pieces)
- Sales flow: cart → order → payment → printed 80 mm receipt
- Customers and outstanding balances
- Orders history and sales reports
- Staff accounts with per-module access control
- Device/session management and audit logging
- Business profile settings
- Login-notification emails (Gmail SMTP) alerting the owner of every staff login

Out of scope (planned, not MVP): multi-branch, cloud hosting, offline mode, accounting/loss reports.

### 1.3 Definitions & Terms
| Term | Meaning |
|---|---|
| POS | Point of Sale |
| Unit | Selling unit: Piece, Dozen, Carton |
| Retail / Wholesale / Optional | Three sellable price types per unit |
| `allow_manual_price` | Permission allowing a user to type a custom selling price |
| Admin module | A backend section a staff member may be granted access to |
| SMTP | Simple Mail Transfer Protocol — used to relay login alert emails |
| App password | A 16-character Google app password, required because Gmail blocks normal-password SMTP login |

### 1.4 Operating Environment
- **Host:** Windows PC on the shop LAN (static IP `192.168.1.116`)
- **Access:** browser at `http://192.168.1.116:5000` (LAN); optionally a free tunnel (ngrok/Cloudflare) for off-site access
- **Stack:** React + Vite (frontend), Node.js Express (backend, port 5000), MariaDB (MySQL-compatible) on port 3306

### 1.5 Users & Roles
| Role | Description |
|---|---|
| **Admin** | Full access to all modules. Manages products, staff, permissions, settings, reports. |
| **Sales Staff** | Sells products. Access limited to granted modules (e.g., Products, Orders, Reports). |

Default accounts: `admin@mwinuka.co.tz`, `john@mwinuka.co.tz` (sales staff).

---

## 2. Functional Requirements

### 2.1 Authentication & Security (FR-AUTH)
- **FR-AUTH-1 — Login.** A user signs in with email **or** username and a bcrypt-hashed password. Successful login issues a JWT (24 h) plus a server-side session record (device, browser, OS, IP).
- **FR-AUTH-2 — Logout.** Ends the session server-side; the token becomes unusable.
- **FR-AUTH-3 — Session enforcement.** Every API request (except login and health) requires a valid JWT **and** a valid `x-session-id`. Revoked/ended sessions receive `401` and the app auto-logs out.
- **FR-AUTH-4 — Change password.** A user may change their own password; an admin may change any user's password.
- **FR-AUTH-5 — Permission live-refresh.** Permissions are re-read from the database on every request, and the UI refreshes `/auth/me` every 30 s (and on window focus), so granted modules appear on a salesman's sidebar without re-login.
- **FR-AUTH-6 — Login notification.** When login alerts are enabled and SMTP is configured, every successful login sends one email to the alert recipient containing the user's name, username, role, device, browser, OS, IP address and login time. Email delivery is best-effort and must never block or fail the login itself.
- **FR-AUTH-7 — Test notification.** An admin can send an on-demand test alert from Settings to verify delivery before relying on the feature.

### 2.2 Roles & Module Access (FR-ACCESS)
- **FR-ACCESS-1.** Modules: Dashboard, Products, Stock, Sales, Orders, Customers, Staff, Devices, Reports, Settings, Audit Log.
- **FR-ACCESS-2.** Admin has all modules. Sales staff have only the `admin_modules` granted by admin.
- **FR-ACCESS-3.** Navigating to a forbidden module redirects the user away; API calls are enforced server-side (`adminOnly`).

### 2.3 Products (FR-PROD)
- **FR-PROD-1.** CRUD products: name, category, unit, stock, min-stock threshold, buy cost.
- **FR-PROD-2.** Per-unit price matrix: each unit (Piece/Dozen/Carton) may carry Retail, Wholesale and Optional prices.
- **FR-PROD-3.** Pack factors: pieces-per-carton, dozens-per-carton, pieces-per-dozen (default 12) drive stock breakdown display (e.g., `2 cartons + 1 dozen + 4 pcs`).
- **FR-PROD-4.** Products can be deactivated (hidden from sales) without deleting history.
- **FR-PROD-5.** Business rule: a selling price must be **greater than the per-unit buy cost**; a product cannot be sold below or equal to its buy cost.

### 2.4 Stock (FR-STOCK)
- **FR-STOCK-1.** View stock for every product with pack breakdown and low-stock/out-of-stock indicators.
- **FR-STOCK-2.** Stock decrements when an order is completed (per unit sold, converted to pieces).

### 2.5 Sales / New Order (FR-SALES)
- **FR-SALES-1.** Build a cart from the product list; pick a unit and price type; quantity in pieces/dozens/cartons.
- **FR-SALES-2.** Optional pricing allowed only if the user has `allow_manual_price`.
- **FR-SALES-3.** Payment: Cash or credit (customer balance). Revenue counts **paid items only**.
- **FR-SALES-4.** On completing an order: order records, per-item lines, stock decrement, printed 80 mm receipt/invoice (invoice number, items, totals, balance due).

### 2.6 Orders & Customers (FR-ORD)
- **FR-ORD-1.** Order history with search by order number/customer/salesman, status filter, item details.
- **FR-ORD-2.** Customers: add, search, view order history and outstanding balances; payment/balance handling on orders.
- **FR-ORD-3.** Reprint an invoice and print a daily order report.

### 2.7 Staff Management (FR-USERS)
- **FR-USERS-1.** Admin can add/edit/deactivate/delete staff; set role, `admin_modules`, `allow_manual_price`, reset passwords.
- **FR-USERS-2.** Non-admin users can edit only their own basic profile fields.

### 2.8 Devices & Sessions (FR-DEV)
- **FR-DEV-1.** List all login sessions (device, browser, OS, IP, login/last-seen, active/online).
- **FR-DEV-2.** Admin can force sign-out any session; the affected user's next request returns `401` and they are logged out.

### 2.9 Reports (FR-REP)
- **FR-REP-1.** Sales summary (revenue from paid items), popular products, order lists; date filtering.
- **FR-REP-2.** Admin-only reset tools: reset orders (and optionally all data/stock) for testing/reopening a period.

### 2.10 Audit Log (FR-AUDIT)
- **FR-AUDIT-1.** Record user actions (login, logout, session revoke, user add/update/delete, password change) with username, role, action, details and timestamp.
- **FR-AUDIT-2.** Admin can view/filter the log.

### 2.11 Settings (FR-SET)
- **FR-SET-1.** Business profile: name, tagline, phone, email, address — printed on the invoice and shown across the app. Only admin can change.
- **FR-SET-2 — Login alerts.** Admin can enable/disable login notifications and set the recipient email address. Credentials live only in the backend `.env` and are never editable or readable from the UI.

### 2.12 UI Requirements (FR-UI)
- **FR-UI-1.** iOS-style visual design: system font, rounded cards/corner radii, light grey backgrounds (`#F2F2F7`), iOS blue `#007AFF`, translucent blurred headers.
- **FR-UI-2.** Responsive: sidebar collapses to a bottom tab bar on phones; tables scroll horizontally; top-bar menu dropdown on sales screens.
- **FR-UI-3.** Global product search in the top bar with live results linking to the filtered Products page.

---

## 3. Non-Functional Requirements

| ID | Requirement |
|---|---|
| NFR-1 | **Security** — bcrypt password hashing; JWT with HMAC secret from `.env`; session revocation; admin-only enforced on every protected endpoint. |
| NFR-2 | **Performance** — lists under ~1 s on LAN; lightweight polling (30 s ping + `/auth/me`). |
| NFR-3 | **Availability** — runs on a single always-on Windows PC; LAN reachable at static IP; requires the MariaDB service. |
| NFR-4 | **Usability** — minimal taps to complete a sale; receipt printing on click. |
| NFR-5 | **Maintainability** — modular Express routers; React contexts; single `dist` bundle served by the backend. |
| NFR-6 | **Localization** — UI labels in English; Swahili copy available in content. |
| NFR-7 | **Data integrity** — revenue = paid items only; selling price enforced above buy cost; stock converted via pack factors. |
| NFR-8 | **Credential handling** — the Gmail app password is stored only in the backend `.env`, never committed to source control, never returned by any API, and never displayed in the UI. |
| NFR-9 | **Alert reliability** — notification failures are logged but swallowed, so no user can ever be locked out of the POS because an email failed. |

---

## 4. Constraints & Assumptions
- Single shop, single host PC; no cloud fallback required (tunnel access optional).
- Login alerts depend on outbound access to `smtp.gmail.com:587` from the host PC. A network that filters or blocks outbound SMTP (for example TLS-inspecting firewalls) will prevent delivery; LAN operation is unaffected.
- SMS notification is not implemented. Adding it requires a third-party gateway (e.g. Africa's Talking) with an account and API credentials.
- Data stored in a local MariaDB database `mwinuka_pos` (MySQL 5.x compatible).
- Internet access is not required for normal LAN operation.
- Printing assumes a local 80 mm thermal receipt printer via browser print.

---

## 5. Revision History
| Version | Date | Change |
|---|---|---|
| 1.0 | 2026-09-30 | Initial MVP baseline (auth, sales, products, stock, orders, customers, staff access, sessions, audit, reports, settings, iOS-style responsive UI). |
| 1.1 | 2026-10-01 | Added login-notification emails (FR-AUTH-6, FR-AUTH-7, FR-SET-2) via Gmail SMTP, with credential-handling and reliability non-functional requirements. |