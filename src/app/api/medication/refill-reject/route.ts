import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { Users, Wallets, Medications, Notifications } from '@/lib/indexedDB';
import { notifyRealtime } from '@/lib/realtime';

export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user || session.user.role !== 'pharmacy') {
            return NextResponse.json(
                { error: 'Unauthorized. Only pharmacies can reject refills.' },
                { status: 401 }
            );
        }

        const body = await request.json();
        const { medicationId, reason } = body;

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

        const wallet = Wallets.findById(medication.walletId);
        if (!wallet) {
            return NextResponse.json(
                { error: 'Associated wallet not found' },
                { status: 404 }
            );
        }

        const parent = Users.findById(wallet.owner);
        if (!parent) {
            return NextResponse.json(
                { error: 'Patient not found' },
                { status: 404 }
            );
        }

        const pharmacy = Users.findById(session.user.id);
        const linkedPatientIds = pharmacy?.links || [];
        if (!linkedPatientIds.includes(parent._id)) {
            return NextResponse.json(
                { error: 'You are not connected to this patient' },
                { status: 403 }
            );
        }

        const reasonText = reason?.trim() || 'No reason provided';

        // Always clear the pending request and stop the countdown. Reverting to
        // 'approved' here (for previously-approved meds) would leave countdownEndDate
        // unchanged and within the auto-refill trigger window, causing the dashboard's
        // auto-refill check to immediately re-flag it as pending again on the next load.
        Medications.update(medicationId, {
            refillStatus: 'none',
            countdownActive: false,
            refillRequestedAt: undefined,
            refillRequestedBy: undefined,
        });

        const updatedMed = Medications.findById(medicationId)!;

        Notifications.create({
            userId: parent._id,
            type: 'refill',
            title: 'Refill Request Declined',
            message: `${session.user.name} declined your request for "${medication.name}". Reason: ${reasonText}`,
            read: false,
            data: {
                medicationId: medication._id,
                pharmacyId: session.user.id,
                rejected: true,
                reason: reasonText,
            },
        });

        // Push a live update to the parent's dashboard if it's open, so the decline
        // shows up immediately instead of only after a manual reload.
        await notifyRealtime(request.url, 'notification', parent._id, {
            title: 'Refill Request Declined',
            message: `${session.user.name} declined your request for "${medication.name}". Reason: ${reasonText}`,
            notificationType: 'refill',
        });

        return NextResponse.json({
            message: `Refill request for "${medication.name}" was declined.`,
            medication: {
                id: updatedMed._id,
                name: updatedMed.name,
                refillStatus: updatedMed.refillStatus,
                countdownActive: updatedMed.countdownActive,
            },
        });
    } catch (error) {
        console.error('Refill reject error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
