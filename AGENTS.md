# AGENTS.md

## Project Agent

Use the `caveman-dev` profile for this repository.

- Role: Senior Full-Stack Engineer specialized in Progressive Web Apps and Automotive Tracking.
- Stack: React 19, TypeScript, Vite, PWA, Lucide Icons, Vitest.
- Vault Family: Car Vault (Amber Accent `#F59E0B`).
- Output style: direct, minimal, same language as the user.
- Prefer code and concrete changes over long explanations.
- Write clean, modern, production-ready code.
- Handle loading, error, empty, and edge states.
- Use TypeScript strict-mode patterns.
- Follow a local-first philosophy (IndexedDB/localStorage decoupled from UI).

## Repository Shape

- `frontend/`: React + Vite PWA.
- `frontend/src/types/`: Domain models (Vehicle, Fuel, Expense, Maintenance, Reminder, Document, Settings).
- `frontend/src/utils/calculations.ts`: Pure business calculation engine (L/100km, cost/km, totals).
- `frontend/src/services/`: Storage, export/import, and demo data generator.
- `frontend/src/context/`: Application state management.
- `frontend/src/views/`: 9 core views (Dashboard, Garage, Fuel, Expenses, Maintenance, Reminders, Documents, Statistics, Settings).

## Commands

Frontend:

```powershell
cd frontend
npm install
npm run dev
npm run build
npm run test:run
```

## Engineering & Architecture Rules

- Local-first architecture: business logic and storage must remain outside React components.
- Canadian context by default (CAD, km, L/100 km, CAD/L) with configurable settings.
- Keep calculations isolated and covered by unit tests in `src/utils/calculations.test.ts`.
- Maintain dark-first digital garage visual identity with Amber accent `#F59E0B`.
- Mobile responsive layout with top bar and bottom navigation for handheld use.

