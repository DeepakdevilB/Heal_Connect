import * as dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import { initSocketServer } from './lib/socket';
import cors from 'cors';
import path from 'path';
import helmet from 'helmet';
import { generalLimiter } from './middleware/rateLimiter';
import authRouter from './routes/auth';
import astrologerAuthRouter from './routes/astrologerAuth';
import astrologersRouter from './routes/astrologers';
import adminAstrologersRouter from './routes/adminAstrologers';
import usersRouter from './routes/users';
import practitionersRouter from './routes/practitioners';
import walletRouter from './routes/wallet';
import chatRouter from './routes/chat';
import agoraRouter from './routes/agora';
import adminRouter from './routes/admin';
import migrateRouter from './routes/migrate';
import sessionsRouter from './routes/sessions';
import adminAuthRouter from './routes/adminAuth';
import contactRouter from './routes/contact';
import ticketsRouter from './routes/tickets';
import consentRouter from './routes/consent';
import deepgramRouter from './routes/deepgram';
import notificationRoutes from './routes/notifications';
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

import { exec } from 'child_process';
import util from 'util';
const execPromise = util.promisify(exec);

import { prisma } from './lib/prisma';

app.get('/api/run-prisma-migrate', async (_req, res) => {
  res.setHeader('Content-Type', 'text/plain');
  res.write('Starting prisma db push...\n');
  try {
    res.write('Cleaning up orphaned Consent records to prevent foreign key errors...\n');
    await prisma.$executeRawUnsafe(`UPDATE "Consent" SET "userId" = NULL WHERE "userId" IS NOT NULL AND "userId" NOT IN (SELECT id FROM "User")`);
    await prisma.$executeRawUnsafe(`UPDATE "Consent" SET "practitionerId" = NULL WHERE "practitionerId" IS NOT NULL AND "practitionerId" NOT IN (SELECT id FROM "Practitioner")`);

    const { stdout, stderr } = await execPromise('npx prisma db push --accept-data-loss');
    res.write('--- STDOUT ---\n');
      res.write(stdout);
      res.write('\n--- STDERR ---\n');
      res.write(stderr);

      // Seed the admin user since npx prisma db push doesn't do it automatically
      res.write('\nSeeding admin user...\n');
      const adminCount = await prisma.$queryRaw<[{ count: bigint }]>`
        SELECT COUNT(*)::bigint as count FROM "AdminUser"
      `;
      const count = Number(adminCount[0]?.count ?? 0);
      
      // We will hardcode the fallback if env vars are missing so the user isn't locked out
      const bootstrapEmail = process.env['ADMIN_LOGIN_EMAIL'] || 'admin@healconnect.com';
      const bootstrapPassword = process.env['ADMIN_LOGIN_PASSWORD'] || 'HealAdmin@2026';

      if (count === 0) {
        const bcrypt = require('bcryptjs');
        const { randomUUID } = require('crypto');
        const passwordHash = await bcrypt.hash(bootstrapPassword, 12);
        const now = new Date().toISOString();
        await prisma.$executeRawUnsafe(
          `INSERT INTO "AdminUser" ("id","email","passwordHash","role","mfaEnabled","createdAt","updatedAt")
           VALUES ($1, $2, $3, 'SUPERADMIN', false, $4, $4)
           ON CONFLICT ("email") DO NOTHING`,
          randomUUID(),
          bootstrapEmail,
          passwordHash,
          now
        );
        res.write('Admin user seeded successfully with email: ' + bootstrapEmail + '\n');
      } else {
        res.write('Admin user already exists, skipping seed.\n');
      }

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
app.use('/api/auth/astrologer', astrologerAuthRouter);
app.use('/api/astrologers', astrologersRouter);
app.use('/api/admin/astrologers', adminAstrologersRouter);
app.use('/api/users', usersRouter);
app.use('/api/practitioners', practitionersRouter);
app.use('/api/wallet', walletRouter);
app.use('/api/chat', chatRouter);
app.use('/api/agora', agoraRouter);
app.use('/api/sessions', sessionsRouter);
app.use('/api/admin', adminRouter);
app.use('/api/admin-auth', adminAuthRouter);
app.use('/api/contact', contactRouter);
app.use('/api/tickets', ticketsRouter);
app.use('/api/consent', consentRouter);
app.use('/api/deepgram', deepgramRouter);
app.use('/api/notifications', notificationRoutes);

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
