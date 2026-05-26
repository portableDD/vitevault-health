import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { Users, Wallets, Medications, Notifications, generateId } from '@/lib/indexedDB';

// GET all medications for a wallet
export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user) {
            return NextResponse.json(
                { error: 'Unauthorized. Please login.' },
                { status: 401 }
            );
        }

        const { searchParams } = new URL(request.url);
        const walletId = searchParams.get('walletId');

        let rawMedications;
        if (walletId) {
            rawMedications = Medications.findByWalletId(walletId, true);
        } else {
            // Return all medications for user's wallet
            const wallet = Wallets.findByOwner(session.user.id);
            rawMedications = wallet ? Medications.findByWalletId(wallet._id, true) : [];
        }

        const medications = rawMedications.map((med) => ({
            ...med,
            countdownDays: Medications.getDaysRemaining(med),
        }));

        return NextResponse.json({ medications });
    } catch (error) {
        console.error('Get medications error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}

// POST create new medication — automatically sends refill request to pharmacy
export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user) {
            return NextResponse.json(
                { error: 'Unauthorized. Please login.' },
                { status: 401 }
            );
        }

        const body = await request.json();
        const { name, description, quantity, usageRate, refillCost, walletId, pharmacyId } = body;

        // Validation
        if (!name || !quantity || !usageRate || !refillCost || !walletId) {
            return NextResponse.json(
                { error: 'Name, quantity, usage rate, refill cost, and wallet ID are required' },
                { status: 400 }
            );
        }

        // Verify wallet exists
        const wallet = Wallets.findById(walletId);
        if (!wallet) {
            return NextResponse.json(
                { error: 'Wallet not found' },
                { status: 404 }
            );
        }

        // Get the parent user (wallet owner)
        const parent = Users.findById(wallet.owner);
        if (!parent) {
            return NextResponse.json(
                { error: 'Parent user not found' },
                { status: 404 }
            );
        }

        // Find connected pharmacies
        const pharmacies = Users.findByIdsAndRole(parent.links || [], 'pharmacy');

        if (pharmacies.length === 0) {
            return NextResponse.json(
                { error: 'No connected pharmacy. Please connect to a pharmacy first before adding medications.' },
                { status: 400 }
            );
        }

        // Use specified pharmacy or first connected pharmacy
        const targetPharmacyId = pharmacyId || pharmacies[0]._id;
        const targetPharmacy = pharmacies.find(p => p._id === targetPharmacyId) || pharmacies[0];

        // Create medication with pending_approval status (NOT approved yet)
        const medication = Medications.create({
            name,
            description,
            remainingQty: quantity,
            totalQty: quantity,
            usageRate,
            refillCost,
            walletId,
            pharmacyId: targetPharmacy._id,
            lastRefillDate: '',
            isActive: true,
            // ✅ KEY: Medication starts as pending_approval — pharmacy must approve first
            refillStatus: 'pending_approval',
            refillRequestedAt: new Date().toISOString(),
            refillRequestedBy: parent._id,
            // Countdown does NOT start yet
            countdownActive: false,
        });

        // Notify the pharmacy about the new medication request
        Notifications.create({
            userId: targetPharmacy._id,
            type: 'refill',
            title: 'New Medication Request',
            message: `${parent.name} has added a new medication "${name}" and is requesting approval. Refill cost: ₦${refillCost.toLocaleString()}.`,
            read: false,
            data: {
                medicationId: medication._id,
                parentId: parent._id,
                walletId: wallet._id,
                amount: refillCost,
            },
        });

        // Notify the parent that request was sent
        Notifications.create({
            userId: parent._id,
            type: 'refill',
            title: 'Medication Request Sent',
            message: `Your medication "${name}" request has been sent to ${targetPharmacy.name} for approval.`,
            read: false,
            data: {
                medicationId: medication._id,
                pharmacyName: targetPharmacy.name,
            },
        });

        const countdownDays = Math.floor(quantity / usageRate);

        return NextResponse.json(
            {
                message: `Medication "${name}" added! Refill request sent to ${targetPharmacy.name} for approval.`,
                medication: {
                    ...medication,
                    countdownDays,
                },
            },
            { status: 201 }
        );
    } catch (error) {
        console.error('Create medication error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
