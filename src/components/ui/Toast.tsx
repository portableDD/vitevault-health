'use client';

import { Toaster, toast } from 'react-hot-toast';

// Custom toast wrapper with VitaVault styling
export const VitaToaster = () => {
    return (
        <Toaster
            position="top-right"
            gutter={12}
            containerStyle={{
                top: 80,
            }}
            toastOptions={{
                // Default options
                duration: 4000,
                style: {
                    background: 'var(--neutral-dark)',
                    color: 'white',
                    padding: '16px 20px',
                    borderRadius: '12px',
                    fontSize: '14px',
                    fontWeight: 500,
                    boxShadow: '0 10px 40px rgba(0, 0, 0, 0.2)',
                },
                // Success toast
                success: {
                    style: {
                        background: 'linear-gradient(135deg, #28A745 0%, #20c997 100%)',
                    },
                    iconTheme: {
                        primary: 'white',
                        secondary: '#28A745',
                    },
                },
                // Error toast
                error: {
                    style: {
                        background: 'linear-gradient(135deg, #DC3545 0%, #e74c3c 100%)',
                    },
                    iconTheme: {
                        primary: 'white',
                        secondary: '#DC3545',
                    },
                },
            }}
        />
    );
};

// Custom styled toasts
export const showSuccess = (message: string) => {
    toast.success(message, {
        icon: '✓',
    });
};

export const showError = (message: string) => {
    toast.error(message, {
        icon: '✕',
    });
};

export const showInfo = (message: string) => {
    toast(message, {
        icon: 'ℹ️',
        style: {
            background: 'linear-gradient(135deg, #007BFF 0%, #0056b3 100%)',
            color: 'white',
        },
    });
};

export const showWarning = (message: string) => {
    toast(message, {
        icon: '⚠️',
        style: {
            background: 'linear-gradient(135deg, #FFC107 0%, #ff9800 100%)',
            color: '#343A40',
        },
    });
};

export const showDeduction = (amount: number, medication: string) => {
    toast(`₦${amount.toLocaleString()} deducted for ${medication} refill`, {
        icon: '💊',
        duration: 5000,
        style: {
            background: 'linear-gradient(135deg, #6C757D 0%, #495057 100%)',
            color: 'white',
        },
    });
};

export const showDeposit = (amount: number) => {
    toast.success(`₦${amount.toLocaleString()} deposited successfully!`, {
        icon: '📥',
        duration: 5000,
    });
};

export { toast };
