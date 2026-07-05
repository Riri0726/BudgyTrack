<div align="center">
  <img src="https://img.shields.io/badge/Vite-B73BFE?style=for-the-badge&logo=vite&logoColor=FFD62E" alt="Vite" />
  <img src="https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB" alt="React" />
  <img src="https://img.shields.io/badge/Supabase-181818?style=for-the-badge&logo=supabase&logoColor=3ECF8E" alt="Supabase" />
  <img src="https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white" alt="Tailwind CSS" />
</div>

<h1 align="center">💸 BudgyTrack</h1>

<p align="center">
  <strong>A premium, lightning-fast, unified financial tracking and budgeting application.</strong>
</p>

<p align="center">
  BudgyTrack is designed with a sleek, solid-color aesthetic to help you visualize your cash flow, track expected vs. actual expenses, and unify your digital and physical wallets into a single cohesive dashboard—all completely optimized for the <b>₱ Philippine Peso</b>.
</p>

---

## ✨ Features

- **Unified Wallets Architecture:** Create virtual tracking accounts for physical cash, bank accounts, or E-Wallets. Your available budget perfectly matches your actual cash flow balance.
- **Real-Time Dashboard:** View total assets, track monthly income against expenses, and monitor weekly cash flow using highly responsive Recharts data visualization.
- **Expected vs. Actual Tracking:** Transactions can be marked as "Planned" to project upcoming spending limits without directly deducting from your actual confirmed balances.
- **Automated Row Level Security:** Built on Supabase, every user's profile, custom categories, wallets, and transactions are securely isolated and synced in real time.
- **Premium Themes:** Toggle instantly between striking Dark/Light modes and choose from custom curated color palettes (*Red, Blue, Purple, Galaxy*).
- **Auto-Onboarding Wizard:** First-time login automatically seeds the database with essential expense categories and wallets so you can immediately begin logging records.

## 🚀 Quick Start (Local Development)

### Prerequisites
- [Node.js](https://nodejs.org/en/) (v18+)
- [Supabase Account](https://supabase.com/)

### 1. Database Setup
1. Create a new Supabase project.
2. Navigate to your Supabase SQL Editor and run the provided [`schema.sql`](./schema.sql) file to generate the required tables and security policies.

### 2. Environment Configuration
Navigate to the `web` folder and create a `.env.local` file with your Supabase credentials:

```bash
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 3. Install & Run
```bash
cd web
npm install
npm run dev
```
Open your browser to the local Vite URL to explore BudgyTrack!

## 📂 Project Structure
```text
BudgyTrack/
├── web/                   # Vite + React web client
│   ├── src/
│   │   ├── components/    # Reusable UI components
│   │   ├── context/       # Auth & Theme context providers
│   │   ├── lib/           # Supabase client instantiation
│   │   └── pages/         # Dashboard, Wallets, Settings routing pages
├── mobile/                # Expo React Native App (In Progress)
└── schema.sql             # Full Supabase PostgreSQL schema definition
```

## 🛠️ Tech Stack
- **Frontend Framework:** React (Vite)
- **Styling:** Vanilla CSS Variables + TailwindCSS Utility Classes
- **Icons:** Lucide React
- **Charting:** Recharts
- **Backend as a Service:** Supabase (Auth + PostgreSQL)

---
*Built to make financial tracking beautiful, fast, and secure.*
