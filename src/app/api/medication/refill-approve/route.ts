import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { Users, Wallets, Medications, Notifications, generateId } from '@/lib/indexedDB';

export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user || session.user.role !== 'pharmacy') {
            return NextResponse.json(
                { error: 'Unauthorized. Only pharmacies can approve refills.' },
                { status: 401 }
            );
        }

        const body = await request.json();
        const { medicationId } = body;

        if (!medicationId) {
            return NextResponse.json(
                { error: 'Medication ID is required' },
                { status: 400 }
            );
        }

        const medication = Medications.findById(medicationId);

        if (!medication) {
            return NextResponse.json(
                { error: 'Medication not found' },
                { status: 404 }
            );
        }

        if (medication.refillStatus !== 'pending_approval') {
            return NextResponse.json(
                { error: 'This medication does not have a pending refill request' },
                { status: 400 }
            );
        }

        // Get the wallet
        const wallet = Wallets.findById(medication.walletId);
        if (!wallet) {
            return NextResponse.json(
                { error: 'Associated wallet not found' },
                { status: 404 }
            );
        }

        // Deduct from locked funds
        const amount = medication.refillCost;
        const totalLocked = Wallets.getTotalLocked(wallet);

        if (totalLocked < amount) {
            return NextResponse.json({
                error: 'Insufficient locked funds. The patient needs to lock more funds before approval.',
                details: { lockedFunds: totalLocked, required: amount }
            }, { status: 400 });
        }

        // Deduct from locked funds (proportionally from active locks)
        let remainingToDeduct = amount;
        for (const lock of wallet.lockedFunds) {
            if (!lock.isActive || remainingToDeduct <= 0) continue;

            const deductFromThis = Math.min(lock.amount, remainingToDeduct);
            lock.amount -= deductFromThis;
            remainingToDeduct -= deductFromThis;

            if (lock.amount <= 0) {
                lock.isActive = false;
            }
        }

        // Deduct from total balance
        wallet.balance -= amount;

        // Record Transaction
        wallet.transactions.push({
            _id: generateId(),
            amount,
            type: 'deduction',
            description: `Pharmacy Charge: ${medication.name}`,
            date: new Date().toISOString(),
            schedule: 'one-time',
            fromUserId: session.user.id,
            medicationId: medication._id,
        });

        Wallets.save(wallet);

        // Calculate countdown end date (when medication will run out)
        const daysSupply = medication.usageRate > 0
            ? Math.floor(medication.totalQty / medication.usageRate)
            : 30;
        const countdownEndDate = new Date(Date.now() + daysSupply * 24 * 60 * 60 * 1000);

        // Update medication: approve and start countdown
        Medications.update(medicationId, {
            refillStatus: 'approved',
            countdownActive: true,
            countdownEndDate: countdownEndDate.toISOString(),
            remainingQty: medication.totalQty,
            lastRefillDate: new Date().toISOString(),
        });

        const updatedMed = Medications.findById(medicationId)!;

        // Notify the parent
        Notifications.create({
            userId: wallet.owner,
            type: 'refill',
            title: 'Medication Approved & Charged! 💊',
            message: `${session.user.name} approved your medication "${medication.name}". ₦${amount.toLocaleString()} was charged from locked funds. The countdown has started.`,
            read: false,
            data: {
                medicationId: medication._id,
                walletId: wallet._id,
                pharmacyId: session.user.id,
                daysSupply,
                amountCharged: amount,
            },
        });

        // Notify all linked children
        const parentUser = Users.findById(wallet.owner);
        if (parentUser?.links?.length) {
            const linkedChildren = Users.findByIdsAndRole(parentUser.links, 'child');
            for (const child of linkedChildren) {
                Notifications.create({
                    userId: child._id,
                    type: 'refill',
                    title: 'Medication Approved 💊',
                    message: `${parentUser.name}'s medication "${medication.name}" was approved by ${session.user.name}. ₦${amount.toLocaleString()} was charged from locked funds.`,
                    read: false,
                    data: {
                        medicationId: medication._id,
                        walletId: wallet._id,
                        amountCharged: amount,
                    }
                });
            }
        }

        return NextResponse.json({
            message: `Medication "${medication.name}" approved! Countdown started.`,
            medication: {
                id: updatedMed._id,
                name: updatedMed.name,
                refillStatus: updatedMed.refillStatus,
                remainingQty: updatedMed.remainingQty,
                countdownDays: daysSupply,
                countdownActive: updatedMed.countdownActive,
                countdownEndDate: updatedMed.countdownEndDate,
            },
        });
    } catch (error) {
        console.error('Refill approve error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
