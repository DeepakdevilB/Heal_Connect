'use client';

import React from 'react';
import { Receipt, Clock, CreditCard, Wallet, Calendar, CheckCircle2, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

export interface BillingSummaryModalProps {
  isOpen: boolean;
  durationFormatted: string;
  perMinuteRate: number;
  totalAmount: number;
  walletDeduction: number;
  remainingWalletBalance: number;
  startTime?: string | null;
  endTime?: string | null;
  onProceedToRating: () => void;
}

export function BillingSummaryModal({
  isOpen,
  durationFormatted,
  perMinuteRate,
  totalAmount,
  walletDeduction,
  remainingWalletBalance,
  startTime,
  endTime,
  onProceedToRating,
}: BillingSummaryModalProps) {
  if (!isOpen) return null;

  const formatDate = (isoStr?: string | null) => {
    if (!isoStr) return '—';
    try {
      return new Date(isoStr).toLocaleTimeString('en-IN', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });
    } catch {
      return '—';
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 font-sans animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-yellow-100 overflow-hidden text-[#1a1a1a]">
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-amber-500 to-orange-500 text-white p-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-white/20 rounded-2xl backdrop-blur">
              <Receipt className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-extrabold tracking-tight">Billing Summary</h2>
              <p className="text-xs text-amber-100">Consultation Completed</p>
            </div>
          </div>
          <CheckCircle2 className="w-8 h-8 text-amber-200" />
        </div>

        {/* Modal Content */}
        <div className="p-6 space-y-4">
          {/* Main Total Highlight */}
          <div className="bg-[#fffbf0] border border-yellow-200/80 rounded-2xl p-4 text-center">
            <span className="text-xs uppercase font-semibold text-gray-500 tracking-wider">Total Amount Debited</span>
            <div className="text-3xl font-extrabold text-[#d97706] mt-1">₹{totalAmount.toFixed(2)}</div>
          </div>

          {/* Detailed Line Items */}
          <div className="space-y-3 text-sm divide-y divide-gray-100">
            <div className="flex items-center justify-between pt-1">
              <div className="flex items-center gap-2 text-gray-600">
                <Clock className="w-4 h-4 text-amber-500" />
                <span>Call Duration</span>
              </div>
              <span className="font-semibold text-gray-900 font-mono">{durationFormatted}</span>
            </div>

            <div className="flex items-center justify-between pt-3">
              <div className="flex items-center gap-2 text-gray-600">
                <CreditCard className="w-4 h-4 text-amber-500" />
                <span>Rate per Minute</span>
              </div>
              <span className="font-semibold text-gray-900">₹{perMinuteRate}/min</span>
            </div>

            <div className="flex items-center justify-between pt-3">
              <div className="flex items-center gap-2 text-gray-600">
                <Wallet className="w-4 h-4 text-amber-500" />
                <span>Wallet Deduction</span>
              </div>
              <span className="font-semibold text-rose-600">- ₹{walletDeduction.toFixed(2)}</span>
            </div>

            <div className="flex items-center justify-between pt-3">
              <div className="flex items-center gap-2 text-gray-600">
                <Wallet className="w-4 h-4 text-emerald-500" />
                <span>Remaining Balance</span>
              </div>
              <span className="font-bold text-emerald-600">₹{remainingWalletBalance.toFixed(2)}</span>
            </div>

            {(startTime || endTime) && (
              <div className="flex items-center justify-between pt-3 text-xs text-gray-400">
                <div className="flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5" />
                  <span>Time</span>
                </div>
                <span>
                  {formatDate(startTime)} - {formatDate(endTime)}
                </span>
              </div>
            )}
          </div>

          {/* Action Button */}
          <div className="pt-2">
            <Button
              onClick={onProceedToRating}
              className="w-full bg-[#f59e0b] hover:bg-[#d97706] text-white font-bold py-3 rounded-xl shadow-md transition-all flex items-center justify-center gap-2 text-sm"
            >
              <span>Rate Consultation</span>
              <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
