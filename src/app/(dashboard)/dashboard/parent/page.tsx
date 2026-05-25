'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Button, Card, CountdownTimer, Skeleton } from '@/components/ui';
import toast from 'react-hot-toast';
import Link from 'next/link';
import { useRealtime } from '@/hooks/useRealtime';
import DepositModal from '@/components/DepositModal';
import WithdrawModal from '@/components/WithdrawModal';

interface Medication {
    id: string;
    name: string;
    daysRemaining: number;
    totalDays: number;
    refillCost: number;
    remainingQty: number;
    refillStatus: 'none' | 'pending_approval' | 'approved';
    countdownEndDate: string | null;
    countdownActive: boolean;
}

interface Child {
    id: string;
    name: string;
    avatar: string;
}

interface Pharmacy {
    id: string;
    name: string;
}

interface ActivityItem {
    id: string;
    amount: number;
    type: 'deposit' | 'deduction';
    description: string;
    date: string;
}

interface WalletData {
    id: string;
    balance: number; // Total balance
    availableBalance: number; // Can be withdrawn
    lockedFunds: number; // Locked for medications only
    currency: string;
    lastDeposit: {
        amount: number;
        date: string;
        from: string;
    } | null;
}

interface DashboardData {
    user: {
        id: string;
        name: string;
        email: string;
        role: string;
        linkCode: string;
    };
    wallet: WalletData | null;
    medications: Medication[];
    children: Child[];
    pharmacies: Pharmacy[];
    recentActivity: ActivityItem[];
}

export default function ParentDashboard() {
    const { data: session, status } = useSession();
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
    const [isDepositModalOpen, setIsDepositModalOpen] = useState(false);
    const [isWithdrawModalOpen, setIsWithdrawModalOpen] = useState(false);
    const [refillLoading, setRefillLoading] = useState<string | null>(null);

    // Setup real-time updates
    useRealtime({
        userId: dashboardData?.user?.id || '',
        onBalanceUpdate: () => {
            fetchDashboardData();
            toast.success('Wallet balance updated!', { icon: '💰' });
        },
        onRefillAlert: (data) => {
            fetchDashboardData();
            toast(`${data.medicationName} needs attention!`, { icon: '💊' });
        },
        onNotification: () => {
            toast('New notification received', { icon: '🔔' });
        }
    });

    useEffect(() => {
        if (status === 'unauthenticated') {
            router.push('/login');
            return;
        }

        if (status === 'authenticated') {
            fetchDashboardData();
        }
    }, [status, router]);

    const fetchDashboardData = async () => {
        try {
            const response = await fetch('/api/dashboard');
            if (!response.ok) {
                throw new Error('Failed to fetch dashboard data');
            }
            const data = await response.json();
            setDashboardData(data);
        } catch (error) {
            console.error('Dashboard fetch error:', error);
            toast.error('Failed to load dashboard data');
        } finally {
            setLoading(false);
        }
    };

    const formatTimeAgo = (dateStr: string) => {
        const diff = Date.now() - new Date(dateStr).getTime();
        const minutes = Math.floor(diff / 60000);
        const hours = Math.floor(diff / 3600000);
        const days = Math.floor(diff / 86400000);
        if (minutes < 1) return 'Just now';
        if (minutes < 60) return `${minutes}m ago`;
        if (hours < 24) return `${hours}h ago`;
        if (days < 7) return `${days}d ago`;
        return new Date(dateStr).toLocaleDateString('en-NG', { month: 'short', day: 'numeric' });
    };

    if (loading || status === 'loading') {
        return (
            <div className="space-y-6">
                <Skeleton className="h-12 w-64" />
                <Skeleton className="h-40 rounded-2xl" />
                <div className="grid md:grid-cols-3 gap-4">
                    <Skeleton className="h-48 rounded-2xl" />
                    <Skeleton className="h-48 rounded-2xl" />
                    <Skeleton className="h-48 rounded-2xl" />
                </div>
            </div>
        );
    }

    const wallet = dashboardData?.wallet;
    const medications = dashboardData?.medications || [];
    const children = dashboardData?.children || [];
    const pharmacies = dashboardData?.pharmacies || [];
    const recentActivity = dashboardData?.recentActivity || [];

    return (
        <div>
            {/* Welcome Header */}
            <div className="mb-8">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                    <div>
                        <h1 className="text-2xl md:text-3xl font-bold text-[#343A40]">
                            Your Health Dashboard 🏥
                        </h1>
                        <p className="text-[#6C757D] mt-1">
                            Welcome back, {dashboardData?.user?.name || session?.user?.name}!
                        </p>
                    </div>
                    {/* Connection Code */}
                    {dashboardData?.user?.linkCode && (
                        <div className="flex items-center gap-3 bg-white border border-gray-200 rounded-xl px-4 py-2.5 shadow-sm">
                            <div className="flex items-center gap-2">
                                <svg className="w-4 h-4 text-[#007BFF]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                                </svg>
                                <span className="text-xs text-[#6C757D]">My Code:</span>
                            </div>
                            <span className="font-mono font-bold text-[#007BFF] text-sm tracking-wider">{dashboardData.user.linkCode}</span>
                            <button
                                onClick={() => {
                                    navigator.clipboard.writeText(dashboardData.user.linkCode);
                                    toast.success('Code copied!');
                                }}
                                className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
                                title="Copy code"
                            >
                                <svg className="w-4 h-4 text-[#6C757D]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                </svg>
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* Wallet Balance Card */}
            <Card className="mb-8 gradient-hero text-white">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div>
                        <p className="text-white/80 text-sm mb-1">Total Wallet Balance</p>
                        <p className="text-4xl md:text-5xl font-bold">
                            ₦{(wallet?.balance || 0).toLocaleString()}
                        </p>
                        <div className="mt-3 bg-white/10 rounded-lg p-3 backdrop-blur-sm inline-block">
                            <p className="text-white/90 text-sm font-medium flex justify-between gap-4">
                                <span>Available to Withdraw:</span>
                                <span>₦{(wallet?.availableBalance || 0).toLocaleString()}</span>
                            </p>
                            <p className="text-white/80 text-sm flex justify-between gap-4 mt-1">
                                <span>Locked for Pharmacy:</span>
                                <span>₦{(wallet?.lockedFunds || 0).toLocaleString()}</span>
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        {wallet && (
                            <>
                                <Button
                                    variant="outline"
                                    className="bg-white/20 border-white/30 text-white hover:bg-white/30"
                                    onClick={() => setIsDepositModalOpen(true)}
                                >
                                    💰 Deposit
                                </Button>
                                <Button
                                    variant="outline"
                                    className="bg-transparent border-white/30 text-white hover:bg-white/10"
                                    onClick={() => setIsWithdrawModalOpen(true)}
                                >
                                    🏦 Withdraw
                                </Button>
                                <Link href={`/wallet/${wallet.id}`}>
                                    <Button variant="outline" className="bg-white/20 border-white/30 text-white hover:bg-white/30">
                                        Details
                                    </Button>
                                </Link>
                            </>
                        )}
                        <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm">
                            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                            </svg>
                        </div>
                    </div>
                </div>
            </Card>

            {/* Medications Section */}
            <div className="mb-8">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-bold text-[#343A40]">Your Medications</h2>
                    {wallet && (
                        <Link href={`/medications/${wallet.id}`}>
                            <Button variant="outline" size="sm">
                                Manage Medications
                            </Button>
                        </Link>
                    )}
                </div>

                {medications.length === 0 ? (
                    <Card className="text-center py-8">
                        <div className="text-4xl mb-2">💊</div>
                        <p className="text-[#6C757D] mb-4">No medications added yet</p>
                        {wallet && (
                            <Link href={`/medications/${wallet.id}`}>
                                <Button variant="primary" size="sm">
                                    Add Medication
                                </Button>
                            </Link>
                        )}
                    </Card>
                ) : (
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {medications.map((med) => (
                            <motion.div
                                key={med.id}
                                whileHover={{ scale: 1.02 }}
                                transition={{ duration: 0.2 }}
                            >
                                <Card className="h-full" hover>
                                    <div className="flex flex-col items-center text-center">
                                        <CountdownTimer
                                            daysRemaining={med.daysRemaining}
                                            totalDays={med.totalDays}
                                            size="md"
                                            countdownEndDate={med.countdownEndDate}
                                        />

                                        <h3 className="font-bold text-[#343A40] mt-4">{med.name}</h3>
                                        <p className="text-sm text-[#6C757D] mb-2">
                                            Refill cost: ₦{med.refillCost.toLocaleString()}
                                        </p>

                                        {/* Refill status badge */}
                                        {med.refillStatus === 'pending_approval' && (
                                            <div className="mb-3 inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-800 border border-amber-200">
                                                ⏳ Refill Pending (awaiting pharmacy)
                                            </div>
                                        )}
                                        {med.refillStatus === 'approved' && (
                                            <div className="mb-3 space-y-1">
                                                <div className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 border border-green-200">
                                                    ✅ Active & Approved
                                                </div>
                                                {med.countdownActive && (
                                                    <div className="block text-[11px] font-medium bg-blue-100 text-blue-700 px-2 py-1 rounded-full border border-blue-200">
                                                        ⏱️ Countdown Running
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        {/* Refill request button */}
                                        {med.daysRemaining <= 3 && med.refillStatus === 'none' && (
                                            <div className="w-full mb-2">
                                                {pharmacies.length > 0 ? (
                                                    <Button
                                                        variant="secondary"
                                                        size="sm"
                                                        className="w-full"
                                                        isLoading={refillLoading === med.id}
                                                        onClick={async () => {
                                                            setRefillLoading(med.id);
                                                            try {
                                                                const res = await fetch('/api/medication/refill-request', {
                                                                    method: 'POST',
                                                                    headers: { 'Content-Type': 'application/json' },
                                                                    body: JSON.stringify({ medicationId: med.id }),
                                                                });
                                                                const data = await res.json();
                                                                if (res.ok) {
                                                                    toast.success(data.message || `Refill request sent!`);
                                                                    fetchDashboardData();
                                                                } else {
                                                                    toast.error(data.error || 'Failed to send refill request');
                                                                }
                                                            } catch {
                                                                toast.error('Network error');
                                                            } finally {
                                                                setRefillLoading(null);
                                                            }
                                                        }}
                                                    >
                                                        💊 Request Refill
                                                    </Button>
                                                ) : (
                                                    <div className="text-xs text-amber-600 bg-amber-50 p-2 rounded-lg border border-amber-200">
                                                        ⚠️ No pharmacy connected yet.{' '}
                                                        <Link href="/connections" className="underline font-medium">
                                                            Connect one
                                                        </Link>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </Card>
                            </motion.div>
                        ))}
                    </div>
                )}
            </div>

            {/* Connected Children */}
            <div className="mb-8">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-bold text-[#343A40]">Connected Children</h2>
                    <Link href="/connections">
                        <Button variant="outline" size="sm">
                            Manage Connections
                        </Button>
                    </Link>
                </div>

                {children.length === 0 ? (
                    <Card className="text-center py-8">
                        <div className="text-4xl mb-2">👨‍👩‍👧‍👦</div>
                        <p className="text-[#6C757D] mb-2">No children connected yet</p>
                        <p className="text-sm text-[#6C757D] mb-4">
                            Share your link code: <span className="font-mono font-bold text-[#007BFF]">{dashboardData?.user?.linkCode}</span>
                        </p>
                        <Link href="/connections">
                            <Button variant="primary" size="sm">
                                Add Connection
                            </Button>
                        </Link>
                    </Card>
                ) : (
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {children.map((child) => (
                            <Card key={child.id} className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-[#FFC107]/10 rounded-full flex items-center justify-center text-2xl">
                                    {child.avatar || '👤'}
                                </div>
                                <div>
                                    <p className="font-bold text-[#343A40]">{child.name}</p>
                                    <p className="text-sm text-[#28A745]">Connected</p>
                                </div>
                            </Card>
                        ))}
                    </div>
                )}
            </div>

            {/* Connected Pharmacies */}
            <div className="mb-8">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-bold text-[#343A40]">Connected Pharmacies</h2>
                    <Link href="/connections">
                        <Button variant="outline" size="sm">
                            Manage
                        </Button>
                    </Link>
                </div>

                {pharmacies.length === 0 ? (
                    <Card className="text-center py-6">
                        <div className="text-3xl mb-2">🏪</div>
                        <p className="text-[#6C757D] mb-1 text-sm">No connected pharmacy yet</p>
                        <p className="text-xs text-[#6C757D] mb-3">
                            Connect a pharmacy to enable medication refills and auto-deductions.
                        </p>
                        <Link href="/connections">
                            <Button variant="primary" size="sm">
                                Connect Pharmacy
                            </Button>
                        </Link>
                    </Card>
                ) : (
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {pharmacies.map((pharmacy) => (
                            <Card key={pharmacy.id} className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center text-2xl">
                                    🏪
                                </div>
                                <div>
                                    <p className="font-bold text-[#343A40]">{pharmacy.name}</p>
                                    <p className="text-sm text-[#28A745]">Connected</p>
                                </div>
                            </Card>
                        ))}
                    </div>
                )}
            </div>

            {/* Activity Timeline — only render if there is actual data */}
            {recentActivity.length > 0 && (
                <div>
                    <h2 className="text-xl font-bold text-[#343A40] mb-4">Activity Timeline</h2>
                    <Card>
                        <div className="relative">
                            {/* Timeline line */}
                            <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-200" />

                            {recentActivity.map((activity, index) => (
                                <div key={activity.id} className="relative pl-10 pb-6 last:pb-0">
                                    {/* Timeline dot */}
                                    <div
                                        className={`absolute left-2.5 w-3 h-3 rounded-full ${activity.type === 'deposit'
                                            ? 'bg-[#28A745]'
                                            : 'bg-[#DC3545]'
                                            }`}
                                    />

                                    <motion.div
                                        initial={{ opacity: 0, x: -10 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: index * 0.05 }}
                                        className="flex items-center justify-between"
                                    >
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <span className="text-sm">
                                                    {activity.type === 'deposit' ? '💰' : '💸'}
                                                </span>
                                                <span className="font-medium text-[#343A40] text-sm">
                                                    {activity.description || (activity.type === 'deposit' ? 'Deposit' : 'Auto-Deduction')}
                                                </span>
                                            </div>
                                            <span className="text-xs text-[#6C757D] ml-6">
                                                {formatTimeAgo(activity.date)}
                                            </span>
                                        </div>
                                        <span className={`text-sm font-bold ${activity.type === 'deposit' ? 'text-[#28A745]' : 'text-[#DC3545]'
                                            }`}>
                                            {activity.type === 'deposit' ? '+' : '-'}₦{activity.amount.toLocaleString()}
                                        </span>
                                    </motion.div>
                                </div>
                            ))}
                        </div>
                    </Card>
                </div>
            )}

            {/* Deposit Modal */}
            {wallet && (
                <DepositModal
                    isOpen={isDepositModalOpen}
                    onClose={() => setIsDepositModalOpen(false)}
                    walletId={wallet.id}
                    availableBalance={wallet.availableBalance}
                    onSuccess={() => fetchDashboardData()}
                />
            )}

            {/* Withdraw Modal */}
            {wallet && (
                <WithdrawModal
                    isOpen={isWithdrawModalOpen}
                    onClose={() => setIsWithdrawModalOpen(false)}
                    walletId={wallet.id}
                    availableBalance={wallet.availableBalance}
                    onSuccess={() => fetchDashboardData()}
                />
            )}
        </div>
    );
}
