'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Wallet, Loader2 } from 'lucide-react';
import { walletApi, tokenStore } from '@/lib/api';
import { loadRazorpay } from '@/lib/razorpay';

interface RechargeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const PRESET_AMOUNTS = [99, 199, 499, 999];

// Razorpay's client-side `handler` fires the instant the payment is
// submitted — actual wallet credit happens later, asynchronously, when the
// webhook lands (see backend/src/routes/wallet.ts POST /webhook). Calling
// onSuccess() immediately was optimistic: the modal would close saying
// "success" while the balance the user sees afterward could still be stale
// for several seconds. Poll briefly for the real update instead of guessing.
const BALANCE_POLL_INTERVAL_MS = 1500;
const BALANCE_POLL_MAX_ATTEMPTS = 10; // ~15s total

export function RechargeModal({ isOpen, onClose, onSuccess }: RechargeModalProps) {
  const [amount, setAmount] = useState<number | ''>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'razorpay' | 'stripe'>('razorpay');
  const [confirming, setConfirming] = useState(false);

  /** Poll the wallet until its balance rises above `baseline`, or give up after a while. */
  const waitForCredit = async (token: string, baseline: number) => {
    setConfirming(true);
    try {
      for (let attempt = 0; attempt < BALANCE_POLL_MAX_ATTEMPTS; attempt++) {
        await new Promise((r) => setTimeout(r, BALANCE_POLL_INTERVAL_MS));
        const res = await walletApi.getBalance(token);
        if (res.success && res.data && res.data.wallet.balance > baseline) {
          return; // confirmed — webhook landed
        }
      }
      // Timed out without seeing the credit — webhook may just be slow.
      // Don't block the user here; onSuccess()'s own refresh (dashboard/wallet
      // page) will pick it up once it does land.
    } finally {
      setConfirming(false);
    }
  };

  const handleRecharge = async (rechargeAmount: number) => {
    if (rechargeAmount < 10) {
      setError('Minimum recharge amount is ₹10');
      return;
    }
    
    setLoading(true);
    setError('');

    try {
      const token = tokenStore.getAccess();
      if (!token) throw new Error('Not authenticated');

      if (paymentMethod === 'stripe') {
        const res = await walletApi.rechargeStripe(token, rechargeAmount);
        if (!res.success || !res.data?.url) {
          throw new Error(res.message || 'Failed to initialize Stripe checkout');
        }
        // Redirect to Stripe Hosted Checkout
        window.location.href = res.data.url;
        return; // Execution stops here due to redirect
      }

      // ─── Razorpay Flow ───
      // 1. Initialize Razorpay order on backend
      const res = await walletApi.recharge(token, rechargeAmount);
      if (!res.success || !res.data) {
        throw new Error(res.message || 'Failed to initialize recharge');
      }

      const { orderId } = res.data;

      // Baseline balance to poll against — captured before checkout opens so
      // waitForCredit() can tell "webhook landed" apart from "balance just
      // happened to already be this number".
      const balanceRes = await walletApi.getBalance(token);
      const baselineBalance = balanceRes.success && balanceRes.data ? balanceRes.data.wallet.balance : 0;

      // 2. Load Razorpay script
      const isLoaded = await loadRazorpay();
      if (!isLoaded) {
        throw new Error('Razorpay SDK failed to load. Are you online?');
      }

      // 3. Open Razorpay Popup
      const options = {
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || 'dummy_key',
        amount: rechargeAmount * 100,
        currency: 'INR',
        name: 'HealConnect',
        description: 'Wallet Recharge',
        order_id: orderId,
        // eslint-disable-next-line @typescript-eslint/no-unused-vars, @typescript-eslint/no-explicit-any
        handler: function (_response: any) {
          // Payment submitted on Razorpay's side — the actual wallet credit
          // still depends on their webhook reaching us. Keep the modal open
          // on a short "confirming" state and wait for it to actually show
          // up, instead of closing on a balance that hasn't updated yet.
          void waitForCredit(token, baselineBalance).finally(() => {
            onSuccess();
            onClose();
          });
        },
        prefill: {
          name: 'HealConnect User',
        },
        theme: {
          color: '#f59e0b',
        },
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const rzp = new (window as any).Razorpay(options);
      // eslint-disable-next-line @typescript-eslint/no-unused-vars, @typescript-eslint/no-explicit-any
      rzp.on('payment.failed', function (_response: any) {
        setError('Payment failed. Please try again.');
      });
      rzp.open();

    } catch (err: unknown) {
      setError((err as Error).message || 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && !confirming && onClose()}>
      <DialogContent className="sm:max-w-md bg-white border border-yellow-100 font-sans">
        {confirming ? (
          <div className="flex flex-col items-center justify-center gap-4 py-10 text-center">
            <Loader2 className="w-10 h-10 text-[#f59e0b] animate-spin" />
            <div>
              <p className="font-bold text-[#1a1a1a]">Confirming your payment…</p>
              <p className="text-sm text-gray-500 mt-1">
                Payment received — updating your wallet balance. This usually takes a few seconds.
              </p>
            </div>
          </div>
        ) : (
        <>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl font-extrabold text-[#1a1a1a]">
            <Wallet className="w-5 h-5 text-[#f59e0b]" /> Recharge Wallet
          </DialogTitle>
          <DialogDescription className="text-gray-500">
            Add funds to your wallet to seamlessly connect with experts.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-3 py-4">
          {PRESET_AMOUNTS.map((preset) => (
            <Button
              key={preset}
              variant="outline"
              className={`border-yellow-200 text-[#d97706] bg-yellow-50 hover:bg-yellow-100 hover:text-[#b45309] font-bold ${amount === preset ? 'ring-2 ring-[#f59e0b] border-transparent' : ''}`}
              onClick={() => setAmount(preset)}
            >
              ₹{preset}
            </Button>
          ))}
        </div>

        <div className="space-y-3 pb-2">
          <label className="text-sm font-semibold text-[#1a1a1a]">Payment Method</label>
          <div className="grid grid-cols-2 gap-3">
            <Button
              variant="outline"
              className={`h-12 border-gray-200 font-medium ${paymentMethod === 'razorpay' ? 'ring-2 ring-[#f59e0b] bg-yellow-50 text-[#d97706] border-transparent' : 'text-gray-600 hover:bg-gray-50'}`}
              onClick={() => setPaymentMethod('razorpay')}
            >
              Domestic (INR)
            </Button>
            <Button
              variant="outline"
              className={`h-12 border-gray-200 font-medium ${paymentMethod === 'stripe' ? 'ring-2 ring-[#f59e0b] bg-yellow-50 text-[#d97706] border-transparent' : 'text-gray-600 hover:bg-gray-50'}`}
              onClick={() => setPaymentMethod('stripe')}
            >
              International (USD)
            </Button>
          </div>
          {paymentMethod === 'stripe' && (
            <p className="text-xs text-gray-500">
              * International payments are converted to USD (approx ${((amount || 0) / 83).toFixed(2)}) and processed securely via Stripe.
            </p>
          )}
        </div>

        <div className="space-y-3">
          <label className="text-sm font-semibold text-[#1a1a1a]">Or enter custom amount (₹)</label>
          <Input
            type="number"
            min="10"
            placeholder="e.g. 500"
            value={amount}
            onChange={(e) => setAmount(e.target.value === '' ? '' : Number(e.target.value))}
            className="border-gray-200 focus:ring-[#f59e0b]/40 focus:border-[#f59e0b]"
          />
          {error && <p className="text-sm text-red-500 font-medium">{error}</p>}
        </div>

        <div className="pt-2">
          <Button
            className="w-full bg-[#f59e0b] hover:bg-[#d97706] text-white font-bold h-12 rounded-xl"
            disabled={loading || !amount || amount < 10}
            onClick={() => handleRecharge(amount as number)}
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : `Proceed to Pay ₹${amount || 0}`}
          </Button>
        </div>
        </>
        )}
      </DialogContent>
    </Dialog>
  );
}
