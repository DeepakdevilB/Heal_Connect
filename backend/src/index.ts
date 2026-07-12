import * as dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import { generalLimiter } from './middleware/rateLimiter';
import authRouter from './routes/auth';

const app = express();

// Trust the Azure App Service reverse proxy to parse X-Forwarded-For correctly
// This strips the port number from the IP address, fixing express-rate-limit
app.set('trust proxy', 1);

const port = process.env.PORT || 8080;

// ─── Security Middleware ──────────────────────────────────────────────────────

app.set('trust proxy', 1); // Trust first proxy (ngrok/nginx)

app.use(cors({
  origin: [
    process.env.FRONTEND_URL || 'http://localhost:3000',
    'http://localhost:3000',
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.use(express.json({ limit: '10kb' })); // Limit payload size
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// ─── Health Check (Before Rate Limiter) ───────────────────────────────────────
app.get('/', (_req, res) => res.send('HealConnect API is running'));
app.get('/health', (_req, res) => {
  res.json({ status: 'healthy', service: 'healconnect-api' });
});

import fs from 'fs';
import path from 'path';
import { Client } from 'pg';

app.get('/api/migrate', async (_req, res) => {
  try {
    const sqlPath = path.join(__dirname, '../prisma/migrations/20260703111447_init/migration.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    
    const client = new Client({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false }
    });
    
    await client.connect();
    await client.query(sql);
    await client.end();
    
    res.json({ success: true, message: 'Raw SQL migration executed successfully!' });
  } catch (error) {
    res.status(500).json({ success: false, error: String(error) });
  }
});

// Apply general rate limiter to all routes
app.use(generalLimiter);

app.use('/api/auth', authRouter);

// ─── 404 Handler ─────────────────────────────────────────────────────────────

app.use((_req, res) => {
  res.status(404).json({ success: false, message: 'Route not found' });
});

// ─── Global Error Handler ─────────────────────────────────────────────────────

app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ success: false, message: 'Internal server error' });
});

// ─── Start Server ─────────────────────────────────────────────────────────────

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
