'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Wallet, ArrowUpRight, ArrowDownRight, Clock, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { walletApi, tokenStore } from '@/lib/api';
import { RechargeModal } from '@/components/wallet/RechargeModal';

export default function WalletPage() {
  const [wallet, setWallet] = useState<{ balance: number; transactions: Array<{ id: string; type: string; status: string; amount: number; createdAt: string }> } | null>(null);
  const [loading, setLoading] = useState(true);
  const [isRechargeModalOpen, setIsRechargeModalOpen] = useState(false);

  const fetchWallet = () => {
    const token = tokenStore.getAccess();
    if (token) {
      walletApi.getBalance(token)
        .then((res) => {
          if (res.success && res.data) setWallet(res.data.wallet);
        })
        .finally(() => setLoading(false));
    }
  };

  useEffect(() => {
    fetchWallet();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#fffbf0] flex items-center justify-center">
        <Clock className="w-6 h-6 text-[#f59e0b] animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#fffbf0] text-[#1a1a1a] flex flex-col font-sans">
      <header className="sticky top-0 z-50 w-full border-b border-yellow-100 bg-white/80 backdrop-blur">
        <div className="container mx-auto px-4 h-16 flex items-center gap-4">
          <Link href="/dashboard" className="text-gray-500 hover:text-[#f59e0b] transition-colors">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <h1 className="text-xl font-extrabold text-[#1a1a1a]">My Wallet</h1>
        </div>
      </header>

      <main className="flex-1 container mx-auto px-4 py-8 max-w-4xl space-y-8">
        
        {/* Balance Card */}
        <Card className="bg-gradient-to-br from-[#f59e0b] to-[#ef4444] text-white border-0 shadow-lg relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl pointer-events-none" />
          <CardContent className="p-8 flex flex-col md:flex-row items-center justify-between gap-6 relative z-10">
            <div>
              <p className="text-yellow-100 font-medium mb-1 flex items-center gap-2">
                <Wallet className="w-5 h-5" /> Current Balance
              </p>
              <h2 className="text-4xl md:text-5xl font-extrabold">
                ₹{(wallet?.balance || 0).toFixed(2)}
              </h2>
            </div>
            <Button 
              onClick={() => setIsRechargeModalOpen(true)}
              className="bg-white text-[#d97706] hover:bg-yellow-50 border-0 rounded-full px-8 h-12 text-lg font-bold shadow-lg"
            >
              <Plus className="w-5 h-5 mr-2" /> Recharge Wallet
            </Button>
          </CardContent>
        </Card>

        {/* Transactions Ledger */}
        <div>
          <h3 className="text-lg font-extrabold text-[#1a1a1a] mb-4">Transaction History</h3>
          
          <Card className="bg-white border border-yellow-100 shadow-sm overflow-hidden">
            {!wallet?.transactions || wallet.transactions.length === 0 ? (
              <div className="p-12 text-center text-gray-400">
                <Wallet className="w-12 h-12 mx-auto mb-3 opacity-20" />
                <p>No transactions yet.</p>
              </div>
            ) : (
              <Table>
                <TableHeader className="bg-yellow-50/50">
                  <TableRow className="border-yellow-100 hover:bg-transparent">
                    <TableHead className="font-semibold text-gray-600">Type</TableHead>
                    <TableHead className="font-semibold text-gray-600">Date</TableHead>
                    <TableHead className="font-semibold text-gray-600">Status</TableHead>
                    <TableHead className="text-right font-semibold text-gray-600">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {wallet.transactions.map((tx: { id: string; type: string; status: string; amount: number; createdAt: string }) => {
                    const isCredit = tx.type === 'RECHARGE' || tx.type === 'REFUND';
                    return (
                      <TableRow key={tx.id} className="border-yellow-100">
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className={`p-1.5 rounded-full ${isCredit ? 'bg-emerald-100 text-emerald-600' : 'bg-orange-100 text-orange-500'}`}>
                              {isCredit ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
                            </div>
                            <span className="font-medium">{tx.type}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-gray-500 text-sm">
                          {new Date(tx.createdAt).toLocaleDateString('en-IN', {
                            day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
                          })}
                        </TableCell>
                        <TableCell>
                          <Badge 
                            variant="outline" 
                            className={`text-xs ${
                              tx.status === 'SUCCESS' ? 'border-emerald-300 text-emerald-600 bg-emerald-50' : 
                              tx.status === 'PENDING' ? 'border-yellow-300 text-yellow-600 bg-yellow-50' : 
                              'border-red-300 text-red-600 bg-red-50'
                            }`}
                          >
                            {tx.status}
                          </Badge>
                        </TableCell>
                        <TableCell className={`text-right font-bold ${isCredit ? 'text-emerald-600' : 'text-[#1a1a1a]'}`}>
                          {isCredit ? '+' : '-'}₹{tx.amount.toFixed(2)}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </Card>
        </div>
      </main>

      <RechargeModal 
        isOpen={isRechargeModalOpen} 
        onClose={() => setIsRechargeModalOpen(false)} 
        onSuccess={() => {
          fetchWallet();
          setTimeout(fetchWallet, 2000);
        }} 
      />
    </div>
  );
}
