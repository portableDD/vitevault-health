'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Button, Card, Modal, Input, CountdownTimer, Skeleton } from '@/components/ui';
import { DEMO_CARDS, formatCardNumber } from '@/lib/cardValidation';
import toast from 'react-hot-toast';
import Link from 'next/link';
import FastForwardButton from '@/components/FastForwardButton';

interface Medication {
    id: string;
    name: string;
    daysRemaining: number;
    totalDays: number;
    refillCost: number;
}

interface LockedFund {
    id: string;
    medicationName: string;
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
    medications: Medication[];
}

interface DashboardData {
    user: {
        id: string;
        name: string;
        email: string;
        role: string;
        linkCode: string;
    };
    parents: Parent[];
    totalDeposited: number;
    depositsThisMonth: number;
}

// ── Deposit Modal Steps ──
type DepositStep = 'amount' | 'payment' | 'lock' | 'review';

export default function ChildDashboard() {
    const { data: session, status } = useSession();
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
    const [isDepositModalOpen, setIsDepositModalOpen] = useState(false);
    const [selectedParent, setSelectedParent] = useState<Parent | null>(null);
    const [isLoading, setIsLoading] = useState(false);


    // ── Deposit multi-step state ──
    const [depositStep, setDepositStep] = useState<DepositStep>('amount');
    const [fundingSource, setFundingSource] = useState<'card' | 'balance'>('card');
    const [depositForm, setDepositForm] = useState({
        amount: '',
        cardNumber: '',
        expiry: '',
        cvv: '',
    });

    // Lock settings inside deposit flow
    const [lockOption, setLockOption] = useState<'all' | 'partial'>('all');
    const [depositLockAmount, setDepositLockAmount] = useState('');

    const presetAmounts = [1000, 5000, 10000, 20000];

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

    const handleDeposit = (parent: Parent) => {
        if (!parent.walletId) {
            toast.error('This parent does not have a wallet yet');
            return;
        }
        setSelectedParent(parent);
        setDepositStep('amount');
        setDepositForm({ amount: '', cardNumber: '', expiry: '', cvv: '' });
        setLockOption('all');
        setDepositLockAmount('');
        setFundingSource('card');
        setIsDepositModalOpen(true);
    };

    const handleSubmitDeposit = async () => {
        if (fundingSource === 'card' && (!depositForm.amount || !depositForm.cardNumber || !depositForm.expiry || !depositForm.cvv)) {
            toast.error('Please fill all card details');
            return;
        }

        if (!selectedParent?.walletId) {
            toast.error('No wallet selected');
            return;
        }

        setIsLoading(true);

        const lockAmt = lockOption === 'all' ? parseInt(depositForm.amount) : parseInt(depositLockAmount) || 0;

        try {
            const response = await fetch('/api/deposit', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    walletId: selectedParent.walletId,
                    amount: parseInt(depositForm.amount),
                    fundingSource,
                    ...(fundingSource === 'card' ? {
                        cardDetails: {
                            number: depositForm.cardNumber.replace(/\s/g, ''),
                            expiry: depositForm.expiry,
                            cvv: depositForm.cvv,
                        }
                    } : {}),
                    schedule: 'one-time',
                    lockSettings: {
                        enabled: true,
                        amount: lockAmt,
                        description: 'Medical Reserve'
                    }
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Deposit failed');
            }

            toast.success(`₦${parseInt(depositForm.amount).toLocaleString()} deposited to ${selectedParent.name}'s wallet! 🎉`);
            setIsDepositModalOpen(false);
            setDepositForm({ amount: '', cardNumber: '', expiry: '', cvv: '' });

            fetchDashboardData();
        } catch (error) {
            console.error('Deposit error:', error);
            toast.error(error instanceof Error ? error.message : 'Deposit failed');
        } finally {
            setIsLoading(false);
        }
    };



    if (loading || status === 'loading') {
        return (
            <div className="space-y-6">
                <Skeleton className="h-12 w-64" />
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <Skeleton className="h-24 rounded-2xl" />
                    <Skeleton className="h-24 rounded-2xl" />
                    <Skeleton className="h-24 rounded-2xl" />
                    <Skeleton className="h-24 rounded-2xl" />
                </div>
                <Skeleton className="h-32 rounded-2xl" />
                <Skeleton className="h-32 rounded-2xl" />
            </div>
        );
    }

    const parents = dashboardData?.parents || [];
    const allMedications = parents.flatMap((p) => p.medications);
    const allLockedFunds = parents.flatMap(p =>
        (p.lockedFunds || []).map(l => ({ ...l, parentName: p.name, walletId: p.walletId || '' }))
    );
    const parentsWithWallet = parents.filter(p => p.walletId);

    // Aggregate wallet data across all parents
    const totalBalance = parents.reduce((s, p) => s + (p.balance || 0), 0);

    // ── Deposit step navigation helpers ──
    const depositSteps: DepositStep[] = fundingSource === 'balance' 
        ? ['amount', 'payment', 'review'] 
        : ['amount', 'payment', 'lock', 'review'];
    const currentStepIndex = depositSteps.indexOf(depositStep);

    const canGoNext = () => {
        switch (depositStep) {
            case 'amount':
                return !!depositForm.amount && parseInt(depositForm.amount) > 0;
            case 'payment':
                if (fundingSource === 'balance') return parseInt(depositForm.amount || '0') <= (selectedParent?.availableBalance || 0);
                return !!depositForm.cardNumber && !!depositForm.expiry && !!depositForm.cvv;
            case 'lock':
                if (lockOption === 'partial' && (!depositLockAmount || parseInt(depositLockAmount) < parseInt(depositForm.amount) * 0.2 || parseInt(depositLockAmount) > parseInt(depositForm.amount))) return false;
                return true;
            case 'review':
                return true;
            default:
                return false;
        }
    };

    const stepLabels: Record<DepositStep, string> = {
        amount: 'Amount',
        payment: 'Payment',
        lock: 'Lock Funds',
        review: 'Review',
    };

    return (
        <div>
            {/* Welcome Header */}
            <div className="mb-8">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                    <div>
                        <h1 className="text-2xl md:text-3xl font-bold text-[#343A40]">
                            Welcome Back, {dashboardData?.user?.name || session?.user?.name}! 👋
                        </h1>
                        <p className="text-[#6C757D] mt-1">
                            Manage your family&apos;s health with ease
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

            {/* Wallet Summary — Total Balance Only + Lock Funds Button */}
            <div className="rounded-2xl p-5 mb-8 text-white" style={{ background: 'linear-gradient(135deg, #007BFF 0%, #0056b3 50%, #003d80 100%)' }}>
                <div className="flex items-center justify-between">
                    <Link href="/wallet" className="flex-1 cursor-pointer">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm opacity-80">Total Balance</p>
                                <p className="text-3xl font-bold">₦{totalBalance.toLocaleString()}</p>
                            </div>
                            <div className="bg-white/15 rounded-full p-2">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                </svg>
                            </div>
                        </div>
                    </Link>
                </div>

            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                <Card className="text-center">
                    <p className="text-[#6C757D] text-sm mb-1">Linked Parents</p>
                    <p className="text-3xl font-bold text-[#007BFF]">{parents.length}</p>
                </Card>
                <Card className="text-center">
                    <p className="text-[#6C757D] text-sm mb-1">Total Deposited</p>
                    <p className="text-3xl font-bold text-[#28A745]">
                        ₦{((dashboardData?.totalDeposited || 0) / 1000).toFixed(0)}K
                    </p>
                </Card>
                <Card className="text-center">
                    <p className="text-[#6C757D] text-sm mb-1">Active Meds</p>
                    <p className="text-3xl font-bold text-[#FFC107]">{allMedications.length}</p>
                </Card>
                <Card className="text-center">
                    <p className="text-[#6C757D] text-sm mb-1">This Month</p>
                    <p className="text-3xl font-bold text-[#343A40]">{dashboardData?.depositsThisMonth || 0}</p>
                    <p className="text-xs text-[#6C757D]">deposits</p>
                </Card>
            </div>

            {/* Linked Parents */}
            <div className="mb-8">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-bold text-[#343A40]">Linked Parents</h2>
                    <Link href="/connections">
                        <Button variant="outline" size="sm">
                            Manage Connections
                        </Button>
                    </Link>
                </div>

                {parents.length === 0 ? (
                    <Card className="text-center py-8">
                        <div className="text-4xl mb-2">👨‍👩‍👧‍👦</div>
                        <p className="text-[#6C757D] mb-2">No parents connected yet</p>
                        <p className="text-sm text-[#6C757D] mb-4">
                            Ask your parent for their link code to connect
                        </p>
                        <Link href="/connections">
                            <Button variant="primary" size="sm">
                                Add Connection
                            </Button>
                        </Link>
                    </Card>
                ) : (
                    <div className="grid md:grid-cols-2 gap-4">
                        {parents.map((parent) => (
                            <motion.div
                                key={parent.id}
                                whileHover={{ scale: 1.02 }}
                                transition={{ duration: 0.2 }}
                            >
                                <Card hover>
                                    <div className="flex items-center justify-between mb-3">
                                        <div className="flex items-center gap-4">
                                            <div className="w-14 h-14 bg-[#007BFF]/10 rounded-full flex items-center justify-center text-3xl">
                                                {parent.avatar || '👤'}
                                            </div>
                                            <div>
                                                <p className="font-bold text-[#343A40]">{parent.name}</p>
                                                <p className="text-xs text-[#6C757D]">Total: ₦{parent.balance.toLocaleString()}</p>
                                            </div>
                                        </div>
                                    </div>
                                    <Button
                                        variant="primary"
                                        size="sm"
                                        onClick={() => handleDeposit(parent)}
                                        disabled={!parent.walletId}
                                    >
                                        Deposit
                                    </Button>
                                </Card>
                            </motion.div>
                        ))}
                    </div>
                )}
            </div>

            {/* Medication Alerts */}
            <div>
                <h2 className="text-xl font-bold text-[#343A40] mb-4">Medication Status</h2>

                {allMedications.length === 0 ? (
                    <Card className="text-center py-8">
                        <div className="text-4xl mb-2">💊</div>
                        <p className="text-[#6C757D]">No medications tracked yet</p>
                    </Card>
                ) : (
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {allMedications.map((med, index) => (
                            <Card key={`${med.id}-${index}`} className="flex items-center gap-4">
                                <CountdownTimer
                                    daysRemaining={med.daysRemaining}
                                    totalDays={med.totalDays}
                                    size="sm"
                                    showLabel={false}
                                />
                                <div>
                                    <p className="font-semibold text-[#343A40]">{med.name}</p>
                                    <p className="text-sm text-[#6C757D]">
                                        {med.daysRemaining} days remaining
                                    </p>
                                    <div className="mt-3">
                                        <FastForwardButton
                                            medicationId={med.id}
                                            medicationName={med.name}
                                            currentDays={med.daysRemaining}
                                            refillCost={med.refillCost}
                                            onUpdate={() => fetchDashboardData()}
                                        />
                                    </div>
                                </div>
                            </Card>
                        ))}
                    </div>
                )}
            </div>



            {/* ══════════ DEPOSIT MODAL (Multi-Stage) ══════════ */}
            <Modal
                isOpen={isDepositModalOpen}
                onClose={() => setIsDepositModalOpen(false)}
                title={`Deposit to ${selectedParent?.name}'s Wallet`}
                size="lg"
            >
                <div className="space-y-5">
                    {/* Step Indicator */}
                    <div className="flex items-center justify-between mb-2">
                        {depositSteps.map((step, i) => (
                            <div key={step} className="flex items-center flex-1">
                                <div className="flex flex-col items-center flex-1">
                                    <div
                                        className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300 ${i < currentStepIndex
                                            ? 'bg-[#28A745] text-white'
                                            : i === currentStepIndex
                                                ? 'bg-[#007BFF] text-white shadow-lg shadow-blue-200'
                                                : 'bg-gray-200 text-[#6C757D]'
                                            }`}
                                    >
                                        {i < currentStepIndex ? '✓' : i + 1}
                                    </div>
                                    <span className={`text-[10px] mt-1 font-medium ${i === currentStepIndex ? 'text-[#007BFF]' : 'text-[#6C757D]'
                                        }`}>
                                        {stepLabels[step]}
                                    </span>
                                </div>
                                {i < depositSteps.length - 1 && (
                                    <div className={`h-0.5 flex-1 mx-1 rounded-full transition-all duration-300 ${i < currentStepIndex ? 'bg-[#28A745]' : 'bg-gray-200'
                                        }`} />
                                )}
                            </div>
                        ))}
                    </div>

                    <AnimatePresence mode="wait">
                        {/* ── Step 1: Amount ── */}
                        {depositStep === 'amount' && (
                            <motion.div
                                key="amount"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                transition={{ duration: 0.2 }}
                                className="space-y-4"
                            >
                                <div>
                                    <label className="block text-sm font-medium text-[#343A40] mb-2">
                                        Quick Amount
                                    </label>
                                    <div className="flex flex-wrap gap-2">
                                        {presetAmounts.map((amount) => (
                                            <button
                                                key={amount}
                                                onClick={() => setDepositForm((prev) => ({ ...prev, amount: amount.toString() }))}
                                                className={`
                                                    px-4 py-2 rounded-lg border-2 font-medium transition-all
                                                    ${depositForm.amount === amount.toString()
                                                        ? 'border-[#FFC107] bg-[#FFC107]/10 text-[#343A40] shadow-md'
                                                        : 'border-gray-200 hover:border-[#FFC107] text-[#6C757D]'
                                                    }
                                                `}
                                            >
                                                ₦{amount.toLocaleString()}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <Input
                                    label="Or Enter Amount"
                                    type="tel"
                                    placeholder="Enter amount in Naira"
                                    value={depositForm.amount}
                                    onChange={(e) => setDepositForm((prev) => ({ ...prev, amount: e.target.value }))}
                                    leftIcon={<span className="text-[#6C757D]">₦</span>}
                                />

                                {depositForm.amount && parseInt(depositForm.amount) > 0 && (
                                    <div className="p-3 bg-blue-50 rounded-lg text-center">
                                        <p className="text-lg font-bold text-[#007BFF]">
                                            ₦{parseInt(depositForm.amount).toLocaleString()}
                                        </p>
                                        <p className="text-xs text-[#6C757D]">will be deposited</p>
                                    </div>
                                )}
                            </motion.div>
                        )}

                        {/* ── Step 2: Payment ── */}
                        {depositStep === 'payment' && (
                            <motion.div
                                key="payment"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                transition={{ duration: 0.2 }}
                                className="space-y-4"
                            >
                                <div className="mb-4">
                                    <label className="block text-sm font-medium text-[#343A40] mb-2">
                                        Funding Source
                                    </label>
                                    <div className="grid grid-cols-2 gap-2">
                                        <button
                                            type="button"
                                            onClick={() => setFundingSource('card')}
                                            className={`p-3 rounded-xl border-2 text-left transition-all ${fundingSource === 'card'
                                                ? 'border-[#007BFF] bg-[#007BFF]/5'
                                                : 'border-gray-200 hover:border-gray-300'
                                            }`}
                                        >
                                            <p className="text-sm font-semibold text-[#343A40]">Card</p>
                                            <p className="text-xs text-[#6C757D]">Pay with debit/credit card</p>
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setFundingSource('balance')}
                                            className={`p-3 rounded-xl border-2 text-left transition-all ${fundingSource === 'balance'
                                                ? 'border-[#007BFF] bg-[#007BFF]/5'
                                                : 'border-gray-200 hover:border-gray-300'
                                            }`}
                                        >
                                            <p className="text-sm font-semibold text-[#343A40]">Available Balance</p>
                                            <p className="text-xs text-[#6C757D]">₦{(selectedParent?.availableBalance || 0).toLocaleString()}</p>
                                        </button>
                                    </div>
                                    {fundingSource === 'balance' && parseInt(depositForm.amount || '0') > (selectedParent?.availableBalance || 0) && (
                                        <p className="text-xs text-red-500 mt-2">
                                            Insufficient available balance for this deposit amount.
                                        </p>
                                    )}
                                </div>

                                {fundingSource === 'card' && (
                                    <div className="p-4 bg-[#F8F9FA] rounded-lg">
                                        <p className="text-sm text-[#6C757D] mb-3">
                                            💳 Card Details (Demo - use test card: {DEMO_CARDS.visa})
                                        </p>

                                        <Input
                                            placeholder="Card Number"
                                            value={depositForm.cardNumber}
                                            onChange={(e) => setDepositForm((prev) => ({
                                                ...prev,
                                                cardNumber: formatCardNumber(e.target.value).slice(0, 19)
                                            }))}
                                            className="mb-3"
                                        />

                                        <div className="grid grid-cols-2 gap-3">
                                            <Input
                                                placeholder="MM/YY"
                                                value={depositForm.expiry}
                                                onChange={(e) => {
                                                    let value = e.target.value.replace(/\D/g, '');
                                                    if (value.length >= 2) {
                                                        value = value.slice(0, 2) + '/' + value.slice(2, 4);
                                                    }
                                                    setDepositForm((prev) => ({ ...prev, expiry: value }));
                                                }}
                                                maxLength={5}
                                            />
                                            <Input
                                                placeholder="CVV"
                                                type="password"
                                                value={depositForm.cvv}
                                                onChange={(e) => setDepositForm((prev) => ({
                                                    ...prev,
                                                    cvv: e.target.value.replace(/\D/g, '').slice(0, 4)
                                                }))}
                                                maxLength={4}
                                            />
                                        </div>
                                    </div>
                                )}
                            </motion.div>
                        )}

                        {/* ── Step 3: Lock Funds Option ── */}
                        {depositStep === 'lock' && (
                            <motion.div
                                key="lock"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                transition={{ duration: 0.2 }}
                                className="space-y-4"
                            >
                                <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                                    <div className="mb-4">
                                        <h3 className="font-semibold text-[#343A40]">Lock Funds (Mandatory 20% Min)</h3>
                                        <p className="text-xs text-[#6C757D]">A minimum of 20% must be reserved for medical purposes</p>
                                    </div>

                                    <div className="space-y-3">
                                        {/* Lock all or partial */}
                                        <div>
                                            <label className="block text-sm font-medium text-[#343A40] mb-2">
                                                How much to lock?
                                            </label>
                                            <div className="grid grid-cols-2 gap-2">
                                                <button
                                                    type="button"
                                                    onClick={() => setLockOption('all')}
                                                    className={`p-3 rounded-xl border-2 text-left transition-all ${lockOption === 'all'
                                                        ? 'border-[#007BFF] bg-[#007BFF]/5'
                                                        : 'border-gray-200 hover:border-gray-300'
                                                        }`}
                                                >
                                                    <p className="text-sm font-semibold text-[#343A40]">Lock All</p>
                                                    <p className="text-xs text-[#6C757D]">₦{parseInt(depositForm.amount || '0').toLocaleString()}</p>
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setLockOption('partial');
                                                        setDepositLockAmount(Math.max(Number(depositLockAmount) || 0, parseInt(depositForm.amount || '0') * 0.2).toString());
                                                    }}
                                                    className={`p-3 rounded-xl border-2 text-left transition-all ${lockOption === 'partial'
                                                        ? 'border-[#007BFF] bg-[#007BFF]/5'
                                                        : 'border-gray-200 hover:border-gray-300'
                                                        }`}
                                                >
                                                    <p className="text-sm font-semibold text-[#343A40]">Partial Amount</p>
                                                    <p className="text-xs text-[#6C757D]">Choose how much</p>
                                                </button>
                                            </div>
                                        </div>

                                        {/* Partial amount input */}
                                        {lockOption === 'partial' && (
                                            <Input
                                                label={`Amount to Lock (min ₦${(parseInt(depositForm.amount || '0') * 0.2).toLocaleString()})`}
                                                type="tel"
                                                placeholder="0.00"
                                                value={depositLockAmount}
                                                onChange={(e) => setDepositLockAmount(e.target.value.replace(/\D/g, ''))}
                                                min={parseInt(depositForm.amount || '0') * 0.2}
                                                max={parseInt(depositForm.amount || '0')}
                                                required
                                            />
                                        )}

                                        <p className="text-xs text-blue-600 bg-blue-50 p-2 rounded">
                                            Locked funds can only be charged directly by pharmacies for medications.
                                        </p>
                                    </div>
                                </div>
                            </motion.div>
                        )}

                        {/* ── Step 4: Review ── */}
                        {depositStep === 'review' && (
                            <motion.div
                                key="review"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                transition={{ duration: 0.2 }}
                                className="space-y-3"
                            >
                                <div className="rounded-xl border border-gray-200 overflow-hidden">
                                    <div className="p-4 bg-[#007BFF]/5 border-b border-gray-200">
                                        <p className="text-sm font-medium text-[#6C757D]">Deposit Summary</p>
                                    </div>
                                    <div className="p-4 space-y-3">
                                        <div className="flex justify-between">
                                            <span className="text-sm text-[#6C757D]">Recipient</span>
                                            <span className="text-sm font-semibold text-[#343A40]">{selectedParent?.name}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-sm text-[#6C757D]">Amount</span>
                                            <span className="text-lg font-bold text-[#007BFF]">
                                                ₦{parseInt(depositForm.amount || '0').toLocaleString()}
                                            </span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-sm text-[#6C757D]">Source</span>
                                            <span className="text-sm font-medium text-[#343A40]">
                                                {fundingSource === 'card' ? `•••• ${depositForm.cardNumber.slice(-4)}` : 'Available Balance'}
                                            </span>
                                        </div>
                                        <>
                                            <hr className="border-gray-100" />
                                            <div className="flex justify-between">
                                                <span className="text-sm text-[#6C757D]">🔒 Lock Amount</span>
                                                <span className="text-sm font-bold text-amber-600">
                                                    ₦{(fundingSource === 'balance' 
                                                        ? parseInt(depositForm.amount || '0') 
                                                        : (lockOption === 'all'
                                                            ? parseInt(depositForm.amount || '0')
                                                            : parseInt(depositLockAmount || '0')
                                                    )).toLocaleString()}
                                                </span>
                                            </div>
                                        </>
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Navigation Buttons */}
                    <div className="flex gap-3 pt-2">
                        {currentStepIndex > 0 && (
                            <Button
                                variant="outline"
                                className="flex-1"
                                onClick={() => setDepositStep(depositSteps[currentStepIndex - 1])}
                            >
                                Back
                            </Button>
                        )}
                        {depositStep !== 'review' ? (
                            <Button
                                variant="primary"
                                className="flex-1"
                                disabled={!canGoNext()}
                                onClick={() => setDepositStep(depositSteps[currentStepIndex + 1])}
                            >
                                Next →
                            </Button>
                        ) : (
                            <Button
                                variant="secondary"
                                size="lg"
                                className="flex-1"
                                isLoading={isLoading}
                                disabled={fundingSource === 'card' ? (!depositForm.cardNumber || !depositForm.expiry || !depositForm.cvv) : false}
                                onClick={handleSubmitDeposit}
                            >
                                {depositForm.amount
                                    ? `Deposit ₦${parseInt(depositForm.amount || '0').toLocaleString()}`
                                    : 'Enter Amount'
                                }
                            </Button>
                        )}
                    </div>
                </div>
            </Modal>
        </div>
    );
}
