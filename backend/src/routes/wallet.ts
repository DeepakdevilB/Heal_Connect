import { Router, type Request, type Response } from 'express';
import { body } from 'express-validator';
import Razorpay from 'razorpay';
import Stripe from 'stripe';
import crypto from 'crypto';
import { prisma } from '../lib/prisma';
import { requireAuth, type AuthRequest } from '../middleware/auth';
import { handleValidation } from '../middleware/validate';

const router = Router();

// Initialize Razorpay
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID || 'dummy_key',
  key_secret: process.env.RAZORPAY_KEY_SECRET || 'dummy_secret',
});

// Initialize Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'dummy_stripe_secret');

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

// ─── Initialize Recharge (Create Stripe Checkout Session) ─────────────────

router.post(
  '/recharge/stripe',
  requireAuth,
  [body('amount').isNumeric().custom((val) => val >= 10).withMessage('Amount must be at least ₹10 (equivalent)')],
  handleValidation,
  async (req: AuthRequest, res: Response) => {
    const { amount } = req.body as { amount: number };

    try {
      const wallet = await prisma.wallet.findUnique({ where: { userId: req.user!.userId } });
      if (!wallet) {
        res.status(404).json({ success: false, message: 'Wallet not found' });
        return;
      }

      // Convert INR amount to USD (assuming 1 USD = 83 INR for simplicity)
      // Stripe expects amount in cents
      const exchangeRate = 83;
      const usdAmount = amount / exchangeRate;
      const amountInCents = Math.round(usdAmount * 100);

      // Create a PENDING transaction in DB
      const transaction = await prisma.transaction.create({
        data: {
          walletId: wallet.id,
          amount,
          type: 'RECHARGE',
          status: 'PENDING',
          // we'll update referenceId when session is created
        },
      });

      const frontendUrl = process.env.APP_URL || (process.env.NODE_ENV === 'production' ? 'https://blue-plant-0d21bc900.7.azurestaticapps.net' : 'http://localhost:3000');

      const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: [
          {
            price_data: {
              currency: 'usd',
              product_data: {
                name: 'HealConnect Wallet Recharge',
                description: `Recharge wallet with ₹${amount}`,
              },
              unit_amount: amountInCents,
            },
            quantity: 1,
          },
        ],
        mode: 'payment',
        success_url: `${frontendUrl}/dashboard/wallet?recharge=success`,
        cancel_url: `${frontendUrl}/dashboard/wallet?recharge=cancel`,
        client_reference_id: transaction.id,
      });

      // Update the transaction with the Stripe Session ID
      await prisma.transaction.update({
        where: { id: transaction.id },
        data: { referenceId: session.id },
      });

      res.json({
        success: true,
        data: {
          url: session.url,
          sessionId: session.id,
        },
      });
    } catch (err) {
      console.error('Stripe recharge init error:', err);
      res.status(500).json({ success: false, message: 'Failed to initialize Stripe recharge' });
    }
  }
);

// ─── Stripe Webhook (Payment Captured) ────────────────────────────────────────

router.post('/stripe-webhook', async (req: Request, res: Response) => {
  const sig = req.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || 'dummy_webhook_secret';
  
  // Notice we use req.rawBody which we set in index.ts
  const rawBody = (req as any).rawBody;

  let event;

  try {
    if (!sig || !rawBody) throw new Error('Missing stripe signature or raw body');
    event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret);
  } catch (err: any) {
    console.error('Stripe Webhook Error:', err.message);
    res.status(400).send(`Webhook Error: ${err.message}`);
    return;
  }

  // Handle the event
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session;
    const transactionId = session.client_reference_id;

    if (transactionId) {
      try {
        await prisma.$transaction(async (tx) => {
          const transaction = await tx.transaction.findUnique({
            where: { id: transactionId },
          });

          if (!transaction || transaction.status === 'SUCCESS') return;

          // Mark transaction as SUCCESS
          await tx.transaction.update({
            where: { id: transactionId },
            data: { status: 'SUCCESS' },
          });

          // Add amount to wallet
          await tx.wallet.update({
            where: { id: transaction.walletId },
            data: { balance: { increment: transaction.amount } },
          });
        });
        console.log(`Stripe recharge successful for transaction: ${transactionId}`);
      } catch (dbErr) {
        console.error('Failed to process Stripe transaction in DB:', dbErr);
      }
    }
  }

  // Return a 200 response to acknowledge receipt of the event
  res.json({ received: true });
});

export default router;
