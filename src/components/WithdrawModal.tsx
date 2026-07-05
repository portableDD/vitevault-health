'use client';

import React, { useState } from 'react';
import { Modal, Input, Button } from './ui';
import { showError } from './ui/Toast';
import toast from 'react-hot-toast';

interface WithdrawModalProps {
    isOpen: boolean;
    onClose: () => void;
    walletId: string;
    availableBalance: number;
    onSuccess?: () => void;
}

export default function WithdrawModal({ isOpen, onClose, walletId, availableBalance, onSuccess }: WithdrawModalProps) {
    const [amount, setAmount] = useState<string>('');
    const [accountName, setAccountName] = useState('');
    const [accountNumber, setAccountNumber] = useState('');
    const [bankName, setBankName] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        const numAmount = Number(amount);

        if (!amount || numAmount <= 0) {
            showError('Please enter a valid amount');
            return;
        }

        if (numAmount > availableBalance) {
            showError(`Amount exceeds available balance of ₦${availableBalance.toLocaleString()}`);
            return;
        }

        if (!accountName || !accountNumber || !bankName) {
            showError('Please fill in bank details');
            return;
        }

        setIsLoading(true);

        try {
            const res = await fetch('/api/withdraw', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    walletId,
                    amount: numAmount,
                    bankAccount: `${bankName} (${accountNumber})`,
                }), // Mock saving the account name on the API
            });

            const data = await res.json();

            if (res.ok) {
                toast.success('Withdrawal successful!', { icon: '📤' });
                onSuccess?.();
                onClose();
                setAmount('');
                setAccountName('');
                setAccountNumber('');
                setBankName('');
            } else {
                showError(data.error || 'Withdrawal failed');
            }
        } catch {
            showError('Network error. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Withdraw Funds">
            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="bg-blue-50 p-3 rounded-lg border border-blue-100 flex justify-between items-center mb-4">
                    <span className="text-sm font-medium text-blue-900">Available to Withdraw:</span>
                    <span className="text-lg font-bold text-blue-700">₦{availableBalance.toLocaleString()}</span>
                </div>

                <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 font-medium mt-[14px]">
                        ₦
                    </span>
                    <Input
                        label="Amount to withdraw"
                        type="tel"
                        placeholder="0.00"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value.replace(/\D/g, ''))}
                        min="100"
                        max={availableBalance}
                        required
                        className="pl-8 text-lg font-semibold"
                    />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="md:col-span-2">
                        <Input
                            label="Account Number"
                            placeholder="e.g. 0123456789"
                            type="text"
                            value={accountNumber}
                            onChange={(e) => setAccountNumber(e.target.value.replace(/\D/g, '').slice(0, 10))}
                            required
                        />
                    </div>
                    <Input
                        label="Bank Name"
                        placeholder="e.g. GTBank"
                        type="text"
                        value={bankName}
                        onChange={(e) => setBankName(e.target.value)}
                        required
                    />
                    <Input
                        label="Account Name"
                        placeholder="e.g. John Doe"
                        type="text"
                        value={accountName}
                        onChange={(e) => setAccountName(e.target.value)}
                        required
                    />
                </div>

                <div className="bg-amber-50 p-3 rounded-lg border border-amber-100 mt-2">
                    <p className="text-xs text-amber-800">
                        <span className="font-semibold">Note:</span> You can only withdraw from your available balance. Locked funds are reserved exclusively for medication payments.
                    </p>
                </div>

                <Button
                    type="submit"
                    className="w-full flex justify-center items-center py-3"
                    isLoading={isLoading}
                    disabled={isLoading || !amount || !accountNumber || !bankName || !accountName}
                >
                    {isLoading ? 'Processing...' : `Withdraw ₦${Number(amount || 0).toLocaleString()}`}
                </Button>
            </form>
        </Modal>
    );
}
