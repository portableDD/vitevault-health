'use client';

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, Button, Modal, Input, Skeleton } from '@/components/ui';
import toast from 'react-hot-toast';

interface LockedFund {
    id: string;
    description?: string;
    amount: number;
    unlocksAt: string;
}

interface Parent {
    id: string;
    name: string;
    avatar: string;
    walletId: string | null;
    balance: number;
    availableBalance: number;
    totalLocked: number;
    lockedFunds: LockedFund[];
}

interface Transaction {
    amount: number;
    type: string;
    date: string;
    description?: string;
}

export default function WalletPage() {
    const { data: session, status } = useSession();
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [parents, setParents] = useState<Parent[]>([]);
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [selectedParent, setSelectedParent] = useState<string | null>(null);

    useEffect(() => {
        if (status === 'unauthenticated') {
            router.push('/login');
            return;
        }
        if (status === 'authenticated') {
            if (session?.user?.role === 'parent') {
                fetchParentWallet();
                return;
            }
            fetchWalletData();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [status, session]);

    const fetchParentWallet = async () => {
        try {
            const res = await fetch('/api/dashboard');
            const data = await res.json();
            if (data.wallet?.id) {
                router.push(`/wallet/${data.wallet.id}`);
            } else {
                setLoading(false);
            }
        } catch {
            setLoading(false);
        }
    };

    const fetchWalletData = async () => {
        try {
            const res = await fetch('/api/dashboard');
            if (!res.ok) throw new Error('Failed');
            const data = await res.json();
            setParents(data.parents || []);

            const allTx: Transaction[] = [];
            for (const parent of (data.parents || [])) {
                if (parent.walletId) {
                    try {
                        const walletRes = await fetch(`/api/wallet/${parent.walletId}`);
                        if (walletRes.ok) {
                            const walletData = await walletRes.json();
                            const txs = (walletData.transactions || []).map((t: Transaction) => ({
                                ...t,
                                description: t.description || `${t.type === 'deposit' ? 'Deposit' : 'Deduction'} - ${parent.name}`,
                            }));
                            allTx.push(...txs);
                        }
                    } catch { /* skip */ }
                }
            }
            allTx.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
            setTransactions(allTx.slice(0, 20));
        } catch (error) {
            console.error('Wallet fetch error:', error);
            toast.error('Failed to load wallet data');
        } finally {
            setLoading(false);
        }
    };

    if (loading || status === 'loading') {
        return (
            <div className="space-y-6">
                <Skeleton className="h-12 w-64" />
                <Skeleton className="h-48 rounded-2xl" />
                <Skeleton className="h-64 rounded-2xl" />
                <Skeleton className="h-48 rounded-2xl" />
            </div>
        );
    }

    // Aggregate
    const totalBalance = parents.reduce((s, p) => s + (p.balance || 0), 0);
    const totalAvailable = parents.reduce((s, p) => s + (p.availableBalance || 0), 0);
    const totalLocked = parents.reduce((s, p) => s + (p.totalLocked || 0), 0);
    const allLockedFunds = parents.flatMap(p =>
        (p.lockedFunds || []).map(l => ({ ...l, parentName: p.name, walletId: p.walletId || '' }))
    );
    const lockedPercent = totalBalance > 0 ? Math.round((totalLocked / totalBalance) * 100) : 0;

    const filteredLocks = selectedParent
        ? allLockedFunds.filter(l => l.parentName === selectedParent)
        : allLockedFunds;

    const parentsWithWallet = parents.filter(p => p.walletId);

    return (
        <div className="max-w-4xl mx-auto">
            {/* Page Header */}
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-2xl md:text-3xl font-bold text-[#343A40]">
                        💰 Wallet
                    </h1>
                    <p className="text-[#6C757D] mt-1">
                        Your complete financial overview
                    </p>
                </div>
            </div>

            {/* Hero Balance Card */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
            >
                <div
                    className="rounded-2xl p-6 md:p-8 mb-6 text-white relative overflow-hidden"
                    style={{ background: 'linear-gradient(135deg, #007BFF 0%, #0056b3 50%, #003d80 100%)' }}
                >
                    <div className="absolute top-0 right-0 w-40 h-40 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
                    <div className="absolute bottom-0 left-0 w-32 h-32 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2" />

                    <div className="relative z-10">
                        <p className="text-sm opacity-80 mb-1">Total Balance</p>
                        <p className="text-4xl md:text-5xl font-bold mb-6">₦{totalBalance.toLocaleString()}</p>

                        <div className="grid grid-cols-2 gap-4 mb-4">
                            <div className="bg-white/15 backdrop-blur-sm rounded-xl p-4">
                                <div className="flex items-center gap-2 mb-1">
                                    <div className="w-3 h-3 rounded-full bg-green-400" />
                                    <p className="text-sm opacity-80">Available</p>
                                </div>
                                <p className="text-2xl font-bold">₦{totalAvailable.toLocaleString()}</p>
                                <p className="text-xs opacity-60 mt-1">Ready to spend</p>
                            </div>
                            <div className="bg-white/15 backdrop-blur-sm rounded-xl p-4">
                                <div className="flex items-center gap-2 mb-1">
                                    <div className="w-3 h-3 rounded-full bg-amber-400" />
                                    <p className="text-sm opacity-80">🔒 Locked</p>
                                </div>
                                <p className="text-2xl font-bold">₦{totalLocked.toLocaleString()}</p>
                                <p className="text-xs opacity-60 mt-1">Reserved for medication</p>
                            </div>
                        </div>

                        {totalBalance > 0 && (
                            <div className="mt-6">
                                <div className="flex justify-between text-xs opacity-80 mb-2 font-medium">
                                    <span>Available: {100 - lockedPercent}%</span>
                                    <span>Locked: {lockedPercent}%</span>
                                </div>
                                <div className="w-full h-3 flex bg-white/20 rounded-full overflow-hidden">
                                    <div
                                        className="h-full transition-all duration-700 ease-out"
                                        style={{
                                            width: `${100 - lockedPercent}%`,
                                            background: 'linear-gradient(90deg, #34d399, #10b981)',
                                        }}
                                        title={`Available: ₦${totalAvailable.toLocaleString()}`}
                                    />
                                    <div
                                        className="h-full transition-all duration-700 ease-out"
                                        style={{
                                            width: `${lockedPercent}%`,
                                            background: 'linear-gradient(90deg, #fbbf24, #f59e0b)',
                                        }}
                                        title={`Locked: ₦${totalLocked.toLocaleString()}`}
                                    />
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </motion.div>

            {/* Per-Parent Breakdown */}
            {parents.length > 1 && (
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, delay: 0.1 }}
                    className="mb-6"
                >
                    <h2 className="text-lg font-bold text-[#343A40] mb-3">Balance by Parent</h2>
                    <div className="grid md:grid-cols-2 gap-3">
                        {parents.map(parent => (
                            <Card key={parent.id} className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-[#007BFF]/10 rounded-full flex items-center justify-center text-2xl">
                                    {parent.avatar || '👤'}
                                </div>
                                <div className="flex-1">
                                    <p className="font-semibold text-[#343A40] text-sm">{parent.name}</p>
                                    <div className="flex gap-3 mt-1">
                                        <span className="text-xs text-green-600">
                                            ✓ ₦{(parent.availableBalance || 0).toLocaleString()}
                                        </span>
                                        <span className="text-xs text-amber-600">
                                            🔒 ₦{(parent.totalLocked || 0).toLocaleString()}
                                        </span>
                                    </div>
                                </div>
                                <p className="font-bold text-[#343A40]">₦{parent.balance.toLocaleString()}</p>
                            </Card>
                        ))}
                    </div>
                </motion.div>
            )}

            {/* Locked Funds Detail */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.2 }}
                className="mb-6"
            >
                <div className="flex items-center justify-between mb-3">
                    <h2 className="text-lg font-bold text-[#343A40]">🔒 Locked Funds</h2>
                    <div className="flex items-center gap-2">
                        {parents.length > 1 && (
                            <select
                                value={selectedParent || ''}
                                onChange={(e) => setSelectedParent(e.target.value || null)}
                                className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 text-[#343A40] bg-white"
                            >
                                <option value="">All Parents</option>
                                {parents.map(p => (
                                    <option key={p.id} value={p.name}>{p.name}</option>
                                ))}
                            </select>
                        )}
                    </div>
                </div>

                {filteredLocks.length === 0 ? (
                    <Card className="text-center py-8">
                        <div className="text-4xl mb-2">🔓</div>
                        <p className="text-[#6C757D] font-medium mb-1">No locked funds</p>
                        <p className="text-sm text-[#6C757D] mb-4">
                            Lock funds to reserve money for specific medications.
                        </p>
                    </Card>
                ) : (
                    <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden">
                        <div className="divide-y divide-gray-100">
                            <AnimatePresence>
                                {filteredLocks.map((lock) => {
                                    return (
                                        <motion.div
                                            key={lock.id}
                                            initial={{ opacity: 0, x: -10 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            exit={{ opacity: 0, x: 10 }}
                                            className="px-5 py-4"
                                        >
                                            <div className="flex items-start justify-between">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center">
                                                        <span>💊</span>
                                                    </div>
                                                    <div>
                                                        <p className="font-semibold text-[#343A40]">{lock.description || 'Medical Reserve'}</p>
                                                        <p className="text-xs text-[#6C757D]">
                                                            {lock.parentName}&apos;s wallet
                                                        </p>
                                                    </div>
                                                </div>
                                                <p className="font-bold text-amber-600">₦{lock.amount.toLocaleString()}</p>
                                            </div>
                                        </motion.div>
                                    );
                                })}
                            </AnimatePresence>
                        </div>
                    </div>
                )}
            </motion.div>

            {/* Transaction History */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.3 }}
            >
                <h2 className="text-lg font-bold text-[#343A40] mb-3">📋 Recent Transactions</h2>

                {transactions.length === 0 ? (
                    <Card className="text-center py-8">
                        <div className="text-4xl mb-2">📭</div>
                        <p className="text-[#6C757D]">No transactions yet</p>
                    </Card>
                ) : (
                    <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden">
                        <div className="divide-y divide-gray-100">
                            {transactions.map((tx, i) => (
                                <div key={i} className="flex items-center justify-between px-5 py-3 hover:bg-gray-50 transition-colors">
                                    <div className="flex items-center gap-3">
                                        <div className={`w-9 h-9 rounded-full flex items-center justify-center ${tx.type === 'deposit'
                                            ? 'bg-green-100'
                                            : 'bg-red-100'
                                            }`}>
                                            <span className="text-sm">{tx.type === 'deposit' ? '↗️' : '↘️'}</span>
                                        </div>
                                        <div>
                                            <p className="font-medium text-[#343A40] text-sm">{tx.description || tx.type}</p>
                                            <p className="text-xs text-[#6C757D]">
                                                {new Date(tx.date).toLocaleDateString()} · {new Date(tx.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </p>
                                        </div>
                                    </div>
                                    <p className={`font-bold text-sm ${tx.type === 'deposit' ? 'text-green-600' : 'text-red-500'
                                        }`}>
                                        {tx.type === 'deposit' ? '+' : '-'}₦{tx.amount.toLocaleString()}
                                    </p>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </motion.div>

        </div>
    );
}
