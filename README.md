# Car Vault 🚗⚡

Car Vault is a personal car management web application and digital garage, belonging to the **Vault Family** (alongside [Series Vault](https://github.com/leandrowcs/series-vault) and Sports Vault).

Designed for tracking vehicle expenses, fuel consumption, EV charging, maintenance history, reminders, and documents with a clean, dark-first modern interface and local-first architecture.

## Features

- 🏎️ **Garage Management**: Multi-vehicle support (Gasoline, Diesel, Hybrid, Plug-in Hybrid, EV, Other) with trim, VIN, license plate, and odometer tracking.
- ⛽ **Fuel & Charging Logs**: Quick-entry fill-ups and EV charging records with automatic L/100 km, cost/km, and weighted average price calculations.
- 🛠️ **Maintenance History**: Track services, parts vs labor costs, service providers, and mileage intervals.
- 💸 **Expense Tracking**: Categorize insurance, registration, parking, tolls, taxes, detailing, and custom costs.
- ⏰ **Smart Reminders**: Reminders by calendar date, odometer mileage, or both (with Overdue, Due Soon, and Upcoming status badges).
- 📂 **Documents**: Vehicle registration, insurance policies, warranties, and inspection records with expiry tracking.
- 📊 **Statistics & Analytics**: Monthly and yearly spend breakdowns, cost/km insights, and fuel economy trends.
- 🇨🇦 **Canadian Context**: Default CAD currency, kilometers, L/100 km, and CAD/L with customizable settings.
- 🔒 **Local-First & Portable**: Optional Google sign-in and Firebase synchronization, with per-user records and offline caching on trusted devices. Local mode and JSON backups remain available.
- 📱 **PWA Ready**: Works seamlessly on desktop, tablet, and mobile devices.

## Tech Stack

- **Framework**: React 19 + TypeScript
- **Bundler & Tooling**: Vite 6 + Vitest
- **Icons**: Lucide React
- **Branding**: Vault Family Amber (`#F59E0B`)

## Getting Started

For Vercel, use the **repository root** as Root Directory (leave it empty or select `.`),
matching Sports Vault and Series Vault. The root `vercel.json` installs and builds
inside `frontend` and serves `frontend/dist`. See the
[deployment and storage guide](docs/deployment-and-storage.md) for setup,
moving existing local data, and Firebase setup. Configure Google sign-in,
authorized domains, Firestore rules, and the variables from `frontend/.env.example`
before using account sync in production.

```powershell
cd frontend
npm install
npm run dev
```

To run the unit test suite:
```powershell
npm run test:run
```

To build for production:
```powershell
npm run build
```

