import { Router, type Response } from 'express';
import { body } from 'express-validator';
import { prisma } from '../lib/prisma';
import { requireAuth, type AuthRequest } from '../middleware/auth';
import { handleValidation } from '../middleware/validate';

const router = Router();

// GET /api/wallet/balance
router.get('/balance', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;

    let wallet = await prisma.wallet.findUnique({
      where: { userId },
      include: {
        transactions: {
          orderBy: { createdAt: 'desc' },
          take: 20,
        },
      },
    });

    if (!wallet) {
      wallet = await prisma.wallet.create({
        data: {
          userId,
          balance: 5000, // Initial promo balance for testing/new users
          currency: 'INR',
        },
        include: {
          transactions: true,
        },
      });
    }

    res.json({
      success: true,
      data: {
        balance: wallet.balance,
        currency: wallet.currency,
        transactions: wallet.transactions,
      },
    });
  } catch (err) {
    console.error('Error fetching wallet balance:', err);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// POST /api/wallet/recharge
router.post(
  '/recharge',
  requireAuth,
  [body('amount').isFloat({ min: 1, max: 100000 }).withMessage('Amount must be between 1 and 100,000')],
  handleValidation,
  async (req: AuthRequest, res: Response) => {
    try {
      const userId = req.user!.userId;
      const { amount } = req.body as { amount: number };

      let wallet = await prisma.wallet.findUnique({ where: { userId } });
      if (!wallet) {
        wallet = await prisma.wallet.create({
          data: { userId, balance: 0, currency: 'INR' },
        });
      }

      const updatedWallet = await prisma.$transaction(async (tx) => {
        const w = await tx.wallet.update({
          where: { id: wallet.id },
          data: { balance: { increment: amount } },
        });

        await tx.transaction.create({
          data: {
            walletId: wallet.id,
            amount,
            type: 'RECHARGE',
            status: 'SUCCESS',
            referenceId: `REC_${Date.now()}`,
          },
        });

        return w;
      });

      res.json({
        success: true,
        message: `Successfully recharged ₹${amount}`,
        data: {
          balance: updatedWallet.balance,
          currency: updatedWallet.currency,
        },
      });
    } catch (err) {
      console.error('Error recharging wallet:', err);
      res.status(500).json({ success: false, message: 'Failed to recharge wallet' });
    }
  }
);

export default router;
