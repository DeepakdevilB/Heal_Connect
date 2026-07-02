# HealConnect

A professional wellness platform to connect with verified energy healers, Vastu experts, numerologists, and tarot readers instantly.

## Architecture

- **Frontend (`/web`)**: Next.js 14, React, TailwindCSS, shadcn/ui.
- **Backend (`/backend`)**: Node.js, Express, TypeScript, Prisma, PostgreSQL.

## Getting Started

### 1. Backend Setup
Make sure you have PostgreSQL running and update the `.env` file in `/backend` with your `DATABASE_URL`.
```bash
cd backend
npm install
npx prisma generate
npx prisma db push
npm run dev
```

### 2. Frontend Setup
```bash
cd web
npm install
npm run dev
```
The application will be available at `http://localhost:3000`.

## Features
- Premium, mobile-responsive landing page optimized for conversions.
- Beautiful Light and Dark modes with smooth transitions.
- Authentication screens (Login/Signup) ready for integration.
- PostgreSQL database schema for Practitioners, Users, Wallets, and Sessions.
