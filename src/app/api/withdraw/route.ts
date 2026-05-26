import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { Users, Wallets, Notifications, generateId } from '@/lib/indexedDB';

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
        const { walletId, amount, bankAccount } = body;

        if (!walletId || !amount || amount <= 0 || !bankAccount) {
            return NextResponse.json(
                { error: 'Wallet ID, valid amount, and bank details are required' },
                { status: 400 }
            );
        }

        // Find wallet
        const wallet = Wallets.findById(walletId);
        if (!wallet) {
            return NextResponse.json(
                { error: 'Wallet not found' },
                { status: 404 }
            );
        }

        // Verify ownership
        if (wallet.owner !== session.user.id) {
            return NextResponse.json(
                { error: 'You do not have permission to withdraw from this wallet.' },
                { status: 403 }
            );
        }

        // Parent can only withdraw from AVAILABLE balance (not locked)
        const availableBalance = Wallets.getAvailableBalance(wallet);

        if (amount > availableBalance) {
            return NextResponse.json(
                { 
                    error: 'Insufficient available balance. You cannot withdraw locked funds.',
                    details: { available: availableBalance, requested: amount, locked: Wallets.getTotalLocked(wallet) }
                },
                { status: 400 }
            );
        }

        // Deduct from wallet balance
        wallet.balance -= amount;

        // Record Transaction
        wallet.transactions.push({
            _id: generateId(),
            amount,
            type: 'deduction',
            description: `Withdrawal to ${bankAccount}`,
            date: new Date().toISOString(),
            schedule: 'one-time',
            fromUserId: session.user.id,
        });

        // Save wallet
        Wallets.save(wallet);

        // Notify the parent (wallet owner)
        Notifications.create({
            userId: wallet.owner,
            type: 'deduction',
            title: 'Withdrawal Successful',
            message: `₦${amount.toLocaleString()} was successfully withdrawn to ${bankAccount}.`,
            read: false,
            data: {
                walletId: wallet._id,
                amount,
            }
        });

        // Notify all linked children
        const parentUser = Users.findById(wallet.owner);
        if (parentUser?.links?.length) {
            const linkedChildren = Users.findByIdsAndRole(parentUser.links, 'child');
            for (const child of linkedChildren) {
                Notifications.create({
                    userId: child._id,
                    type: 'deduction',
                    title: 'Wallet Withdrawal',
                    message: `${parentUser.name} withdrew ₦${amount.toLocaleString()} from their wallet.`,
                    read: false,
                    data: { walletId: wallet._id, amount }
                });
            }
        }

        return NextResponse.json(
            {
                message: 'Withdrawal successful',
                balance: wallet.balance,
                transaction: {
                    amount,
                    type: 'deduction',
                    description: `Withdrawal to ${bankAccount}`,
                },
            },
            { status: 200 }
        );
    } catch (error) {
        console.error('Withdrawal error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
