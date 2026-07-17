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

export function RechargeModal({ isOpen, onClose, onSuccess }: RechargeModalProps) {
  const [amount, setAmount] = useState<number | ''>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

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

      // 1. Initialize Razorpay order on backend
      const res = await walletApi.recharge(token, rechargeAmount);
      if (!res.success || !res.data) {
        throw new Error(res.message || 'Failed to initialize recharge');
      }

      const { orderId } = res.data;

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
          // Payment successful! Webhook will handle the actual DB update.
          // We can just optimistically trigger onSuccess.
          onSuccess();
          onClose();
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
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md bg-white border border-yellow-100 font-sans">
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
      </DialogContent>
    </Dialog>
  );
}
