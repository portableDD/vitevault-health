'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion, useScroll, useMotionValueEvent, AnimatePresence } from 'framer-motion';

const NAV_LINKS = [
  { href: '#how-it-works', label: 'How it works' },
  { href: '#roles', label: 'For everyone' },
] as const;

export default function HomeNavbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { scrollY } = useScroll();

  useMotionValueEvent(scrollY, 'change', (latest) => {
    setScrolled(latest > 24);
  });

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [mobileOpen]);

  return (
    <>
      <motion.header
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className={`fixed top-0 inset-x-0 z-50 transition-all duration-300 ${
          scrolled
            ? 'bg-white/80 backdrop-blur-xl border-b border-slate-200/80 shadow-sm shadow-slate-200/40'
            : 'bg-transparent'
        }`}
      >
        <div className="container-app">
          <nav className="flex items-center justify-between h-16 md:h-[4.5rem]">
            <Link href="/" className="flex items-center gap-2.5 group">
              <div className="w-9 h-9 rounded-xl bg-slate-900 flex items-center justify-center text-white font-bold text-sm group-hover:scale-105 transition-transform">
                V
              </div>
              <span className="text-lg font-bold text-slate-900 tracking-tight">
                Vita<span className="text-sky-500">Vault</span>
              </span>
            </Link>

            <div className="hidden md:flex items-center gap-8">
              {NAV_LINKS.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors"
                >
                  {link.label}
                </a>
              ))}
            </div>

            <div className="hidden md:flex items-center gap-3">
              <Link
                href="/login"
                className="text-sm font-medium text-slate-600 hover:text-slate-900 px-4 py-2 transition-colors"
              >
                Sign in
              </Link>
              <Link
                href="/signup"
                className="group relative px-5 py-2.5 rounded-full bg-slate-900 text-white text-sm font-semibold overflow-hidden shadow-md shadow-slate-900/15 hover:shadow-lg transition-all"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-sky-500 to-emerald-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                <span className="relative z-10">Get started</span>
              </Link>
            </div>

            <button
              type="button"
              onClick={() => setMobileOpen((o) => !o)}
              className="md:hidden p-2 rounded-lg text-slate-700 hover:bg-slate-100 transition-colors"
              aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
              aria-expanded={mobileOpen}
            >
              {mobileOpen ? (
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : (
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              )}
            </button>
          </nav>
        </div>
      </motion.header>

      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 md:hidden"
          >
            <div
              className="absolute inset-0 bg-slate-900/20 backdrop-blur-sm"
              onClick={() => setMobileOpen(false)}
            />
            <motion.div
              initial={{ y: -16, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -16, opacity: 0 }}
              className="absolute top-16 inset-x-4 rounded-2xl bg-white border border-slate-200 shadow-xl p-4"
            >
              <div className="flex flex-col gap-1">
                {NAV_LINKS.map((link) => (
                  <a
                    key={link.href}
                    href={link.href}
                    onClick={() => setMobileOpen(false)}
                    className="px-4 py-3 rounded-xl text-slate-700 font-medium hover:bg-slate-50 transition-colors"
                  >
                    {link.label}
                  </a>
                ))}
                <hr className="my-2 border-slate-100" />
                <Link
                  href="/login"
                  onClick={() => setMobileOpen(false)}
                  className="px-4 py-3 rounded-xl text-slate-700 font-medium hover:bg-slate-50 transition-colors"
                >
                  Sign in
                </Link>
                <Link
                  href="/signup"
                  onClick={() => setMobileOpen(false)}
                  className="mx-4 mt-2 py-3 rounded-full bg-slate-900 text-white text-center font-semibold"
                >
                  Get started
                </Link>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
