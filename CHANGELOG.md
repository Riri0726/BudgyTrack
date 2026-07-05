# Changelog

All notable changes to the BudgyTrack project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Geofencing and background tracking task logic initialized for the React Native Mobile App.

## [1.1.0] - Unified Wallets Refactor

### Added
- **Dynamic Profile Check**: Automatically generates Supabase `public.profiles` rows if delayed email confirmations block wallet creation foreign keys.
- **Auto-Onboarding Wizard**: Injects starter categories (Food, Rent, Salary, Investments) and default wallets (Cash Pocket, Bank Wallet) upon a new user's first login.
- **Restore Wallet UI**: Brought back the ability to Create and Delete accounts/wallets directly from the `Wallets.jsx` interface.

### Changed
- **Unified Wallets**: Completely removed the dual "Account + Budget Pocket" layer. Your physical Accounts are now your unified Wallets, and their available budget is strictly dynamically determined by their specific `Income - Expenses`.
- **Philippine Peso Localization**: Updated all currency formatting globally across dashboard summaries, transaction forms, Recharts tooltips, and progress bars to display the `₱` Philippine Peso symbol.
- **Solid Aesthetic Upgrade**: Refactored `index.css` to strip out all blurry gradient logic, swapping out `.glass` components for sleek, flat, solid-color blocks utilizing the dynamic theme palette (Red, Blue, Purple, Galaxy).

### Removed
- **`budget_wallets` Table**: Dropped the dedicated pockets database schema to streamline transactions. Removed Pocket filters and allocation progress limits from the UI.

## [1.0.0] - Initial Release Setup

### Added
- **Supabase Authentication**: Integrated secure email/password auth using Supabase sessions in `AuthContext.jsx`.
- **Database Schema**: Established tables for `profiles`, `categories`, `accounts`, `transactions`, and `budgets` in PostgreSQL (`schema.sql`).
- **Row-Level Security (RLS)**: Enforced strict privacy rules per-table, ensuring users can only read, write, and modify their own rows.
- **Vite React Frontend**: Bootstrapped initial dashboard routing system (`Dashboard`, `Transactions`, `Expenses`, `Income`, `Settings`).
- **Dashboard UI**: Set up Recharts data visualization graphs and mock metric cards.
