'use client';

import { Clock, Wallet, PhoneOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface Props {
  elapsedSeconds: number;
  walletBalance: number | null;
  onEndSession: () => void;
  isLowBalance: boolean;
}

export default function SessionTimerOverlay({ elapsedSeconds, walletBalance, onEndSession, isLowBalance }: Props) {
  const mm = String(Math.floor(elapsedSeconds / 60)).padStart(2, '0');
  const ss = String(elapsedSeconds % 60).padStart(2, '0');

  return (
    <div className="flex items-center gap-2 px-3 py-2 bg-white border-b border-yellow-100">
      {/* Timer */}
      <div className="flex items-center gap-1.5 bg-yellow-50 border border-yellow-200 rounded-full px-3 py-1">
        <Clock className="h-3.5 w-3.5 text-[#f59e0b]" />
        <span className="text-xs font-mono font-semibold text-[#d97706]">{mm}:{ss}</span>
      </div>

      {/* Wallet balance */}
      <div className={cn(
        'flex items-center gap-1.5 rounded-full px-3 py-1 border',
        isLowBalance
          ? 'bg-red-50 border-red-200'
          : 'bg-emerald-50 border-emerald-200'
      )}>
        <Wallet className={cn('h-3.5 w-3.5', isLowBalance ? 'text-red-500' : 'text-emerald-600')} />
        <span className={cn('text-xs font-semibold', isLowBalance ? 'text-red-600' : 'text-emerald-700')}>
          {walletBalance !== null ? `₹${walletBalance.toFixed(0)}` : '...'}
        </span>
      </div>

      <div className="flex-1" />

      {/* End session */}
      <Button
        size="sm"
        variant="destructive"
        onClick={onEndSession}
        className="h-7 px-3 text-xs rounded-full gap-1"
      >
        <PhoneOff className="h-3 w-3" />
        End
      </Button>
    </div>
  );
}
