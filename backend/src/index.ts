import * as dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { generalLimiter } from './middleware/rateLimiter';
import authRouter from './routes/auth';
import usersRouter from './routes/users';
import practitionersRouter from './routes/practitioners';
import walletRouter from './routes/wallet';
import { startBillingEngine } from './workers/billingEngine';

const app = express();

// Trust the Azure App Service reverse proxy to parse X-Forwarded-For correctly
// This strips the port number from the IP address, fixing express-rate-limit
app.set('trust proxy', 1);
const port = process.env.PORT || 8080;

// ─── Security Middleware ──────────────────────────────────────────────────────

app.set('trust proxy', 1); // Trust first proxy (ngrok / nginx)

// Helmet — sets secure HTTP headers
app.use(helmet({
  crossOriginEmbedderPolicy: false, // Allow ngrok previews
  contentSecurityPolicy: false,     // Adjust if serving HTML from this server
}));

app.use(cors({
  origin: [
    process.env.FRONTEND_URL || 'http://localhost:3000',
    'http://localhost:3000',
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.use(express.json({
  limit: '10kb',
  verify: (req, _res, buf) => {
    // Keep raw body for Stripe webhook signature verification
    (req as any).rawBody = buf;
  }
}));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// ─── Health Check (Before Rate Limiter) ───────────────────────────────────────
app.get('/', (_req, res) => res.send('HealConnect API is running'));
app.disable('x-powered-by'); // Belt-and-suspenders (helmet already removes this)

// ─── Routes ───────────────────────────────────────────────────────────────────

app.get('/health', (_req, res) => {
  res.json({ status: 'healthy', service: 'healconnect-api' });
});

import fs from 'fs';
import path from 'path';
import { Client } from 'pg';

import { exec } from 'child_process';
import util from 'util';
const execPromise = util.promisify(exec);

app.get('/api/run-prisma-migrate', async (_req, res) => {
  // Trigger build to apply Prisma migration fixes
  res.setHeader('Content-Type', 'text/plain');
  res.write('Starting prisma db push...\n');
  
  try {
    const { stdout, stderr } = await execPromise('npx prisma db push --accept-data-loss');
    res.write('--- STDOUT ---\n');
    res.write(stdout);
    res.write('\n--- STDERR ---\n');
    res.write(stderr);
    res.write('\nMigration completely finished!\n');
    res.end();
  } catch (error) {
    res.write('\nFATAL ERROR: ' + String(error) + '\n');
    res.end();
  }
});

app.get('/api/run-seed', async (_req, res) => {
  res.setHeader('Content-Type', 'text/plain');
  res.write('Starting db seed directly...\n');
  try {
    const { prisma } = require('./lib/prisma');
    
    res.write('Seeding Dr. Sarah Jenkins...\n');
    await prisma.practitioner.create({
      data: {
        name: 'Dr. Sarah Jenkins',
        email: 'sarah@healconnect.com',
        bio: 'A compassionate healer with 10 years of experience in cognitive behavioral therapy and mindfulness.',
        specialties: ['Anxiety', 'Depression', 'Mindfulness'],
        certifications: ['Licensed Clinical Social Worker (LCSW)', 'CBT Certified'],
        languages: ['English', 'Spanish'],
        experienceYrs: 10,
        perMinuteRate: 50,
        isVerified: true,
        isOnline: true,
        photoUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Sarah'
      }
    });

    res.write('Seeding Yogi Ananda...\n');
    await prisma.practitioner.create({
      data: {
        name: 'Yogi Ananda',
        email: 'ananda@healconnect.com',
        bio: 'Spiritual guide and meditation expert focused on holistic well-being and inner peace.',
        specialties: ['Meditation', 'Spiritual Guidance', 'Stress Relief'],
        certifications: ['Certified Yoga Instructor', 'Vipassana Master'],
        languages: ['English', 'Hindi', 'Sanskrit'],
        experienceYrs: 15,
        perMinuteRate: 35,
        isVerified: true,
        isOnline: false,
        photoUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Ananda'
      }
    });

    res.write('Seeding Dr. Michael Chen...\n');
    await prisma.practitioner.create({
      data: {
        name: 'Dr. Michael Chen',
        email: 'michael@healconnect.com',
        bio: 'Clinical psychologist specializing in relationship counseling and career-related stress.',
        specialties: ['Relationships', 'Career Stress', 'Life Transitions'],
        certifications: ['Psy.D in Clinical Psychology'],
        languages: ['English', 'Mandarin'],
        experienceYrs: 8,
        perMinuteRate: 60,
        isVerified: true,
        isOnline: true,
        photoUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Michael'
      }
    });

    res.write('\nSeed completely finished!\n');
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
app.use('/api/wallet', walletRouter);

// ─── 404 ─────────────────────────────────────────────────────────────────────

app.use((_req, res) => {
  res.status(404).json({ success: false, message: 'Route not found' });
});

// ─── Global Error Handler ─────────────────────────────────────────────────────

app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ success: false, message: 'Internal server error: ' + (err?.message || String(err)), stack: err?.stack });
});

// ─── Start ────────────────────────────────────────────────────────────────────

app.listen(port, () => {
  console.log(`✦ HealConnect API running on port ${port}`);
  
  // Start the background workers
  startBillingEngine();
});
