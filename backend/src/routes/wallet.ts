import { Router, type Request, type Response } from 'express';
import { body } from 'express-validator';
import Razorpay from 'razorpay';
import crypto from 'crypto';
import { prisma } from '../lib/prisma';
import { requireAuth, type AuthRequest } from '../middleware/auth';
import { handleValidation } from '../middleware/validate';

const router = Router();

// Initialize Razorpay
// Note: We use optional chaining and fallback to avoid crashing if env vars are missing
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID || 'dummy_key',
  key_secret: process.env.RAZORPAY_KEY_SECRET || 'dummy_secret',
});

// ─── Get Wallet Balance & Transactions ────────────────────────────────────────

router.get('/', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const wallet = await prisma.wallet.findUnique({
      where: { userId: req.user!.userId },
      include: {
        transactions: {
          orderBy: { createdAt: 'desc' },
          take: 20, // Return last 20 transactions
        },
      },
    });

    if (!wallet) {
      res.status(404).json({ success: false, message: 'Wallet not found' });
      return;
    }

    res.json({ success: true, data: { wallet } });
  } catch (err) {
    console.error('Fetch wallet error:', err);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// ─── Initialize Recharge (Create Razorpay Order) ──────────────────────────────

router.post(
  '/recharge',
  requireAuth,
  [body('amount').isNumeric().custom((val) => val >= 10).withMessage('Amount must be at least ₹10')],
  handleValidation,
  async (req: AuthRequest, res: Response) => {
    const { amount } = req.body as { amount: number };

    try {
      const wallet = await prisma.wallet.findUnique({ where: { userId: req.user!.userId } });
      if (!wallet) {
        res.status(404).json({ success: false, message: 'Wallet not found' });
        return;
      }

      // Create Razorpay Order
      // Razorpay expects amount in paise (multiply by 100)
      const options = {
        amount: amount * 100,
        currency: 'INR',
        receipt: `receipt_recharge_${wallet.id}_${Date.now()}`,
        notes: {
          walletId: wallet.id,
          userId: req.user!.userId,
        },
      };

      const order = await razorpay.orders.create(options);

      // We create a PENDING transaction in our DB
      const transaction = await prisma.transaction.create({
        data: {
          walletId: wallet.id,
          amount,
          type: 'RECHARGE',
          status: 'PENDING',
          referenceId: order.id,
        },
      });

      res.json({
        success: true,
        data: {
          orderId: order.id,
          amount: order.amount,
          currency: order.currency,
          transactionId: transaction.id,
        },
      });
    } catch (err) {
      console.error('Recharge init error:', err);
      res.status(500).json({ success: false, message: 'Failed to initialize recharge' });
    }
  }
);

// ─── Razorpay Webhook (Payment Captured) ──────────────────────────────────────

router.post('/webhook', async (req: Request, res: Response) => {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET || 'dummy_webhook_secret';
  
  // Verify Webhook Signature
  const signature = req.headers['x-razorpay-signature'] as string;
  if (!signature) {
    res.status(400).send('Invalid signature');
    return;
  }

  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(JSON.stringify(req.body))
    .digest('hex');

  if (expectedSignature !== signature) {
    res.status(400).send('Invalid signature');
    return;
  }

  try {
    const event = req.body;

    if (event.event === 'payment.captured') {
      const payment = event.payload.payment.entity;
      const orderId = payment.order_id; // e.g., order_Jg1...
      
      // Look up the pending transaction by orderId
      const transaction = await prisma.transaction.findFirst({
        where: { referenceId: orderId, status: 'PENDING', type: 'RECHARGE' },
      });

      if (transaction) {
        // Perform an atomic update: mark transaction SUCCESS and add to balance
        await prisma.$transaction([
          prisma.transaction.update({
            where: { id: transaction.id },
            data: { status: 'SUCCESS' },
          }),
          prisma.wallet.update({
            where: { id: transaction.walletId },
            data: { balance: { increment: transaction.amount } },
          }),
        ]);
        console.log(`Successfully recharged wallet ${transaction.walletId} by ₹${transaction.amount}`);
      }
    }

    res.status(200).send('Webhook processed');
  } catch (err) {
    console.error('Webhook processing error:', err);
    res.status(500).send('Webhook error');
  }
});

export default router;
