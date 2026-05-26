'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Button, Card, CountdownTimer, Skeleton } from '@/components/ui';
import toast from 'react-hot-toast';
import Link from 'next/link';
import PaymentModal from '@/components/PaymentModal';

interface Medication {
    id: string;
    name: string;
    daysRemaining: number;
    totalDays: number;
    refillCost: number;
    status: string;
    refillStatus: string;
    countdownEndDate: string | null;
    countdownActive: boolean;
    isNew: boolean;
}

interface Patient {
    id: string;
    name: string;
    linkCode?: string;
    walletBalance: number;
    availableBalance: number;
    lockedFunds: number;
    medications: Medication[];
}

interface PendingRefill {
    id: string;
    patient: string;
    medication: string;
    amount: number;
    refillStatus: string;
    isNew: boolean;
}

interface DashboardData {
    user: {
        id: string;
        name: string;
        email: string;
        role: string;
        linkCode: string;
    };
    patients: Patient[];
    pendingRefills: PendingRefill[];
}

export default function PharmacyDashboard() {
    const { data: session, status } = useSession();
    const router = useRouter();
    const [loading, setLoading] = useState(true);

    const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
    const [processingId, setProcessingId] = useState<string | null>(null);

    // Payment Modal State
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [prefilledPayment, setPrefilledPayment] = useState({
        linkCode: '',
        medication: '',
        amount: 0
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

    const handleApprove = async (id: string, patient: string, medication: string) => {
        setProcessingId(id);

        try {
            const response = await fetch('/api/medication/refill-approve', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    medicationId: id,
                }),
            });

            const data = await response.json();

            if (!response.ok && response.status !== 402) {
                throw new Error(data.error || 'Approval failed');
            }

            if (response.status === 402) {
                toast.error(`Insufficient balance for ${patient}'s ${medication} refill.`);
            } else {
                toast.success(`Refill approved for ${patient}'s ${medication}! 💊`);
            }

            // Refresh dashboard data
            fetchDashboardData();
        } catch (error) {
            console.error('Approve error:', error);
            toast.error('Failed to approve refill');
        } finally {
            setProcessingId(null);
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
                <Skeleton className="h-48 rounded-2xl" />
                <Skeleton className="h-48 rounded-2xl" />
            </div>
        );
    }

    const patients = dashboardData?.patients || [];
    const pendingRefills = dashboardData?.pendingRefills || [];
    const totalMedications = patients.reduce((sum, p) => sum + p.medications.length, 0);
    const activeMedications = patients.reduce(
        (sum, p) => sum + p.medications.filter(m => m.status === 'active').length, 0
    );

    return (
        <div>
            {/* Welcome Header */}
            <div className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-2xl md:text-3xl font-bold text-[#343A40]">
                        Pharmacy Dashboard 🏥
                    </h1>
                    <p className="text-[#6C757D] mt-1">
                        Welcome back, {dashboardData?.user?.name || session?.user?.name}!
                    </p>
                </div>
                <div className="flex items-center gap-3 flex-wrap">
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

            {/* Quick Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                <Card className="text-center">
                    <p className="text-[#6C757D] text-sm mb-1">Connected Patients</p>
                    <p className="text-3xl font-bold text-[#007BFF]">{patients.length}</p>
                </Card>
                <Card className="text-center">
                    <p className="text-[#6C757D] text-sm mb-1">Pending Refills</p>
                    <p className="text-3xl font-bold text-[#FFC107]">{pendingRefills.length}</p>
                </Card>
                <Card className="text-center">
                    <p className="text-[#6C757D] text-sm mb-1">Active Medications</p>
                    <p className="text-3xl font-bold text-[#28A745]">{activeMedications}</p>
                </Card>
                <Card className="text-center">
                    <p className="text-[#6C757D] text-sm mb-1">Total Medications</p>
                    <p className="text-3xl font-bold text-[#343A40]">{totalMedications}</p>
                </Card>
            </div>

            {/* Pending Approvals */}
            <div className="mb-8">
                <h2 className="text-xl font-bold text-[#343A40] mb-4">
                    Pending Prescriptions & Refills
                </h2>

                {pendingRefills.length === 0 ? (
                    <Card className="text-center py-8">
                        <div className="text-4xl mb-2">✅</div>
                        <p className="text-[#6C757D]">No pending requests</p>
                    </Card>
                ) : (
                    <div className="space-y-3">
                        {pendingRefills.map((item) => (
                            <motion.div
                                key={item.id}
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ duration: 0.3 }}
                            >
                                <Card className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 bg-[#FFC107]/10 rounded-full flex items-center justify-center">
                                            <svg className="w-6 h-6 text-[#FFC107]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                            </svg>
                                        </div>
                                        <div>
                                            <p className="font-bold text-[#343A40]">{item.patient}</p>
                                            <p className="text-sm text-[#6C757D]">{item.medication}</p>
                                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium mt-1 ${
                                                item.isNew ? 'bg-purple-100 text-purple-800' : 'bg-amber-100 text-amber-800'
                                            }`}>
                                                {item.isNew ? '🆕 New Prescription' : '🔄 Refill Request'}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-4">
                                        <p className="text-lg font-bold text-[#28A745]">
                                            ₦{item.amount.toLocaleString()}
                                        </p>
                                        <Button
                                            variant="primary"
                                            size="sm"
                                            isLoading={processingId === item.id}
                                            onClick={() => handleApprove(item.id, item.patient, item.medication)}
                                        >
                                            ✅ Approve & Charge
                                        </Button>
                                    </div>
                                </Card>
                            </motion.div>
                        ))}
                    </div>
                )}
            </div>

            {/* Connected Patients with Active Medications */}
            <div>
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-bold text-[#343A40]">Connected Patients & Medications</h2>
                    <Link href="/connections">
                        <Button variant="outline" size="sm">
                            Manage Connections
                        </Button>
                    </Link>
                </div>

                {patients.length === 0 ? (
                    <Card className="text-center py-8">
                        <div className="text-4xl mb-2">👥</div>
                        <p className="text-[#6C757D] mb-2">No patients connected yet</p>
                        <p className="text-sm text-[#6C757D] mb-4">
                            Share your link code: <span className="font-mono font-bold text-[#007BFF]">{dashboardData?.user?.linkCode}</span>
                        </p>
                        <Link href="/connections">
                            <Button variant="primary" size="sm">
                                View Connections
                            </Button>
                        </Link>
                    </Card>
                ) : (
                    <div className="space-y-4">
                        {patients.map((patient) => (
                            <Card key={patient.id}>
                                <div className="flex items-center justify-between mb-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-12 h-12 bg-[#007BFF]/10 rounded-full flex items-center justify-center">
                                            <span className="text-[#007BFF] font-bold text-lg">{patient.name.charAt(0)}</span>
                                        </div>
                                        <div>
                                            <p className="font-bold text-[#343A40]">{patient.name}</p>
                                            <div className="text-xs text-[#6C757D] space-y-0.5">
                                                <p>Available: <span className="font-semibold text-[#28A745]">₦{patient.availableBalance.toLocaleString()}</span></p>
                                                <p>Locked: <span className="font-semibold text-[#FFC107]">₦{patient.lockedFunds.toLocaleString()}</span></p>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Active Medications Grid */}
                                {patient.medications.length === 0 ? (
                                    <div className="text-center py-4 bg-gray-50 rounded-xl">
                                        <p className="text-sm text-[#6C757D]">No active medications</p>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                                        {patient.medications.map((med) => (
                                            <div
                                                key={med.id}
                                                className="bg-gray-50 rounded-xl p-3 border border-gray-100"
                                            >
                                                <div className="flex flex-col items-center text-center">
                                                    <CountdownTimer
                                                        daysRemaining={med.daysRemaining}
                                                        totalDays={med.totalDays}
                                                        size="sm"
                                                        showLabel={false}
                                                        countdownEndDate={med.countdownEndDate}
                                                    />
                                                    <p className="text-xs font-semibold text-[#343A40] mt-2">{med.name}</p>
                                                    <p className="text-[10px] text-[#6C757D]">₦{med.refillCost.toLocaleString()}</p>
                                                    {/* Status and Actions */}
                                                    <div className="w-full mt-3">
                                                        {med.refillStatus === 'pending_approval' ? (
                                                            <>
                                                                <span className={`block text-[10px] font-medium px-1.5 py-0.5 rounded-full mb-1 ${
                                                                    med.isNew ? 'bg-purple-100 text-purple-800' : 'bg-amber-100 text-amber-800'
                                                                }`}>
                                                                    {med.isNew ? '🆕 New Prescription' : '🔄 Refill Request'}
                                                                </span>
                                                                <Button 
                                                                    size="sm" 
                                                                    variant="primary" 
                                                                    className="w-full text-[10px] py-1 h-auto"
                                                                    isLoading={processingId === med.id}
                                                                    onClick={() => handleApprove(med.id, patient.name, med.name)}
                                                                >
                                                                    Approve & Charge
                                                                </Button>
                                                            </>
                                                        ) : med.status === 'active' ? (
                                                            <div className="space-y-1">
                                                                <span className="block text-[10px] font-medium bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full">
                                                                    ✓ Active
                                                                </span>
                                                                {med.countdownActive && (
                                                                    <span className="block text-[9px] font-medium bg-blue-100 text-blue-700 px-1 py-0.5 rounded-full">
                                                                        ⏱️ Countdown Running
                                                                    </span>
                                                                )}
                                                            </div>
                                                        ) : (
                                                            <span className="block text-[10px] font-medium bg-red-100 text-red-700 px-1.5 py-0.5 rounded-full">
                                                                ⚠ Depleted
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </Card>
                        ))}
                    </div>
                )}
            </div>

        </div>
    );
}
