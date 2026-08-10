import { Router, type Request, type Response } from 'express';
import { prisma } from '../lib/prisma';
import { verifyAccessToken } from '../lib/jwt';

const router = Router();

const CONSENT_CATEGORIES = ['ANALYTICS', 'MARKETING'] as const;
type ConsentCategory = (typeof CONSENT_CATEGORIES)[number];

interface Identity {
  userId?: string;
  practitionerId?: string;
  visitorId?: string;
}

/**
 * Consent is opt-in and works both for anonymous site visitors (banner shown
 * before login, keyed by a random `visitorId` the frontend generates and stores
 * in a first-party cookie/localStorage) and logged-in accounts (keyed by the JWT).
 * Unlike requireAuth, a missing/invalid token here just means "anonymous" — it
 * does not fail the request, since the whole point is to capture consent from
 * visitors who haven't signed up yet.
 */
function resolveIdentity(req: Request): Identity | null {
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    if (token) {
      try {
        const payload = verifyAccessToken(token);
        if (payload.practitionerId) {
          return { practitionerId: payload.practitionerId };
        }
        return { userId: payload.userId };
      } catch {
        // fall through to visitorId below — an expired/invalid token shouldn't
        // block consent capture, it just means we treat the caller as anonymous
      }
    }
  }

  const visitorId =
    typeof req.body?.visitorId === 'string'
      ? req.body.visitorId
      : typeof req.query['visitorId'] === 'string'
        ? (req.query['visitorId'] as string)
        : undefined;

  if (visitorId) return { visitorId };
  return null;
}

// POST /api/consent — record a consent decision (append-only; never updates a
// prior row, so the history always shows exactly what the person agreed to and
// when, per the "immutable consent audit log" requirement).
router.post('/', async (req: Request, res: Response) => {
  const { category, granted } = req.body as { category?: string; granted?: boolean };

  if (!category || !CONSENT_CATEGORIES.includes(category as ConsentCategory)) {
    res.status(400).json({ success: false, message: `category must be one of: ${CONSENT_CATEGORIES.join(', ')}` });
    return;
  }
  if (typeof granted !== 'boolean') {
    res.status(400).json({ success: false, message: '"granted" must be a boolean' });
    return;
  }

  const identity = resolveIdentity(req);
  if (!identity) {
    res.status(400).json({ success: false, message: 'visitorId is required for anonymous consent' });
    return;
  }

  try {
    const consent = await prisma.consent.create({
      data: {
        userId: identity.userId ?? null,
        practitionerId: identity.practitionerId ?? null,
        visitorId: identity.visitorId ?? null,
        category,
        granted,
        source: 'BANNER',
        ipAddress: req.ip ?? null,
        userAgent: req.headers['user-agent'] ?? null,
      },
    });

    res.status(201).json({ success: true, data: { consent } });
  } catch (err) {
    console.error('Consent record error:', err);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// GET /api/consent — current consent state (most recent decision per category).
// Returns {} (no keys) for a brand-new visitor/account so the frontend knows to
// show the banner; once a decision exists for a category it's always returned,
// even if "granted" is false, so a rejection is remembered and not re-prompted.
router.get('/', async (req: Request, res: Response) => {
  const identity = resolveIdentity(req);
  if (!identity) {
    res.json({ success: true, data: { consent: {} } });
    return;
  }

  try {
    const where = identity.userId
      ? { userId: identity.userId }
      : identity.practitionerId
        ? { practitionerId: identity.practitionerId }
        : { visitorId: identity.visitorId! };

    const rows = await prisma.consent.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    const state: Record<string, { granted: boolean; updatedAt: Date }> = {};
    for (const row of rows) {
      if (!(row.category in state)) {
        state[row.category] = { granted: row.granted, updatedAt: row.createdAt };
      }
    }

    res.json({ success: true, data: { consent: state } });
  } catch (err) {
    console.error('Consent fetch error:', err);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

export default router;
