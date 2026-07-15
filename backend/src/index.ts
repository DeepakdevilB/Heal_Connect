import * as dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import { generalLimiter } from './middleware/rateLimiter';
import authRouter from './routes/auth';
import usersRouter from './routes/users';
import practitionersRouter from './routes/practitioners';

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
  res.setHeader('Content-Type', 'text/plain');
  res.write('Starting migration process...\n');
  
  try {
    const sqlPath = path.join(__dirname, '../prisma/migrations/20260703111447_init/migration.sql');
    res.write('SQL Path resolved to: ' + sqlPath + '\n');
    
    if (!fs.existsSync(sqlPath)) {
      res.write('ERROR: SQL file not found at this path!\n');
      return res.end();
    }
    
    const sql = fs.readFileSync(sqlPath, 'utf8');
    res.write(`Read SQL file successfully. Size: ${sql.length} bytes.\n`);
    
    res.write('Initializing pg Client...\n');
    res.write(`DATABASE_URL exists? ${!!process.env.DATABASE_URL}\n`);
    
    const client = new Client({
      connectionString: process.env.DATABASE_URL,
      // Do not explicitly pass ssl to exactly match how Prisma's Pool connects
    });
    
    res.write('Attempting to connect to database...\n');
    
    const connectPromise = client.connect();
    const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('Connection timed out after 15 seconds!')), 15000));
    
    await Promise.race([connectPromise, timeoutPromise]);
    res.write('Successfully connected to database!\n');
    
    res.write('Executing SQL queries...\n');
    await client.query(sql);
    res.write('SQL queries executed successfully!\n');
    
    await client.end();
    res.write('Database connection closed.\n');
    res.write('Migration completely finished!\n');
    res.end();
  } catch (error) {
    res.write('\nFATAL ERROR: ' + String(error) + '\n');
    res.end();
  }
});

// Apply general rate limiter to all routes
app.use(generalLimiter);

app.use('/api/auth', authRouter);
app.use('/api/users', usersRouter);
app.use('/api/practitioners', practitionersRouter);

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
