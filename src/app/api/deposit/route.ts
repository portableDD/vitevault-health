import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { Users, Wallets, Notifications, generateId } from '@/lib/indexedDB';
import { validateCard } from '@/lib/cardValidation';

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
        const {
            walletId,
            amount,
            cardNumber,
            expiry,
            cvv,
            fundingSource,
            schedule = 'one-time',
            lockSettings // { enabled, amount, durationDays, description }
        } = body;

        // Validation
        if (!walletId || !amount) {
            return NextResponse.json(
                { error: 'Wallet ID and amount are required' },
                { status: 400 }
            );
        }

        if (amount <= 0) {
            return NextResponse.json(
                { error: 'Amount must be greater than 0' },
                { status: 400 }
            );
        }

        let cardValidation: { valid: boolean, cardType?: string, error?: string } = { valid: true, cardType: 'None', error: '' };
        if (fundingSource !== 'balance') {
            const cardDetails = {
                number: cardNumber || body.cardDetails?.number,
                expiry: expiry || body.cardDetails?.expiry,
                cvv: cvv || body.cardDetails?.cvv
            };

            if (!cardDetails.number || !cardDetails.expiry || !cardDetails.cvv) {
                return NextResponse.json(
                    { error: 'Card details are required' },
                    { status: 400 }
                );
            }

            cardValidation = validateCard(cardDetails);
            if (!cardValidation.valid) {
                return NextResponse.json(
                    { error: cardValidation.error },
                    { status: 400 }
                );
            }
        }

        // Find wallet
        const wallet = Wallets.findById(walletId);
        if (!wallet) {
            return NextResponse.json(
                { error: 'Wallet not found' },
                { status: 404 }
            );
        }

        if (fundingSource === 'balance') {
            const currentLocked = wallet.lockedFunds.reduce((sum, f) => sum + (f.isActive ? f.amount : 0), 0);
            const availableBalance = wallet.balance - currentLocked;
            
            if (amount > availableBalance) {
                return NextResponse.json({ error: 'Insufficient available balance' }, { status: 400 });
            }

            // Just lock the funds
            const unlockDate = new Date();
            unlockDate.setFullYear(unlockDate.getFullYear() + 10);
            const existingLock = wallet.lockedFunds.find(f => f.isActive);
            if (existingLock) {
                existingLock.amount += amount;
                existingLock.description = lockSettings?.description || existingLock.description || 'Medical Reserve';
            } else {
                wallet.lockedFunds.push({
                    _id: generateId(),
                    amount: amount,
                    lockedAt: new Date().toISOString(),
                    unlocksAt: unlockDate.toISOString(),
                    isActive: true,
                    description: lockSettings?.description || 'Medical Reserve',
                });
            }

            wallet.transactions.push({
                _id: generateId(),
                amount,
                type: 'deposit',
                description: `Locked funds from Available Balance`,
                date: new Date().toISOString(),
                schedule: schedule,
                fromUserId: session.user.id,
            });

            Wallets.save(wallet);

            return NextResponse.json({ message: 'Funds locked successfully', balance: wallet.balance }, { status: 200 });
        }

        // Normal card deposit
        wallet.transactions.push({
            _id: generateId(),
            amount,
            type: 'deposit',
            description: `Deposit via ${cardValidation.cardType?.toUpperCase() || 'Card'} ending in ${body.cardDetails?.number?.slice(-4) || cardNumber?.slice(-4) || 'XXXX'}`,
            date: new Date().toISOString(),
            schedule: schedule,
            fromUserId: session.user.id,
        });
        wallet.balance += amount;

        // Handle Locked Funds — now decoupled from medications
        if (lockSettings?.enabled && lockSettings.amount) {
            const lockAmount = Number(lockSettings.amount);
            if (lockAmount > 0 && lockAmount <= wallet.balance) {
                const unlockDate = new Date();
                unlockDate.setFullYear(unlockDate.getFullYear() + 10);

                const existingLock = wallet.lockedFunds.find(f => f.isActive);
                
                if (existingLock) {
                    existingLock.amount += lockAmount;
                    existingLock.description = lockSettings.description || existingLock.description || 'Medical Reserve';
                } else {
                    wallet.lockedFunds.push({
                        _id: generateId(),
                        amount: lockAmount,
                        lockedAt: new Date().toISOString(),
                        unlocksAt: unlockDate.toISOString(),
                        isActive: true,
                        description: lockSettings.description || 'Medical Reserve',
                    });
                }
            }
        }

        Wallets.save(wallet);

        // Create notification for wallet owner (parent)
        Notifications.create({
            userId: wallet.owner,
            type: 'deposit',
            title: 'Deposit Received',
            message: `₦${amount.toLocaleString()} was deposited to your wallet via ${cardValidation.cardType || 'Card'}.`,
            read: false,
            data: {
                walletId: wallet._id,
                amount,
                fromUserId: session.user.id
            }
        });

        // Also notify the depositing child (if different from wallet owner)
        if (session.user.id !== wallet.owner) {
            const parentUser = Users.findById(wallet.owner);
            Notifications.create({
                userId: session.user.id,
                type: 'deposit',
                title: 'Deposit Confirmed',
                message: `Your deposit of ₦${amount.toLocaleString()} to ${parentUser?.name ?? 'wallet'} was successful.`,
                read: false,
                data: { walletId: wallet._id, amount }
            });
        }

        return NextResponse.json(
            {
                message: 'Deposit successful',
                balance: wallet.balance,
                transaction: {
                    amount,
                    type: 'deposit',
                    cardType: cardValidation.cardType,
                    schedule,
                },
            },
            { status: 200 }
        );
    } catch (error) {
        console.error('Deposit error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
