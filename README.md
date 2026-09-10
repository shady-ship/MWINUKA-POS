# MWINUKA POS

MWINUKA POS is a point-of-sale application for managing products, stock, customers, orders, sales reports, and printable invoices.

The project is built as a React frontend backed by an Express API and a MySQL database.

## Features

- Product and inventory management
- Customer records
- Order creation and order history
- Cash and other payment methods
- Sales and stock reports
- Admin and sales-staff views
- Printable invoices
- JWT-based authentication
- Automatic database table creation and development seed data

## Technology

- React 19 with Vite
- React Router
- Tailwind CSS
- Recharts
- Express.js
- MySQL using `mysql2`
- JSON Web Tokens and `bcryptjs`

## Requirements

- Node.js 18 or newer
- npm
- MySQL 8 or compatible MySQL server

On Windows, the included `start.bat` expects XAMPP MySQL at:

```text
C:\xampp\mysql\bin\mysqld.exe
```

If MySQL is installed elsewhere, start it manually or update `start.bat`.

## Getting Started

### 1. Create the database

Create an empty MySQL database named `mwinuka_pos`:

```sql
CREATE DATABASE mwinuka_pos;
```

The backend creates the application tables and development users when it starts.

### 2. Configure the backend

Create `backend/.env` with values for your local database:

```env
PORT=5000
JWT_SECRET=replace-with-a-long-random-secret
DB_HOST=localhost
DB_USER=root
DB_PASS=
DB_NAME=mwinuka_pos
DB_PORT=3306
```

Never commit `backend/.env` or use the sample development secret in production.

### 3. Install dependencies

From the project root:

```bash
npm install
npm run install:all
```

### 4. Start the application

Run both services together:

```bash
npm run dev
```

Or start them separately:

```bash
npm run dev:backend
npm run dev:frontend
```


On Windows with XAMPP configured, `start.bat` can start the database, backend, and frontend together.

## Development Accounts

The first backend startup seeds these accounts when the `users` table is empty:

| Role | Email | Password |
| --- | --- | --- |
| Administrator | `admin@mwinuka.co.tz` | `admin123` |
| Sales staff | `john@mwinuka.co.tz` | `staff123` |

These credentials are for local development only. Change or remove them before deploying.

## Available Scripts

Run these commands from the project root:

| Command | Description |
| --- | --- |
| `npm run dev` | Start frontend and backend development servers |
| `npm run dev:frontend` | Start the Vite development server |
| `npm run dev:backend` | Start the Express server with Node watch mode |
| `npm run build` | Build the frontend for production |
| `npm start` | Start the backend server |
| `npm run install:all` | Install frontend and backend dependencies |

Frontend-only commands can be run from `frontend/`:

```bash
npm run lint
npm run build
npm run preview
```

Backend-only commands can be run from `backend/`:

```bash
npm run dev
npm start
npm run seed
```

## Project Structure

```text
backend/
  config/       Database connection and seed setup
  middleware/   Authentication middleware
  routes/       Auth, product, order, customer, and report APIs
  server.js     Express application entry point
frontend/
  src/components/  Shared UI and layout components
  src/context/     Application and authentication state
  src/pages/       Sales, inventory, reports, and admin screens
  src/App.jsx      Frontend routing and application shell
```




