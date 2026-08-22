# HealConnect

A professional wellness platform to connect with verified energy healers, Vastu experts, numerologists, and tarot readers instantly.

## Architecture

- **Frontend (`/web`)**: Next.js 14, React, TailwindCSS, shadcn/ui.
- **Backend (`/backend`)**: Node.js, Express, TypeScript, Prisma, PostgreSQL.

## Getting Started (For the Development Team)

**IMPORTANT: Environment Variables (`.env`)**  
For security reasons, `.env` files are ignored in `.gitignore`. To run the project locally, ask the project owner for two files:
1. `backend/.env`: Contains Azure production database URLs, Redis cache URLs, and JWT secrets.
2. `web/.env`: Contains the `NEXT_PUBLIC_GOOGLE_CLIENT_ID`.

Drop these files into their respective folders before starting!

### Local Development Stack (Docker)
This repository is fully containerized for local development using Docker. It spins up the Frontend, Backend, PostgreSQL, and Redis in isolated containers with hot-reloading enabled.

**Prerequisite:** Ensure Docker Desktop is installed and running.

To start the entire stack:
```bash
docker-compose up --build
```
*(Note: Use `--build` the first time or when package dependencies change. For regular starts, just `docker-compose up` is enough).*

**Run Database Migrations (First time only):**
Once the containers are running, you need to push the Prisma schema to the local Postgres database. Open a new terminal and run:
```bash
docker-compose exec backend npx prisma migrate dev
```

**Access Points:**
- **Frontend App**: `http://localhost:3000`
- **Backend API**: `http://localhost:8082`
- **Postgres DB**: `localhost:5432` (User: `postgres`, Pass: `test`)
- **Redis Cache**: `localhost:6379`

---

## Azure Infrastructure & Deployment Details

The backend is fully deployed to **Azure App Service Linux** and integrated with **Azure Managed Redis** and **Azure PostgreSQL Flexible Server**.

### 🚀 CI/CD Pipeline
Every push to the `main` branch automatically triggers the `.github/workflows/backend-ci-cd.yml` pipeline. It builds the Node.js app and deploys it straight to Azure App Service. **Azure can take up to 3-5 minutes to restart the container after deployment.**

### 🗄️ Database Migrations (VNet Bypass)
For security, the Azure PostgreSQL database is strictly locked down behind a Virtual Network (VNet) and cannot be accessed externally. 
To run Prisma schema migrations against the live database:
1. Make changes to `schema.prisma`.
2. Generate a raw SQL migration file.
3. Commit and push it.
4. Once deployed, hit the bypass endpoint: `https://healconnect-backend-dqcsaqf4a6baffaz.centralindia-01.azurewebsites.net/api/migrate`
This endpoint instantly reads the raw SQL and executes it natively within the VNet.

### ⚡ Redis & Rate Limiting
The backend uses **Azure Managed Redis (Enterprise)**. We explicitly use the standard `ioredis` client with TLS enabled `new Redis()` rather than `Redis.Cluster()`, as Azure proxy masks the cluster topology. This perfectly handles rate-limiting and JWT blacklisting.

### 🔐 Google OAuth Configuration
If testing Google Auth locally, ensure that `http://localhost:3000/auth/google/callback` is added to the **Authorized redirect URIs** in the Google Cloud Console for the specific Client ID.

---

## Features
- Premium, mobile-responsive landing page optimized for conversions.
- Beautiful Light and Dark modes with smooth transitions.
- Authentication screens (Login/Signup) ready for integration.
- PostgreSQL database schema for Practitioners, Users, Wallets, and Sessions.
