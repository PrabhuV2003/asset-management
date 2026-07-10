# Asset Management System

An internal asset tracking system for managing company hardware — employees, asset categories, assets, issue/return/scrap workflows, and reports.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Runtime | Node.js |
| Framework | Express.js |
| Database | PostgreSQL |
| ORM | Sequelize |
| Views | Jade (Pug 1.x) |
| UI | Bootstrap 5 + Bootstrap Icons |

---

## Prerequisites

Make sure the following are installed on your machine before running the project:

| Tool | Version | Download |
|---|---|---|
| **Node.js** | v18 or above | https://nodejs.org |
| **npm** | Comes with Node.js | — |
| **PostgreSQL** | v13 or above | https://www.postgresql.org/download |
| **Git** | Any recent version | https://git-scm.com |

---

## Clone the Repository

```bash
git clone https://github.com/PrabhuV2003/asset-management.git
cd asset-management
```

---

## Install Dependencies

```bash
npm install
```

---

## Environment Setup

Create a `.env` file in the root of the project:

```bash
# On Windows
copy .env.example .env

# On Mac/Linux
cp .env.example .env
```

Then open `.env` and fill in your values:

```env
# PostgreSQL connection
DB_HOST=localhost
DB_PORT=5432
DB_NAME=asset_management
DB_USER=postgres
DB_PASS=your_postgres_password

# Express session secret (any long random string)
SESSION_SECRET=your_super_secret_key_here

# Environment
NODE_ENV=development
```

---

## Database Setup

1. Open **pgAdmin** or the **psql** terminal
2. Create a new database:

```sql
CREATE DATABASE asset_management;
```

> The tables are created automatically when you first run the app (`sequelize.sync({ alter: true })`). You do **not** need to run any SQL migration files manually.

---

## Seed the First Admin User

After starting the app once (so the tables are created), run the seed script to create the default admin account:

```bash
npm run seed
```

This creates:

| Field | Value |
|---|---|
| User ID | `ADMIN-001` |
| Password | `admin123` |
| Role | `employee_master` |

> **Change the password immediately after first login.**

---

## Running the Project

### Development (with auto-restart on file changes)

```bash
npm run dev
```

### Production

```bash
npm start
```

The app runs at: **http://localhost:3000**

---

## Project Structure

```
asset-management/
├── config/
│   └── database.js          # Sequelize connection setup
├── middleware/
│   └── auth.js              # isLoggedIn, requireRole middleware
├── models/
│   ├── index.js             # Associations + sync
│   ├── User.js
│   ├── Employee.js
│   ├── AssetCategory.js
│   ├── Asset.js
│   └── AssetIssue.js
├── routes/
│   ├── auth.js
│   ├── dashboard.js
│   ├── employees.js
│   ├── categories.js
│   ├── assets.js
│   ├── issues.js
│   └── reports.js
├── views/
│   ├── layout.jade
│   ├── dashboard/
│   ├── employees/
│   ├── categories/
│   ├── assets/
│   ├── issues/
│   └── reports/
├── utils/
│   └── generateAssetId.js
├── scripts/
│   └── seed.js
├── app.js
├── package.json
└── .env                     # ← you create this (not in Git)
```

---

## User Roles

| Role | Access |
|---|---|
| `employee_master` | Full access — all modules including employee management |
| `asset_master` | Assets, categories, issue/return/scrap, reports |
| `employee` | My Assets page only |

---

## Common Issues

**`relation "employees" does not exist`**
→ The app hasn't synced yet. Just run `npm run dev` once and tables are auto-created.

**`password authentication failed for user "postgres"`**
→ Wrong `DB_PASS` in your `.env` file.

**Port 3000 already in use**
→ Another process is using port 3000. Stop it or change the port in `app.js`.

**`.env` file not found**
→ Make sure the `.env` file is in the root folder (same level as `app.js`), not inside any subfolder.

---

## License

MIT
