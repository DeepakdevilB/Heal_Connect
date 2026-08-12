import * as dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import { initSocketServer } from './lib/socket';
import cors from 'cors';
import path from 'path';
import helmet from 'helmet';
import { generalLimiter } from './middleware/rateLimiter';
import authRouter from './routes/auth';
import usersRouter from './routes/users';
import practitionersRouter from './routes/practitioners';
import walletRouter from './routes/wallet';
import chatRouter from './routes/chat';
import agoraRouter from './routes/agora';
import reviewsRouter from './routes/reviews';
import migrateRouter from './routes/migrate';
import adminRouter from './routes/admin';
import contactRouter from './routes/contact';
import ticketsRouter from './routes/tickets';
import consentRouter from './routes/consent';
import sessionsRouter from './routes/sessions';
import astrologerAuthRouter from './routes/astrologerAuth';
import astrologersRouter from './routes/astrologers';
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

// Apply general rate limiter to all routes
app.use(generalLimiter);

app.use('/api/auth', authRouter);
app.use('/api/users', usersRouter);
app.use('/api/practitioners', practitionersRouter);
app.use('/api/wallet', walletRouter);
app.use('/api/chat', chatRouter);
app.use('/api/agora', agoraRouter);
app.use('/api/sessions', sessionsRouter);
app.use('/api', reviewsRouter); // /api/sessions/:id/review and /api/moderation/*
app.use('/api/migrate', migrateRouter);
app.use('/api/admin', adminRouter);
app.use('/api/contact', contactRouter);
app.use('/api/tickets', ticketsRouter);
app.use('/api/consent', consentRouter);
app.use('/api/auth/astrologer', astrologerAuthRouter);
app.use('/api/astrologers', astrologersRouter);

// Serve local uploads when Azure Storage is not configured
if (!process.env.AZURE_STORAGE_CONNECTION_STRING) {
  app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));
}

// ─── Public Content Endpoints ────────────────────────────────────────────────
app.get('/api/blogs', async (req, res) => {
  try {
    const { prisma } = require('./lib/prisma');
    const blogs = await prisma.blog.findMany({
      where: { published: true },
      orderBy: { createdAt: 'desc' }
    });
    res.json({ success: true, data: { blogs } });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

app.get('/api/blogs/:id', async (req, res) => {
  try {
    const { id } = req.params as { id: string };
    const { prisma } = require('./lib/prisma');
    const blog = await prisma.blog.findUnique({
      where: { id }
    });
    if (!blog || !blog.published) {
      res.status(404).json({ success: false, message: 'Blog not found' });
      return;
    }
    res.json({ success: true, data: { blog } });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

app.get('/api/faqs', async (req, res) => {
  try {
    const { prisma } = require('./lib/prisma');
    const faqs = await prisma.faq.findMany({ orderBy: { createdAt: 'asc' } });
    res.json({ success: true, data: { faqs } });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

app.get('/api/banners', async (req, res) => {
  try {
    const { prisma } = require('./lib/prisma');
    const banners = await prisma.banner.findMany({
      where: { isActive: true },
      orderBy: { createdAt: 'desc' }
    });
    res.json({ success: true, data: { banners } });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

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

import { createServer } from 'http';
const httpServer = createServer(app);
initSocketServer(httpServer);
httpServer.listen(port, () => {
  console.log(`✦ HealConnect API running on port ${port}`);
  startBillingEngine();
});
