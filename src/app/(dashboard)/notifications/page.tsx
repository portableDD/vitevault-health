'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, Button, Skeleton } from '@/components/ui';
import { useRealtime } from '@/hooks/useRealtime';
import toast from 'react-hot-toast';

interface Notification {
    id: string;
    type: 'deposit' | 'deduction' | 'refill' | 'connection' | 'system';
    title: string;
    message: string;
    timestamp: string;
    read: boolean;
    icon?: string;
}

// Get icon based on notification type
const getNotificationIcon = (type: string): string => {
    switch (type) {
        case 'deposit': return '📥';
        case 'deduction': return '📤';
        case 'refill': return '💊';
        case 'connection': return '🤝';
        case 'system': return '🔔';
        default: return '📢';
    }
};

export default function NotificationsPage() {
    const router = useRouter();
    const { data: session } = useSession();
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<'all' | 'unread'>('all');

    // Handle incoming real-time notifications
    const handleNotification = useCallback((data: { id: string; type: string; title: string; message: string; timestamp: string }) => {
        const newNotification: Notification = {
            id: data.id || `notif_${Date.now()}`,
            type: data.type as Notification['type'],
            title: data.title,
            message: data.message,
            timestamp: data.timestamp,
            read: false,
            icon: getNotificationIcon(data.type),
        };

        // Add to the top of the list
        setNotifications((prev) => [newNotification, ...prev]);

        // Show toast for new notification
        toast(data.message, {
            icon: getNotificationIcon(data.type),
            duration: 4000,
        });
    }, []);

    // Handle balance updates as notifications
    const handleBalanceUpdate = useCallback((data: { type: 'deposit' | 'deduction'; amount: number; newBalance: number; timestamp: string }) => {
        const title = data.type === 'deposit' ? 'Deposit Received' : 'Auto-Deduction';
        const message = data.type === 'deposit'
            ? `₦${data.amount.toLocaleString()} was deposited to your wallet`
            : `₦${data.amount.toLocaleString()} was deducted from your wallet`;

        const newNotification: Notification = {
            id: `balance_${Date.now()}`,
            type: data.type,
            title,
            message,
            timestamp: data.timestamp,
            read: false,
            icon: data.type === 'deposit' ? '📥' : '📤',
        };

        setNotifications((prev) => [newNotification, ...prev]);

        toast(message, {
            icon: data.type === 'deposit' ? '📥' : '📤',
            duration: 4000,
        });
    }, []);

    // Handle refill alerts
    const handleRefillAlert = useCallback((data: { medicationName: string; daysRemaining: number; timestamp: string }) => {
        const newNotification: Notification = {
            id: `refill_${Date.now()}`,
            type: 'refill',
            title: 'Medication Refill Alert',
            message: `${data.medicationName} has ${data.daysRemaining} days remaining`,
            timestamp: data.timestamp,
            read: false,
            icon: '💊',
        };

        setNotifications((prev) => [newNotification, ...prev]);

        toast(`${data.medicationName} needs attention!`, {
            icon: '💊',
            duration: 4000,
        });
    }, []);

    // Connect to SSE for real-time updates
    const { isConnected, connectionError } = useRealtime({
        userId: session?.user?.id || '',
        onNotification: handleNotification,
        onBalanceUpdate: handleBalanceUpdate,
        onRefillAlert: handleRefillAlert,
        onConnect: () => console.log('Connected to real-time notifications'),
        onDisconnect: () => console.log('Disconnected from real-time notifications'),
    });

    useEffect(() => {
        const fetchNotifications = async () => {
            try {
                const res = await fetch('/api/notifications');
                if (res.ok) {
                    const data = await res.json();
                    // map DB notification to UI interface
                    const formatted = data.notifications.map((n: any) => ({
                        id: n._id,
                        type: n.type,
                        title: n.title,
                        message: n.message,
                        timestamp: n.createdAt,
                        read: n.read,
                        icon: getNotificationIcon(n.type),
                    }));
                    setNotifications(formatted);
                }
            } catch (error) {
                console.error('Failed to fetch notifications:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchNotifications();
    }, []);

    const markAsRead = async (id: string) => {
        // Optimistic update
        setNotifications((prev) =>
            prev.map((n) => (n.id === id ? { ...n, read: true } : n))
        );

        try {
            await fetch('/api/notifications', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ notificationIds: [id] }),
            });
        } catch (error) {
            console.error('Failed to mark as read:', error);
        }
    };

    const markAllAsRead = async () => {
        // Optimistic update
        setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));

        try {
            await fetch('/api/notifications', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ markAll: true }),
            });
        } catch (error) {
            console.error('Failed to mark all as read:', error);
        }
    };

    const getTypeColor = (type: string) => {
        switch (type) {
            case 'deposit':
                return 'bg-green-100 border-green-500';
            case 'deduction':
                return 'bg-red-100 border-red-500';
            case 'refill':
                return 'bg-amber-100 border-amber-500';
            case 'connection':
                return 'bg-blue-100 border-blue-500';
            default:
                return 'bg-gray-100 border-gray-500';
        }
    };

    const formatTime = (timestamp: string) => {
        const date = new Date(timestamp);
        const now = new Date();
        const diff = now.getTime() - date.getTime();
        const minutes = Math.floor(diff / 60000);
        const hours = Math.floor(diff / 3600000);
        const days = Math.floor(diff / 86400000);

        if (minutes < 60) return `${minutes}m ago`;
        if (hours < 24) return `${hours}h ago`;
        if (days < 7) return `${days}d ago`;
        return date.toLocaleDateString('en-NG', { month: 'short', day: 'numeric' });
    };

    const filteredNotifications = notifications.filter((n) =>
        filter === 'all' ? true : !n.read
    );

    const unreadCount = notifications.filter((n) => !n.read).length;

    if (loading) {
        return (
            <div className="min-h-screen bg-neutral-light p-6">
                <div className="max-w-2xl mx-auto space-y-4">
                    <Skeleton className="h-20 rounded-xl" />
                    {[1, 2, 3, 4].map((i) => (
                        <Skeleton key={i} className="h-24 rounded-xl" />
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-neutral-light p-6">
            <div className="max-w-2xl mx-auto">
                {/* Connection Error Banner */}
                {connectionError && (
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-center gap-2 text-amber-700"
                    >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                        <span className="text-sm">{connectionError}</span>
                    </motion.div>
                )}

                {/* Header */}
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center justify-between mb-6"
                >
                    <div>
                        <button
                            onClick={() => router.back()}
                            className="flex items-center gap-2 text-gray-500 hover:text-gray-900 mb-2 transition-colors"
                        >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                            </svg>
                            Back
                        </button>
                        <div className="flex items-center gap-2">
                            <h1 className="text-3xl font-bold text-neutral-dark">Notifications</h1>
                            {/* Real-time connection indicator */}
                            <div className="flex items-center gap-1" title={isConnected ? 'Live updates active' : 'Connecting...'}>
                                <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`} />
                                <span className="text-xs text-gray-400">
                                    {isConnected ? 'Live' : 'Offline'}
                                </span>
                            </div>
                        </div>
                        <p className="text-gray-500">
                            {unreadCount > 0 ? `${unreadCount} unread` : 'All caught up!'}
                        </p>
                    </div>
                    {unreadCount > 0 && (
                        <Button variant="outline" onClick={markAllAsRead}>
                            Mark all as read
                        </Button>
                    )}
                </motion.div>

                {/* Filter Tabs */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="flex gap-2 mb-6"
                >
                    {(['all', 'unread'] as const).map((f) => (
                        <button
                            key={f}
                            onClick={() => setFilter(f)}
                            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${filter === f
                                ? 'bg-primary text-white'
                                : 'bg-white text-gray-600 hover:bg-gray-100'
                                }`}
                        >
                            {f === 'all' ? 'All' : `Unread (${unreadCount})`}
                        </button>
                    ))}
                </motion.div>

                {/* Notifications List */}
                {filteredNotifications.length === 0 ? (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                    >
                        <Card className="p-12 text-center">
                            <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
                                <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                                </svg>
                            </div>
                            <h3 className="text-lg font-semibold text-neutral-dark mb-2">
                                {filter === 'unread' ? 'No unread notifications' : 'No notifications yet'}
                            </h3>
                            <p className="text-gray-500">
                                {filter === 'unread'
                                    ? 'You\'re all caught up!'
                                    : 'Notifications about your account will appear here'}
                            </p>
                        </Card>
                    </motion.div>
                ) : (
                    <div className="space-y-3">
                        <AnimatePresence>
                            {filteredNotifications.map((notification, index) => (
                                <motion.div
                                    key={notification.id}
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: 20 }}
                                    transition={{ delay: index * 0.05 }}
                                    onClick={() => markAsRead(notification.id)}
                                    className={`cursor-pointer ${!notification.read ? 'transform hover:scale-[1.01]' : ''}`}
                                >
                                    <Card
                                        className={`p-4 border-l-4 transition-all ${getTypeColor(notification.type)} ${!notification.read ? 'shadow-md' : 'opacity-75'
                                            }`}
                                    >
                                        <div className="flex items-start gap-4">
                                            <div className="text-2xl">{notification.icon}</div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-start justify-between gap-2">
                                                    <h3 className={`font-semibold ${!notification.read ? 'text-neutral-dark' : 'text-gray-600'}`}>
                                                        {notification.title}
                                                    </h3>
                                                    <span className="text-xs text-gray-400 whitespace-nowrap">
                                                        {formatTime(notification.timestamp)}
                                                    </span>
                                                </div>
                                                <p className="text-sm text-gray-600 mt-1">{notification.message}</p>
                                            </div>
                                            {!notification.read && (
                                                <div className="w-2 h-2 rounded-full bg-primary shrink-0 mt-2" />
                                            )}
                                        </div>
                                    </Card>
                                </motion.div>
                            ))}
                        </AnimatePresence>
                    </div>
                )}

                {/* Timeline View */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="mt-8"
                >
                    <h2 className="text-lg font-semibold text-neutral-dark mb-4">Activity Timeline</h2>
                    <div className="relative">
                        {/* Timeline line */}
                        <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-200" />

                        {notifications.slice(0, 5).map((notification, index) => (
                            <div key={notification.id} className="relative pl-10 pb-6 last:pb-0">
                                {/* Timeline dot */}
                                <div
                                    className={`absolute left-2.5 w-3 h-3 rounded-full ${!notification.read ? 'bg-primary' : 'bg-gray-300'
                                        }`}
                                />

                                <div className="text-sm">
                                    <span className="font-medium text-neutral-dark">{notification.title}</span>
                                    <span className="text-gray-400 ml-2">{formatTime(notification.timestamp)}</span>
                                </div>
                                <p className="text-sm text-gray-500 mt-0.5">{notification.message}</p>
                            </div>
                        ))}
                    </div>
                </motion.div>
            </div>
        </div>
    );
}
