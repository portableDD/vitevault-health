'use client';

import { ReactNode, useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOut, useSession } from 'next-auth/react';
import { motion, AnimatePresence } from 'framer-motion';


interface DashboardLayoutContentProps {
    children: ReactNode;
}

interface NotificationPreview {
    id: string;
    type: string;
    title: string;
    message: string;
    timestamp: string;
    read: boolean;
}

const getNotifIcon = (type: string) => {
    switch (type) {
        case 'deposit': return '💰';
        case 'deduction': return '💸';
        case 'refill': return '💊';
        case 'connection': return '🤝';
        default: return '🔔';
    }
};

const formatTimeAgo = (timestamp: string) => {
    const diff = Date.now() - new Date(timestamp).getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return new Date(timestamp).toLocaleDateString('en-NG', { month: 'short', day: 'numeric' });
};

export default function DashboardLayoutContent({ children }: DashboardLayoutContentProps) {
    const { data: session } = useSession();
    const pathname = usePathname();
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    // Notification state
    const [unreadCount, setUnreadCount] = useState(0);
    const [recentNotifications, setRecentNotifications] = useState<NotificationPreview[]>([]);
    const [showNotifDropdown, setShowNotifDropdown] = useState(false);

    const role = session?.user?.role || 'child';

    // Fetch unread notification count
    const fetchNotificationCount = useCallback(async () => {
        try {
            const res = await fetch('/api/notifications?limit=5');
            if (res.ok) {
                const data = await res.json();
                const notifs: NotificationPreview[] = (data.notifications || []).map((n: any) => ({
                    id: n._id,
                    type: n.type,
                    title: n.title,
                    message: n.message,
                    timestamp: n.createdAt,
                    read: n.read,
                }));
                setRecentNotifications(notifs);
                setUnreadCount(notifs.filter((n: NotificationPreview) => !n.read).length);
            }
        } catch {
            // Silently fail
        }
    }, []);

    useEffect(() => {
        fetchNotificationCount();
        // Poll every 30 seconds for new notifications
        const interval = setInterval(fetchNotificationCount, 30000);
        return () => clearInterval(interval);
    }, [fetchNotificationCount]);

    const navItems = {
        child: [
            { href: '/dashboard/child', label: 'Dashboard', icon: 'home' },
            { href: '/wallet', label: 'Wallet', icon: 'wallet' },
            { href: '/connections', label: 'Family Links', icon: 'link' },
            { href: '/notifications', label: 'Notifications', icon: 'bell' },
            { href: '/profile', label: 'Profile', icon: 'user' },
        ],
        parent: [
            { href: '/dashboard/parent', label: 'Dashboard', icon: 'home' },
            { href: '/connections', label: 'Connections', icon: 'link' },
            { href: '/notifications', label: 'Notifications', icon: 'bell' },
            { href: '/profile', label: 'Profile', icon: 'user' },
        ],
        pharmacy: [
            { href: '/dashboard/pharmacy', label: 'Dashboard', icon: 'home' },
            { href: '/connections', label: 'Patients', icon: 'users' },
            { href: '/notifications', label: 'Notifications', icon: 'bell' },
            { href: '/profile', label: 'Profile', icon: 'user' },
        ],
    };

    const currentNav = navItems[role as keyof typeof navItems] || navItems.child;

    const renderIcon = (icon: string) => {
        const icons: Record<string, ReactNode> = {
            home: (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                </svg>
            ),
            link: (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                </svg>
            ),
            bell: (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
            ),
            user: (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
            ),
            pill: (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                </svg>
            ),
            wallet: (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                </svg>
            ),
            users: (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
            ),
        };
        return icons[icon] || icons.home;
    };

    // Notification Bell Component
    const NotificationBell = ({ mobile = false }: { mobile?: boolean }) => (
        <div className="relative">
            <button
                onClick={() => setShowNotifDropdown(!showNotifDropdown)}
                className={`relative p-2 rounded-lg transition-colors ${mobile
                        ? 'hover:bg-gray-100'
                        : 'hover:bg-gray-100 text-[#6C757D]'
                    }`}
                aria-label="Notifications"
            >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
                {unreadCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 min-w-4.5 h-4.5 bg-[#DC3545] text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1 animate-pulse">
                        {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                )}
            </button>

            {/* Notification Dropdown */}
            <AnimatePresence>
                {showNotifDropdown && (
                    <>
                        {/* Backdrop to close dropdown */}
                        <div
                            className="fixed inset-0 z-40"
                            onClick={() => setShowNotifDropdown(false)}
                        />
                        <motion.div
                            initial={{ opacity: 0, y: -10, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: -10, scale: 0.95 }}
                            transition={{ duration: 0.15 }}
                            className={`absolute z-50 bg-white rounded-xl shadow-2xl border border-gray-200 overflow-hidden ${mobile ? 'right-0 top-12 w-80' : 'right-0 top-12 w-80'
                                }`}
                        >
                            {/* Header */}
                            <div className="p-4 border-b border-gray-100 flex items-center justify-between">
                                <div>
                                    <h3 className="font-bold text-[#343A40] text-sm">Notifications</h3>
                                    {unreadCount > 0 && (
                                        <p className="text-xs text-[#6C757D]">{unreadCount} unread</p>
                                    )}
                                </div>
                                {unreadCount > 0 && (
                                    <button
                                        onClick={async (e) => {
                                            e.stopPropagation();
                                            try {
                                                await fetch('/api/notifications', {
                                                    method: 'PATCH',
                                                    headers: { 'Content-Type': 'application/json' },
                                                    body: JSON.stringify({ markAll: true }),
                                                });
                                                setRecentNotifications(prev => prev.map(n => ({ ...n, read: true })));
                                                setUnreadCount(0);
                                            } catch { /* ignore */ }
                                        }}
                                        className="text-xs text-[#007BFF] hover:underline font-medium"
                                    >
                                        Mark all read
                                    </button>
                                )}
                            </div>

                            {/* Notification List */}
                            <div className="max-h-80 overflow-y-auto">
                                {recentNotifications.length === 0 ? (
                                    <div className="p-6 text-center">
                                        <div className="text-3xl mb-2">🔔</div>
                                        <p className="text-sm text-[#6C757D]">No notifications yet</p>
                                    </div>
                                ) : (
                                    recentNotifications.map((notif) => (
                                        <Link
                                            href="/notifications"
                                            key={notif.id}
                                            onClick={() => setShowNotifDropdown(false)}
                                            className={`block px-4 py-3 hover:bg-gray-50 transition-colors border-b border-gray-50 last:border-b-0 ${!notif.read ? 'bg-blue-50/50' : ''
                                                }`}
                                        >
                                            <div className="flex items-start gap-3">
                                                <span className="text-lg mt-0.5">{getNotifIcon(notif.type)}</span>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center justify-between gap-2">
                                                        <p className={`text-sm font-medium truncate ${!notif.read ? 'text-[#343A40]' : 'text-[#6C757D]'
                                                            }`}>
                                                            {notif.title}
                                                        </p>
                                                        {!notif.read && (
                                                            <div className="w-2 h-2 rounded-full bg-[#007BFF] shrink-0" />
                                                        )}
                                                    </div>
                                                    <p className="text-xs text-[#6C757D] truncate">{notif.message}</p>
                                                    <p className="text-[10px] text-[#6C757D] mt-0.5">{formatTimeAgo(notif.timestamp)}</p>
                                                </div>
                                            </div>
                                        </Link>
                                    ))
                                )}
                            </div>

                            {/* Footer */}
                            <Link
                                href="/notifications"
                                onClick={() => setShowNotifDropdown(false)}
                                className="block p-3 text-center text-sm font-medium text-[#007BFF] hover:bg-gray-50 border-t border-gray-100 transition-colors"
                            >
                                View All Notifications →
                            </Link>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </div>
    );

    return (
        <div className="min-h-screen bg-[#F8F9FA]">

            {/* Mobile Header */}
            <header className="lg:hidden bg-white shadow-sm sticky top-0 z-30">
                <div className="flex items-center justify-between px-4 py-3">
                    <Link href="/" className="flex items-center gap-2">
                        <div className="w-8 h-8 gradient-hero rounded-lg flex items-center justify-center">
                            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                            </svg>
                        </div>
                        <span className="text-lg font-bold text-[#343A40]">VitaVault</span>
                    </Link>

                    <div className="flex items-center gap-1">
                        {/* Mobile Notification Bell */}
                        <NotificationBell mobile />

                        <button
                            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                            className="p-2 rounded-lg hover:bg-gray-100"
                            aria-label="Toggle menu"
                        >
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                            </svg>
                        </button>
                    </div>
                </div>
            </header>

            <div className="flex">
                {/* Sidebar */}
                <aside
                    className={`
            fixed lg:sticky inset-y-0 left-0 z-40
            w-64 bg-white shadow-lg transform transition-transform duration-300
            lg:top-0 lg:h-screen lg:overflow-y-auto lg:shrink-0
            ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
          `}
                >
                    {/* Logo */}
                    <div className="hidden lg:flex items-center gap-2 p-6 border-b">
                        <div className="w-10 h-10 gradient-hero rounded-lg flex items-center justify-center">
                            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                            </svg>
                        </div>
                        <span className="text-xl font-bold text-[#343A40]">VitaVault</span>
                    </div>

                    {/* User Info */}
                    <div className="p-4 border-b">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-[#007BFF]/10 rounded-full flex items-center justify-center">
                                <span className="text-[#007BFF] font-bold">
                                    {session?.user?.name?.charAt(0) || 'U'}
                                </span>
                            </div>
                            <div>
                                <p className="font-medium text-[#343A40] text-sm">{session?.user?.name || 'User'}</p>
                                <p className="text-xs text-[#6C757D] capitalize">{role}</p>
                            </div>
                        </div>
                    </div>

                    {/* Navigation */}
                    <nav className="p-4">
                        <ul className="space-y-1">
                            {currentNav.map((item) => {
                                const isActive = pathname === item.href;
                                return (
                                    <li key={item.href}>
                                        <Link
                                            href={item.href}
                                            onClick={() => setIsSidebarOpen(false)}
                                            className={`
                        flex items-center gap-3 px-4 py-3 rounded-lg transition-colors relative
                        ${isActive
                                                    ? 'bg-[#007BFF] text-white'
                                                    : 'text-[#6C757D] hover:bg-gray-100'
                                                }
                      `}
                                        >
                                            {renderIcon(item.icon)}
                                            <span className="font-medium">{item.label}</span>
                                            {/* Unread badge on Notifications nav item */}
                                            {item.icon === 'bell' && unreadCount > 0 && (
                                                <span className={`ml-auto min-w-5 h-5 rounded-full text-[10px] font-bold flex items-center justify-center px-1 ${isActive
                                                        ? 'bg-white text-[#007BFF]'
                                                        : 'bg-[#DC3545] text-white'
                                                    }`}>
                                                    {unreadCount > 9 ? '9+' : unreadCount}
                                                </span>
                                            )}
                                        </Link>
                                    </li>
                                );
                            })}
                        </ul>
                    </nav>

                    {/* Logout */}
                    <div className="absolute bottom-0 left-0 right-0 p-4 border-t">
                        <button
                            onClick={() => signOut({ callbackUrl: '/' })}
                            className="flex items-center gap-3 px-4 py-3 w-full text-[#DC3545] hover:bg-red-50 rounded-lg transition-colors"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                            </svg>
                            <span className="font-medium">Sign Out</span>
                        </button>
                    </div>
                </aside>

                {/* Mobile Overlay */}
                {isSidebarOpen && (
                    <div
                        className="fixed inset-0 bg-black/50 z-30 lg:hidden"
                        onClick={() => setIsSidebarOpen(false)}
                    />
                )}

                {/* Main Content */}
                <main className="flex-1 min-h-screen lg:p-8 p-4">
                    {/* Desktop top bar with notification bell */}
                    <div className="hidden lg:flex items-center justify-end mb-4 gap-3">
                        <NotificationBell />
                    </div>

                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3 }}
                    >
                        {children}
                    </motion.div>
                </main>
            </div>
        </div>
    );
}
