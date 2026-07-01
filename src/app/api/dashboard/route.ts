import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { Users, Wallets, Medications, Notifications } from '@/lib/indexedDB';

// Helper: calculate days remaining from countdownEndDate or qty
function getDaysRemaining(med: { countdownEndDate?: string; remainingQty: number; usageRate: number }) {
    if (med.countdownEndDate) {
        const msLeft = new Date(med.countdownEndDate).getTime() - Date.now();
        if (msLeft <= 0) return 0;
        return Math.floor(msLeft / (1000 * 60 * 60 * 24));
    }
    return med.usageRate > 0 ? Math.floor(med.remainingQty / med.usageRate) : 999;
}

export async function GET() {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user) {
            return NextResponse.json(
                { error: 'Unauthorized. Please login.' },
                { status: 401 }
            );
        }

        const user = Users.findById(session.user.id);

        if (!user) {
            return NextResponse.json(
                { error: 'User not found' },
                { status: 404 }
            );
        }

        const role = user.role;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const dashboardData: Record<string, any> = {
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                linkCode: user.linkCode,
            },
            links: Users.findByIds(user.links || []),
        };

        if (role === 'parent') {
            // Get parent's wallet
            const wallet = Wallets.findByOwner(user._id);

            // Get all active medications linked to this wallet (pending, approved, or
            // none) — the dashboard UI already renders a badge/action per status, so
            // filtering to 'approved' only here hid newly-added or declined medications.
            const medications = wallet
                ? Medications.findByWalletId(wallet._id, true)
                : [];

            // Get linked children
            const children = Users.findByIdsAndRole(user.links || [], 'child');

            // Get linked pharmacies
            const pharmacies = Users.findByIdsAndRole(user.links || [], 'pharmacy');

            // Calculate last deposit
            let lastDeposit = null;
            if (wallet && wallet.transactions.length > 0) {
                const deposits = wallet.transactions.filter((t) => t.type === 'deposit');
                if (deposits.length > 0) {
                    const latest = deposits[deposits.length - 1];
                    lastDeposit = {
                        amount: latest.amount,
                        date: latest.date,
                        from: 'Deposit',
                    };
                }
            }

            // Get recent activity (last 10 transactions)
            const recentActivity = wallet
                ? wallet.transactions
                    .slice(-10)
                    .reverse()
                    .map((t) => ({
                        id: t._id,
                        amount: t.amount,
                        type: t.type,
                        description: t.description,
                        date: t.date,
                    }))
                : [];

            dashboardData.wallet = wallet ? {
                id: wallet._id,
                balance: wallet.balance,
                availableBalance: Wallets.getAvailableBalance(wallet),
                lockedFunds: Wallets.getTotalLocked(wallet),
                currency: wallet.currency,
                lastDeposit,
            } : null;

            dashboardData.medications = medications.map((med) => ({
                id: med._id,
                name: med.name,
                daysRemaining: getDaysRemaining(med),
                totalDays: med.usageRate > 0 ? Math.floor(med.totalQty / med.usageRate) : 30,
                refillCost: med.refillCost,
                remainingQty: med.remainingQty,
                refillStatus: med.refillStatus || 'none',
                countdownEndDate: med.countdownEndDate || null,
                countdownActive: med.countdownActive || false,
            }));

            dashboardData.children = children.map((child) => ({
                id: child._id,
                name: child.name,
                avatar: child.avatar || '👤',
            }));

            dashboardData.pharmacies = pharmacies.map((pharmacy) => ({
                id: pharmacy._id,
                name: pharmacy.name,
            }));

            dashboardData.recentActivity = recentActivity;

        } else if (role === 'child') {
            // Get linked parents with their wallets
            const parents = Users.findByIdsAndRole(user.links || [], 'parent');

            const parentsWithWallets = parents.map((parent) => {
                const wallet = Wallets.findByOwner(parent._id);

                // Get medications for this parent's wallet
                const medications = wallet
                    ? Medications.findByWalletId(wallet._id, true)
                    : [];

                // Calculate locked funds info
                const totalLocked = wallet ? Wallets.getTotalLocked(wallet) : 0;

                const activeLocks = wallet?.lockedFunds?.filter(
                    (l) => l.isActive
                ) || [];

                return {
                    id: parent._id,
                    name: parent.name,
                    avatar: parent.avatar || '👤',
                    walletId: wallet?._id || null,
                    balance: wallet?.balance || 0,
                    availableBalance: wallet ? Wallets.getAvailableBalance(wallet) : 0,
                    totalLocked,
                    lockedFunds: activeLocks.map((l) => ({
                        id: l._id,
                        amount: l.amount,
                        unlocksAt: l.unlocksAt,
                        description: l.description || '',
                    })),
                    medications: medications.map((med) => ({
                        id: med._id,
                        name: med.name,
                        daysRemaining: getDaysRemaining(med),
                        totalDays: med.usageRate > 0 ? Math.floor(med.totalQty / med.usageRate) : 30,
                        refillCost: med.refillCost,
                        countdownEndDate: med.countdownEndDate || null,
                    })),
                };
            });

            // Calculate total deposited by this child
            let totalDeposited = 0;
            let depositsThisMonth = 0;
            const now = new Date();
            const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

            for (const parent of parentsWithWallets) {
                if (parent.walletId) {
                    const wallet = Wallets.findById(parent.walletId);
                    if (wallet) {
                        const childDeposits = wallet.transactions.filter(
                            (t) =>
                                t.type === 'deposit' &&
                                t.fromUserId === session.user.id
                        );
                        totalDeposited += childDeposits.reduce((sum, t) => sum + t.amount, 0);
                        depositsThisMonth += childDeposits.filter(
                            (t) => new Date(t.date) >= startOfMonth
                        ).length;
                    }
                }
            }

            dashboardData.parents = parentsWithWallets;
            dashboardData.totalDeposited = totalDeposited;
            dashboardData.depositsThisMonth = depositsThisMonth;

        } else if (role === 'pharmacy') {
            // Get linked parents (patients)
            const patients = Users.findByIdsAndRole(user.links || [], 'parent');

            const patientsWithData = patients.map((patient) => {
                const wallet = Wallets.findByOwner(patient._id);
                // Show ALL active medications for connected patients
                const medications = wallet
                    ? Medications.findByWalletId(wallet._id, true)
                    : [];

                // ── Auto-refill generation logic (2 days before expiry) ──
                for (const med of medications) {
                    if (med.refillStatus === 'approved' && med.countdownActive) {
                        const daysLeft = getDaysRemaining(med);
                        const hoursSinceRefill = med.lastRefillDate
                            ? (Date.now() - new Date(med.lastRefillDate).getTime()) / (1000 * 60 * 60)
                            : Infinity;
                        // Require at least a day to pass since the last approval before
                        // re-flagging as pending — otherwise a freshly-approved medication
                        // with a short supply window gets immediately reset to pending on
                        // the very next dashboard load, wiping out the approval/countdown.
                        if (daysLeft <= 2 && hoursSinceRefill >= 24) {
                            med.refillStatus = 'pending_approval';
                            med.refillRequestedAt = new Date().toISOString();
                            med.countdownActive = false; // Pause countdown until approved and charged again
                            Medications.save(med);
                            
                            // Notify pharmacy
                            Notifications.create({
                                userId: user._id,
                                type: 'refill',
                                title: 'Auto-Refill Request',
                                message: `${patient.name}'s medication "${med.name}" is almost depleted. Auto-refill requested.`,
                                read: false,
                                data: { medicationId: med._id, amount: med.refillCost }
                            });
                        }
                    }
                }

                return {
                    id: patient._id,
                    name: patient.name,
                    linkCode: patient.linkCode,
                    walletBalance: wallet?.balance || 0,
                    availableBalance: wallet ? Wallets.getAvailableBalance(wallet) : 0,
                    lockedFunds: wallet ? Wallets.getTotalLocked(wallet) : 0,
                    medications: medications.map((med) => ({
                        id: med._id,
                        name: med.name,
                        daysRemaining: getDaysRemaining(med),
                        totalDays: med.usageRate > 0 ? Math.floor(med.totalQty / med.usageRate) : 30,
                        refillCost: med.refillCost,
                        status: med.refillStatus === 'pending_approval' ? 'pending' : med.remainingQty <= 0 ? 'depleted' : 'active',
                        refillStatus: med.refillStatus || 'none',
                        countdownEndDate: med.countdownEndDate || null,
                        countdownActive: med.countdownActive || false,
                        isNew: !med.lastRefillDate,
                    })),
                };
            });

            // Get pending refills — medications with refillStatus === 'pending_approval'
            const pendingRefills = patientsWithData.flatMap((patient) =>
                patient.medications
                    .filter((med) => med.refillStatus === 'pending_approval')
                    .map((med) => ({
                        id: med.id,
                        patient: patient.name,
                        medication: med.name,
                        amount: med.refillCost,
                        refillStatus: med.refillStatus,
                        isNew: med.isNew,
                    }))
            );

            dashboardData.patients = patientsWithData;
            dashboardData.pendingRefills = pendingRefills;
        }

        return NextResponse.json(dashboardData);
    } catch (error) {
        console.error('Dashboard data error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
