'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Modal, Input, Button } from './ui';
import { showDeposit, showError } from './ui/Toast';

interface DepositModalProps {
    isOpen: boolean;
    onClose: () => void;
    walletId: string;
    availableBalance?: number;
    onSuccess?: (amount: number) => void;
}

type DepositStep = 'amount' | 'payment' | 'lock' | 'review';

const presetAmounts = [1000, 2000, 5000, 10000, 20000, 50000];

export default function DepositModal({ isOpen, onClose, walletId, availableBalance, onSuccess }: DepositModalProps) {
    const [cardNumber, setCardNumber] = useState('');
    const [expiry, setExpiry] = useState('');
    const [cvv, setCvv] = useState('');
    const [amount, setAmount] = useState(5000);
    const [depositStep, setDepositStep] = useState<DepositStep>('amount');
    const [fundingSource, setFundingSource] = useState<'card' | 'balance'>('card');

    const [isLoading, setIsLoading] = useState(false);
    const [showConfetti, setShowConfetti] = useState(false);

    // Lock State
    const [lockOption, setLockOption] = useState<'all' | 'partial'>('all');
    const [lockDescription, setLockDescription] = useState('Medical Reserve');
    const [lockAmount, setLockAmount] = useState(0);

    // Format card number with spaces
    const formatCardNumber = (value: string) => {
        const cleaned = value.replace(/\D/g, '').slice(0, 16);
        const groups = cleaned.match(/.{1,4}/g);
        return groups ? groups.join(' ') : cleaned;
    };

    // Format expiry as MM/YY
    const formatExpiry = (value: string) => {
        const cleaned = value.replace(/\D/g, '').slice(0, 4);
        if (cleaned.length >= 2) {
            return `${cleaned.slice(0, 2)}/${cleaned.slice(2)}`;
        }
        return cleaned;
    };

    const handleSubmit = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        setIsLoading(true);

        const finalLockAmount = lockOption === 'all' ? amount : lockAmount;

        try {
            const res = await fetch('/api/deposit', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    walletId,
                    amount,
                    fundingSource,
                    ...(fundingSource === 'card' ? {
                        cardNumber: cardNumber.replace(/\s/g, ''),
                        expiry,
                        cvv,
                    } : {}),
                    schedule: 'one-time',
                    lockSettings: {
                        enabled: true,
                        description: lockDescription,
                        amount: finalLockAmount
                    }
                }),
            });

            const data = await res.json();

            if (res.ok) {
                setShowConfetti(true);
                showDeposit(amount);

                setTimeout(() => {
                    setShowConfetti(false);
                    onSuccess?.(amount);
                    onClose();
                    // Reset form
                    setCardNumber('');
                    setExpiry('');
                    setCvv('');
                    setAmount(5000);
                    setDepositStep('amount');
                    setFundingSource('card');
                    setLockOption('all');
                    setLockDescription('Medical Reserve');
                    setLockAmount(0);
                }, 2000);
            } else {
                showError(data.error || 'Deposit failed');
            }
        } catch {
            showError('Network error. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    // Confetti particles
    const ConfettiParticle = ({ delay, x }: { delay: number; x: number }) => (
        <motion.div
            initial={{ y: -20, x, opacity: 1, rotate: 0 }}
            animate={{
                y: 400,
                opacity: 0,
                rotate: 360,
                x: x + (Math.random() - 0.5) * 100,
            }}
            transition={{ duration: 2, delay, ease: 'easeOut' }}
            className="absolute top-0 w-3 h-3 rounded-sm"
            style={{
                background: ['#007BFF', '#28A745', '#FFC107', '#DC3545', '#6C757D'][
                    Math.floor(Math.random() * 5)
                ],
            }}
        />
    );

    // ── Step navigation helpers ──
    const depositSteps: DepositStep[] = fundingSource === 'balance' 
        ? ['amount', 'payment', 'review'] 
        : ['amount', 'payment', 'lock', 'review'];
    const currentStepIndex = depositSteps.indexOf(depositStep);

    const canGoNext = () => {
        switch (depositStep) {
            case 'amount':
                return amount > 0;
            case 'payment':
                if (fundingSource === 'balance') return amount <= (availableBalance || 0);
                return !!cardNumber && !!expiry && !!cvv;
            case 'lock':
                const minLock = amount * 0.2;
                if (!lockDescription) return false;
                if (lockOption === 'partial' && (!lockAmount || lockAmount < minLock || lockAmount > amount)) return false;
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
        <Modal isOpen={isOpen} onClose={onClose} title="Make a Deposit">
            <AnimatePresence>
                {showConfetti && (
                    <div className="absolute inset-0 overflow-hidden pointer-events-none z-50">
                        {Array.from({ length: 50 }).map((_, i) => (
                            <ConfettiParticle key={i} delay={i * 0.02} x={(i / 50) * 400 - 50} />
                        ))}
                    </div>
                )}
            </AnimatePresence>

            <div className="space-y-5">
                {/* Step Indicator */}
                <div className="flex items-center justify-between mb-2">
                    {depositSteps.map((step, i) => (
                        <div key={step} className="flex items-center flex-1">
                            <div className="flex flex-col items-center flex-1">
                                <div
                                    className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300 ${i < currentStepIndex
                                            ? 'bg-green-500 text-white'
                                            : i === currentStepIndex
                                                ? 'bg-primary text-white shadow-lg shadow-blue-200'
                                                : 'bg-gray-200 text-neutral-dark'
                                        }`}
                                >
                                    {i < currentStepIndex ? '✓' : i + 1}
                                </div>
                                <span className={`text-[10px] mt-1 font-medium ${i === currentStepIndex ? 'text-primary' : 'text-gray-500'
                                    }`}>
                                    {stepLabels[step]}
                                </span>
                            </div>
                            {i < depositSteps.length - 1 && (
                                <div className={`h-0.5 flex-1 mx-1 rounded-full transition-all duration-300 ${i < currentStepIndex ? 'bg-green-500' : 'bg-gray-200'
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
                        >
                            <div>
                                <label className="block text-sm font-medium text-neutral-dark mb-3">
                                    Select Amount
                                </label>
                                <div className="grid grid-cols-3 gap-2 mb-4">
                                    {presetAmounts.map((preset) => (
                                        <button
                                            key={preset}
                                            type="button"
                                            onClick={() => setAmount(preset)}
                                            className={`py-2 px-3 rounded-lg text-sm font-medium transition-all duration-200 ${amount === preset
                                                ? 'bg-primary text-white shadow-lg scale-105'
                                                : 'bg-amber-100 text-amber-800 hover:bg-amber-200'
                                                }`}
                                        >
                                            ₦{preset.toLocaleString()}
                                        </button>
                                    ))}
                                </div>
                                <div className="relative">
                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-dark font-medium">
                                        ₦
                                    </span>
                                    <input
                                        type="tel"
                                        value={amount}
                                        onChange={(e) => setAmount(Number(e.target.value.replace(/\D/g, '')))}
                                        className="w-full pl-8 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary focus:border-primary bg-white text-lg font-semibold"
                                        min={100}
                                        max={1000000}
                                    />
                                </div>
                            </div>
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
                                <label className="block text-sm font-medium text-neutral-dark mb-2">
                                    Funding Source
                                </label>
                                <div className="grid grid-cols-2 gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setFundingSource('card')}
                                        className={`p-3 rounded-xl border-2 text-left transition-all ${fundingSource === 'card'
                                            ? 'border-primary bg-primary/5'
                                            : 'border-gray-200 hover:border-gray-300'
                                        }`}
                                    >
                                        <p className="text-sm font-semibold text-neutral-dark">Card</p>
                                        <p className="text-xs text-gray-500">Pay with debit/credit card</p>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setFundingSource('balance')}
                                        className={`p-3 rounded-xl border-2 text-left transition-all ${fundingSource === 'balance'
                                            ? 'border-primary bg-primary/5'
                                            : 'border-gray-200 hover:border-gray-300'
                                        }`}
                                    >
                                        <p className="text-sm font-semibold text-neutral-dark">Available Balance</p>
                                        <p className="text-xs text-gray-500">₦{(availableBalance || 0).toLocaleString()}</p>
                                    </button>
                                </div>
                                {fundingSource === 'balance' && amount > (availableBalance || 0) && (
                                    <p className="text-xs text-red-500 mt-2">
                                        Insufficient available balance for this deposit amount.
                                    </p>
                                )}
                            </div>

                            {fundingSource === 'card' && (
                                <div className="space-y-4">
                                    <Input
                                        label="Card Number"
                                        placeholder="4242 4242 4242 4242"
                                        value={cardNumber}
                                        onChange={(e) => setCardNumber(formatCardNumber(e.target.value))}
                                        required
                                        leftIcon={
                                            <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                                            </svg>
                                        }
                                    />

                                    <div className="grid grid-cols-2 gap-4">
                                        <Input
                                            label="Expiry"
                                            placeholder="MM/YY"
                                            value={expiry}
                                            onChange={(e) => setExpiry(formatExpiry(e.target.value))}
                                            required
                                        />
                                        <Input
                                            label="CVV"
                                            placeholder="123"
                                            type="password"
                                            value={cvv}
                                            onChange={(e) => setCvv(e.target.value.replace(/\D/g, '').slice(0, 4))}
                                            required
                                        />
                                    </div>

                                    <p className="text-xs text-center text-gray-500">
                                        Demo mode: Use card starting with &quot;4&quot; for successful deposit
                                    </p>
                                </div>
                            )}
                        </motion.div>
                    )}

                    {/* ── Step 3: Lock Funds ── */}
                    {depositStep === 'lock' && (
                        <motion.div
                            key="lock"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            transition={{ duration: 0.2 }}
                        >
                            <div className="p-4 bg-gray-50 rounded-xl border border-gray-200">
                                <div className="mb-4">
                                    <h3 className="font-semibold text-neutral-dark">Lock Funds (Mandatory 20% Min)</h3>
                                    <p className="text-xs text-gray-500">A minimum of 20% must be reserved for medical purposes</p>
                                </div>

                                <motion.div
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: 'auto', opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    className="overflow-hidden space-y-3"
                                >
                                    {/* Lock all or partial */}
                                    <div>
                                                <label className="block text-sm font-medium text-neutral-dark mb-2">
                                                    How much to lock?
                                                </label>
                                                <div className="grid grid-cols-2 gap-2">
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            setLockOption('all');
                                                            setLockAmount(amount);
                                                        }}
                                                        className={`p-3 rounded-xl border-2 text-left transition-all ${lockOption === 'all'
                                                                ? 'border-primary bg-primary/5'
                                                                : 'border-gray-200 hover:border-gray-300'
                                                            }`}
                                                    >
                                                        <p className="text-sm font-semibold text-neutral-dark">Lock All</p>
                                                        <p className="text-xs text-gray-500">₦{amount.toLocaleString()}</p>
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            setLockOption('partial');
                                                            setLockAmount(Math.max(lockAmount, amount * 0.2));
                                                        }}
                                                        className={`p-3 rounded-xl border-2 text-left transition-all ${lockOption === 'partial'
                                                                ? 'border-primary bg-primary/5'
                                                                : 'border-gray-200 hover:border-gray-300'
                                                            }`}
                                                    >
                                                        <p className="text-sm font-semibold text-neutral-dark">Partial Amount</p>
                                                        <p className="text-xs text-gray-500">Choose how much</p>
                                                    </button>
                                                </div>
                                            </div>

                                            {/* Partial amount input */}
                                            {lockOption === 'partial' && (
                                                <Input
                                                    label={`Amount to Lock (Min ₦${(amount * 0.2).toLocaleString()})`}
                                                    type="tel"
                                                    value={lockAmount}
                                                    onChange={(e) => setLockAmount(Number(e.target.value.replace(/\D/g, '')))}
                                                    min={amount * 0.2}
                                                    max={amount}
                                                    required
                                                    className="bg-white"
                                                />
                                            )}

                                            <Input
                                                label="Description (What is this lock for?)"
                                                placeholder="e.g. Healthcare fund"
                                                value={lockDescription}
                                                onChange={(e) => setLockDescription(e.target.value)}
                                                required
                                                className="bg-white"
                                            />
                                            <p className="text-xs text-blue-600 bg-blue-50 p-2 rounded">
                                                Locked funds can only be charged directly by pharmacies for medications.
                                            </p>
                                        </motion.div>
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
                                <div className="p-4 bg-primary/5 border-b border-gray-200">
                                    <p className="text-sm font-medium text-gray-500">Deposit Summary</p>
                                </div>
                                <div className="p-4 space-y-3">
                                    <div className="flex justify-between">
                                        <span className="text-sm text-gray-500">Amount</span>
                                        <span className="text-lg font-bold text-primary">
                                            ₦{amount.toLocaleString()}
                                        </span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-sm text-gray-500">Source</span>
                                        <span className="text-sm font-medium text-neutral-dark">
                                            {fundingSource === 'card' ? `•••• ${cardNumber.slice(-4)}` : 'Available Balance'}
                                        </span>
                                    </div>
                                    <>
                                        <hr className="border-gray-100" />
                                        <div className="flex justify-between">
                                            <span className="text-sm text-gray-500">🔒 Lock Amount</span>
                                            <span className="text-sm font-bold text-amber-600">
                                                ₦{(fundingSource === 'balance' ? amount : (lockOption === 'all' ? amount : lockAmount)).toLocaleString()}
                                            </span>
                                        </div>
                                        {fundingSource !== 'balance' && (
                                            <div className="flex justify-between">
                                                <span className="text-sm text-gray-500">Lock Description</span>
                                                <span className="text-sm font-medium text-neutral-dark">{lockDescription}</span>
                                            </div>
                                        )}
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
                            type="submit"
                            variant="primary"
                            className="flex-1 py-4 text-lg"
                            disabled={isLoading || (fundingSource === 'card' && (!cardNumber || !expiry || !cvv))}
                            onClick={() => handleSubmit()}
                        >
                            {isLoading ? (
                                <span className="flex items-center justify-center gap-2">
                                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                    </svg>
                                    Processing...
                                </span>
                            ) : (
                                `Deposit ₦${amount.toLocaleString()}`
                            )}
                        </Button>
                    )}
                </div>
            </div>
        </Modal>
    );
}
