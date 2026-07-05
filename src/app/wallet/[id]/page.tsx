'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Card, Button, Skeleton } from '@/components/ui';
import { useRealtime } from '@/hooks/useRealtime';
import toast from 'react-hot-toast';
import { AnimatePresence } from 'framer-motion';
import WithdrawModal from '@/components/WithdrawModal';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend,
    Filler,
} from 'chart.js';
import { Line } from 'react-chartjs-2';

ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend,
    Filler
);

interface Transaction {
    id: string;
    amount: number;
    type: 'deposit' | 'deduction';
    date: string;
    description?: string;
    schedule?: string;
}

interface LockedFund {
    _id: string;
    description?: string;
    amount: number;
    lockedAt: string;
    unlocksAt: string;
    isActive: boolean;
}

interface Wallet {
    id: string;
    balance: number;
    owner: string;
    transactions: Transaction[];
    lockedFunds: LockedFund[];
    availableBalance: number;
}

export default function WalletPage() {
    const params = useParams();
    const router = useRouter();
    const walletId = params.id as string;
    const [wallet, setWallet] = useState<Wallet | null>(null);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<'all' | 'deposit' | 'deduction'>('all');
    const [showWithdrawModal, setShowWithdrawModal] = useState(false);


    const fetchWallet = useCallback(async () => {
        try {
            const res = await fetch(`/api/wallet/${walletId}`);
            if (res.ok) {
                const data = await res.json();
                setWallet(data.wallet);
            }
        } catch (error) {
            console.error('Failed to fetch wallet:', error);
        } finally {
            setLoading(false);
        }
    }, [walletId]);

    useEffect(() => {
        if (walletId) {
            fetchWallet();
        }
    }, [walletId, fetchWallet]);

    // Setup real-time updates
    useRealtime({
        userId: wallet?.owner || '',
        onBalanceUpdate: () => {
            fetchWallet();
            toast.success('Wallet balance updated!', { icon: '📥' });
        }
    });

    const filteredTransactions = wallet?.transactions.filter((t) =>
        filter === 'all' ? true : t.type === filter
    ) || [];

    // Prepare chart data
    const chartData = {
        labels: wallet?.transactions.slice(-10).map((t) =>
            new Date(t.date).toLocaleDateString('en-NG', { month: 'short', day: 'numeric' })
        ) || [],
        datasets: [
            {
                label: 'Deposits',
                data: wallet?.transactions.slice(-10).map((t) =>
                    t.type === 'deposit' ? t.amount : 0
                ) || [],
                borderColor: '#28A745',
                backgroundColor: 'rgba(40, 167, 69, 0.1)',
                fill: true,
                tension: 0.4,
            },
            {
                label: 'Deductions',
                data: wallet?.transactions.slice(-10).map((t) =>
                    t.type === 'deduction' ? t.amount : 0
                ) || [],
                borderColor: '#DC3545',
                backgroundColor: 'rgba(220, 53, 69, 0.1)',
                fill: true,
                tension: 0.4,
            },
        ],
    };

    const chartOptions: any = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                position: 'top',
            },
            tooltip: {
                callbacks: {
                    label: (context: any) => {
                        return `${context.dataset.label}: ₦${context.parsed.y.toLocaleString()}`;
                    },
                },
            },
        },
        scales: {
            y: {
                beginAtZero: true,
                ticks: {
                    callback: (value: any) => `₦${Number(value).toLocaleString()}`,
                },
            },
        },
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-neutral-light p-6">
                <div className="max-w-4xl mx-auto space-y-6">
                    <Skeleton className="h-32 rounded-xl" />
                    <Skeleton className="h-80 rounded-xl" />
                    <Skeleton className="h-64 rounded-xl" />
                </div>
            </div>
        );
    }

    if (!wallet) {
        return (
            <div className="min-h-screen bg-neutral-light flex items-center justify-center">
                <Card className="p-8 text-center">
                    <h2 className="text-xl font-semibold text-neutral-dark mb-2">Wallet Not Found</h2>
                    <p className="text-gray-500">This wallet doesn&apos;t exist or you don&apos;t have access.</p>
                </Card>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-neutral-light p-6">
            <div className="max-w-4xl mx-auto space-y-6">
                <button
                    onClick={() => router.back()}
                    className="flex items-center gap-2 text-gray-500 hover:text-gray-900 mb-2 transition-colors"
                >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                    Back
                </button>
                {/* Balance Card */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                >
                    <div className="grid md:grid-cols-2 gap-4">
                        <Card className="p-6 bg-linear-to-r from-primary to-secondary text-white relative overflow-hidden">
                            <div className="relative z-10">
                                <p className="text-sm opacity-80 mb-4">Wallet Funds Breakdown</p>
                                <div className="space-y-3">
                                    <div>
                                        <p className="text-xs opacity-70 mb-1">Available Balance (Can Withdraw)</p>
                                        <p className="text-3xl font-bold text-green-300">
                                            ₦{(wallet.availableBalance || 0).toLocaleString()}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-xs opacity-70 mb-1">Locked for Medications</p>
                                        <p className="text-3xl font-bold text-yellow-300">
                                            ₦{(wallet.balance - (wallet.availableBalance || 0)).toLocaleString()}
                                        </p>
                                    </div>
                                    <div className="border-t border-white/20 pt-2">
                                        <p className="text-xs opacity-70 mb-1">Total Balance</p>
                                        <p className="text-2xl font-bold">
                                            ₦{wallet.balance.toLocaleString()}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex gap-3 mt-4">
                                    <Button
                                        variant="secondary"
                                        className="bg-white/20 hover:bg-white/30 text-white border-white/30"
                                        onClick={() => setShowWithdrawModal(true)}
                                    >
                                        🏦 Withdraw
                                    </Button>
                                    <Button
                                        variant="outline"
                                        className="border-white/30 text-white hover:bg-white/10"
                                    >
                                        History
                                    </Button>
                                </div>
                            </div>
                            <div className="absolute right-0 top-0 h-full w-1/3 bg-white/5 skew-x-12 transform translate-x-8" />
                        </Card>

                        {/* Locked Funds Summary */}
                        <Card className="p-6">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="font-semibold text-neutral-dark">Locked Funds</h3>
                                <span className="bg-amber-100 text-amber-800 text-xs px-2 py-1 rounded-full">
                                    {wallet.lockedFunds?.filter(l => l.isActive).length || 0} Active
                                </span>
                            </div>

                            <div className="space-y-3 max-h-40 overflow-y-auto">
                                {wallet.lockedFunds?.filter(l => l.isActive).length === 0 ? (
                                    <p className="text-sm text-gray-500 text-center py-4">No locked funds</p>
                                ) : (
                                    wallet.lockedFunds?.filter(l => l.isActive).map(lock => (
                                        <div key={lock._id} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg border border-gray-100">
                                            <div>
                                                <p className="font-medium text-sm">{lock.description || 'Medical Reserve'}</p>
                                            </div>
                                            <div className="text-right">
                                                <p className="font-bold text-neutral-dark">₦{lock.amount.toLocaleString()}</p>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </Card>
                    </div>
                </motion.div>



                <WithdrawModal
                    isOpen={showWithdrawModal}
                    onClose={() => setShowWithdrawModal(false)}
                    walletId={walletId}
                    availableBalance={wallet.availableBalance || 0}
                    onSuccess={fetchWallet}
                />

                {/* Chart */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                >
                    <Card className="p-6">
                        <h2 className="text-lg font-semibold text-neutral-dark mb-4">
                            Transaction History
                        </h2>
                        <div className="h-80">
                            <Line data={chartData} options={chartOptions} />
                        </div>
                    </Card>
                </motion.div>

                {/* Transactions List */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                >
                    <Card className="p-6">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-lg font-semibold text-neutral-dark">
                                Recent Transactions
                            </h2>
                            <div className="flex gap-2">
                                {(['all', 'deposit', 'deduction'] as const).map((f) => (
                                    <button
                                        key={f}
                                        onClick={() => setFilter(f)}
                                        className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${filter === f
                                            ? 'bg-primary text-white'
                                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                            }`}
                                    >
                                        {f.charAt(0).toUpperCase() + f.slice(1)}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {filteredTransactions.length === 0 ? (
                            <p className="text-center text-gray-500 py-8">No transactions found</p>
                        ) : (
                            <div className="space-y-3">
                                {filteredTransactions.map((transaction) => (
                                    <motion.div
                                        key={transaction.id}
                                        initial={{ opacity: 0, x: -10 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        className="flex items-center justify-between p-4 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors"
                                    >
                                        <div className="flex items-center gap-4">
                                            <div
                                                className={`w-10 h-10 rounded-full flex items-center justify-center ${transaction.type === 'deposit'
                                                    ? 'bg-green-100 text-green-600'
                                                    : 'bg-red-100 text-red-600'
                                                    }`}
                                            >
                                                {transaction.type === 'deposit' ? (
                                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                                    </svg>
                                                ) : (
                                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                                                    </svg>
                                                )}
                                            </div>
                                            <div>
                                                <p className="font-medium text-neutral-dark">
                                                    {transaction.description || (transaction.type === 'deposit' ? 'Deposit' : 'Medication Refill')}
                                                </p>
                                                <p className="text-sm text-gray-500">
                                                    {new Date(transaction.date).toLocaleDateString('en-NG', {
                                                        year: 'numeric',
                                                        month: 'long',
                                                        day: 'numeric',
                                                    })}
                                                </p>
                                            </div>
                                        </div>
                                        <span
                                            className={`font-semibold ${transaction.type === 'deposit' ? 'text-green-600' : 'text-red-600'
                                                }`}
                                        >
                                            {transaction.type === 'deposit' ? '+' : '-'}₦{transaction.amount.toLocaleString()}
                                        </span>
                                    </motion.div>
                                ))}
                            </div>
                        )}
                    </Card>
                </motion.div>
            </div>
        </div>
    );
}
