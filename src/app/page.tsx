'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { motion, useScroll, useTransform, AnimatePresence, Variants } from 'framer-motion';
import HomeNavbar from '@/components/landing/HomeNavbar';

// --- Components ---

const FloatingElement = ({ delay, duration, x, y, children, className }: { delay: number, duration: number, x: number[], y: number[], children: React.ReactNode, className?: string }) => (
  <motion.div
    animate={{
      y: y,
      x: x,
      rotate: [0, 10, -10, 0],
    }}
    transition={{
      duration: duration,
      repeat: Infinity,
      repeatType: "reverse",
      ease: "easeInOut",
      delay: delay,
    }}
    className={`absolute pointer-events-none ${className}`}
  >
    {children}
  </motion.div>
);

const FeatureCard = ({ icon, title, description, delay }: { icon: React.ReactNode, title: string, description: string, delay: number }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-100px" }}
      transition={{ duration: 0.5, delay }}
      whileHover={{ y: -10, scale: 1.02 }}
      className="group relative p-8 rounded-3xl bg-white border border-slate-200 shadow-xl shadow-slate-200/50 overflow-hidden hover:shadow-2xl hover:shadow-sky-500/10 transition-all duration-300"
    >
      <div className="absolute inset-0 bg-gradient-to-tr from-sky-50 to-emerald-50 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

      <div className="relative z-10">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-sky-500 to-emerald-500 flex items-center justify-center mb-6 shadow-lg shadow-sky-500/20 group-hover:scale-110 transition-transform duration-300 text-white">
          {icon}
        </div>
        <h3 className="text-xl font-bold text-slate-900 mb-3 group-hover:text-sky-700 transition-colors">{title}</h3>
        <p className="text-slate-600 leading-relaxed group-hover:text-slate-700 transition-colors">
          {description}
        </p>
      </div>
    </motion.div>
  );
};

const RoleTab = ({ isActive, onClick, icon, title }: { isActive: boolean, onClick: () => void, icon: string, title: string }) => (
  <button
    onClick={onClick}
    className={`relative flex items-center gap-3 px-6 py-4 rounded-xl transition-all duration-300 ${isActive
      ? 'text-slate-900'
      : 'hover:bg-slate-200/50 text-slate-500 hover:text-slate-900'
      }`}
  >
    <span className="relative z-10 text-2xl">{icon}</span>
    <span className="relative z-10 font-semibold">{title}</span>
    {isActive && (
      <motion.div
        layoutId="activeTab"
        className="absolute inset-0 rounded-xl bg-white shadow-lg ring-1 ring-slate-200/50"
        transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
      />
    )}
  </button>
);

export default function Home() {
  const [activeRole, setActiveRole] = useState<'child' | 'parent' | 'pharmacy'>('child');
  const { scrollY } = useScroll();
  const y1 = useTransform(scrollY, [0, 500], [0, 200]);
  const y2 = useTransform(scrollY, [0, 500], [0, -150]);

  // Stagger Text variants
  const container: Variants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.3,
      },
    },
  };

  const item: Variants = {
    hidden: { y: 20, opacity: 0 },
    show: { y: 0, opacity: 1, transition: { type: "spring", stiffness: 50 } },
  };

  interface RoleData {
    title: string;
    desc: string;
    features: string[];
    color: string;
    icon: string;
  }

  const roleContent: Record<'child' | 'parent' | 'pharmacy', RoleData> = {
    child: {
      title: "For Caregivers & Children",
      desc: "Empower your caregiving with tools that make supporting your loved ones effortless.",
      features: ["Instant fund deposits", "Scheduled recurring support", "Real-time health monitoring"],
      color: "from-sky-500 to-blue-600",
      icon: "👨‍👧‍👦"
    },
    parent: {
      title: "For Parents",
      desc: "Maintain your independence with a secure health wallet and automated care.",
      features: ["Wallet balance tracking", "Medication alerts", "Automated refill requests"],
      color: "from-emerald-500 to-green-600",
      icon: "👴"
    },
    pharmacy: {
      title: "For Pharmacies",
      desc: "Streamline your operations with direct patient connections and guaranteed payments.",
      features: ["Direct patient management", "Automated payment processing", "Refill order dashboard"],
      color: "from-amber-500 to-orange-600",
      icon: "🏥"
    }
  };

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900 selection:bg-sky-200 font-sans overflow-x-hidden">
      <HomeNavbar />

      {/* Decorative Background Gradients */}
      <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] rounded-full bg-sky-200/40 blur-[120px] mix-blend-multiply animate-pulse" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] rounded-full bg-emerald-200/40 blur-[120px] mix-blend-multiply animate-pulse" style={{ animationDelay: '2s' }} />
        <div className="absolute top-[40%] left-[50%] -translate-x-1/2 w-[800px] h-[800px] rounded-full bg-indigo-200/30 blur-[150px] mix-blend-multiply" />
      </div>

      {/* --- HERO SECTION --- */}
      <section className="relative z-10 min-h-screen flex flex-col items-center justify-center px-6 pt-20 pb-32">

        {/* Animated Background Grid */}
        <div className="absolute inset-0 z-0 opacity-[0.4]"
          style={{
            backgroundImage: `radial-gradient(circle at 1px 1px, #e2e8f0 1px, transparent 0)`,
            backgroundSize: '40px 40px'
          }}>
        </div>

        {/* Floating Abstract Elements */}
        <FloatingElement delay={0} duration={6} x={[0, 20, 0]} y={[0, -20, 0]} className="top-[15%] left-[10%] hidden md:block">
          <svg className="w-24 h-24 text-sky-400/30" fill="currentColor" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" /></svg>
        </FloatingElement>
        <FloatingElement delay={2} duration={7} x={[0, -30, 0]} y={[0, 40, 0]} className="bottom-[20%] right-[10%] hidden md:block">
          <svg className="w-32 h-32 text-emerald-400/30" fill="currentColor" viewBox="0 0 24 24"><rect x="4" y="4" width="16" height="16" rx="4" /></svg>
        </FloatingElement>

        {/* Hero Content */}
        <motion.div
          variants={container}
          initial="hidden"
          animate="show"
          className="relative z-10 text-center max-w-5xl mx-auto"
        >
          {/* Badge */}
          <motion.div variants={item} className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white border border-slate-200 shadow-sm mb-8 hover:shadow-md transition-all cursor-default">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="text-sm font-medium text-slate-600 tracking-wide uppercase">The Future of Elderly Care</span>
          </motion.div>

          {/* Main Title */}
          <motion.h1
            variants={item}
            className="text-5xl md:text-7xl lg:text-8xl font-bold tracking-tight text-slate-900 mb-6 leading-[1.1]"
          >
            Care that feels <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-sky-500 via-emerald-500 to-teal-500 animate-gradient-x">
              secure & simple.
            </span>
          </motion.h1>

          <motion.p variants={item} className="text-lg md:text-xl text-slate-600 mb-10 max-w-2xl mx-auto leading-relaxed font-light">
            A digital sanctuary where families weave threads of care into a secure vault of health.
            Pre-deposit funds, track medications, and ensure peace of mind.
          </motion.p>

          <motion.div variants={item} className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Link href="/signup" className="group relative px-8 py-4 rounded-full bg-slate-900 text-white font-bold overflow-hidden shadow-lg shadow-slate-900/20 hover:shadow-xl hover:shadow-slate-900/30 transition-all">
              <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-sky-500 to-emerald-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              <span className="relative z-10">Start Your Vault</span>
            </Link>
            <Link href="/login" className="px-8 py-4 rounded-full border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-medium transition-all hover:border-slate-300 shadow-sm">
              Access Account
            </Link>
          </motion.div>

        </motion.div>

        {/* Scroll Indicator */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 2, duration: 1 }}
          className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2"
        >
          <span className="text-xs uppercase tracking-widest text-slate-400">Scroll</span>
          <motion.div
            animate={{ y: [0, 8, 0] }}
            transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
            className="w-1 h-12 rounded-full bg-gradient-to-b from-slate-200 via-slate-400 to-slate-200"
          />
        </motion.div>
      </section>

      {/* --- STATS SECTION --- */}
      <div className="w-full border-y border-slate-200 bg-white/50 backdrop-blur-sm">
        <div className="container-app py-10 grid grid-cols-2 md:grid-cols-4 gap-8 divide-x divide-slate-200">
          {[
            { label: "Families Secured", value: "500+" },
            { label: "Funds Protected", value: "₦2B+" },
            { label: "Pharmacies", value: "120+" },
            { label: "Uptime", value: "99.9%" }
          ].map((stat, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              viewport={{ once: true }}
              className="text-center px-4"
            >
              <div className="text-3xl md:text-4xl font-bold text-slate-900 mb-1">{stat.value}</div>
              <div className="text-sm text-slate-500 uppercase tracking-wider">{stat.label}</div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* --- HOW IT WORKS --- */}
      <section id="how-it-works" className="relative py-32 px-6 scroll-mt-24">
        <div className="container-app mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center max-w-3xl mx-auto mb-20"
          >
            <h2 className="text-3xl md:text-5xl font-bold text-slate-900 mb-6">Seamless Health Management</h2>
            <p className="text-slate-600 text-lg">
              VitaVault connects the dots between care, finance, and health in three simple steps.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8 relative">
            {/* Connecting line for large screens */}
            <div className="hidden md:block absolute top-1/2 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-slate-200 to-transparent -translate-y-1/2" />

            <FeatureCard
              delay={0}
              title="Pre-Deposit Funds"
              description="Securely deposit funds into your family wallet. Set automated recurring transfers so you never have to worry."
              icon={
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              }
            />
            <FeatureCard
              delay={0.2}
              title="Real-time Tracking"
              description="Monitor medication levels with smart countdowns. Get instant alerts when supplies are running low."
              icon={
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              }
            />
            <FeatureCard
              delay={0.4}
              title="Auto-Deduction"
              description="Funds are automatically released to pharmacies when refills are needed. Zero friction, total security."
              icon={
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              }
            />
          </div>
        </div>
      </section>

      {/* --- ROLE SELECTOR --- */}
      <section id="roles" className="py-24 px-6 bg-white relative overflow-hidden scroll-mt-24">
        <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-[0.03]" />

        <div className="container-app mx-auto relative z-10">
          <div className="flex flex-col items-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-8 text-center">Built for Every Role</h2>

            {/* Tabs */}
            <div className="flex flex-wrap justify-center gap-4 p-2 rounded-2xl bg-slate-100 border border-slate-200">
              {(['child', 'parent', 'pharmacy'] as const).map((role) => (
                <RoleTab
                  key={role}
                  isActive={activeRole === role}
                  onClick={() => setActiveRole(role)}
                  icon={roleContent[role].icon}
                  title={role.charAt(0).toUpperCase() + role.slice(1)}
                />
              ))}
            </div>
          </div>

          {/* Dynamic Content */}
          <div className="max-w-4xl mx-auto">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeRole}
                initial={{ opacity: 0, y: 20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -20, scale: 0.95 }}
                transition={{ duration: 0.4 }}
                className="relative overflow-hidden rounded-3xl bg-white border border-slate-200 p-8 md:p-12 shadow-2xl shadow-slate-200/50"
              >
                <div className={`absolute top-0 right-0 w-[400px] h-[400px] bg-gradient-to-b ${roleContent[activeRole].color} opacity-[0.07] blur-[100px] rounded-full translate-x-1/2 -translate-y-1/2 pointer-events-none`} />

                <div className="relative z-10 flex flex-col md:flex-row gap-8 items-center md:items-start">
                  <div className="flex-1 text-center md:text-left">
                    <h3 className="text-3xl font-bold text-slate-900 mb-4">{roleContent[activeRole].title}</h3>
                    <p className="text-slate-600 text-lg mb-8">{roleContent[activeRole].desc}</p>

                    <ul className="space-y-4">
                      {roleContent[activeRole].features.map((feature, i) => (
                        <motion.li
                          key={i}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: i * 0.1 }}
                          className="flex items-center gap-3 text-slate-700"
                        >
                          <span className="flex-shrink-0 w-6 h-6 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 text-sm">✓</span>
                          {feature}
                        </motion.li>
                      ))}
                    </ul>
                  </div>

                  <div className="flex-shrink-0 w-full md:w-1/3 aspect-square rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center text-8xl shadow-inner text-slate-900">
                    {roleContent[activeRole].icon}
                  </div>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </section>

      {/* --- CTA SECTION --- */}
      <section className="py-32 px-6 relative overflow-hidden">
        <div className="absolute inset-0 bg-slate-50" />
        <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-[0.05]" />

        <div className="container-app mx-auto relative z-10 text-center max-w-4xl">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="p-12 rounded-[2.5rem] bg-white border border-slate-200 shadow-2xl shadow-slate-200/50 overflow-hidden relative"
          >
            {/* Glow effect */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[1px] bg-gradient-to-r from-transparent via-sky-300 to-transparent" />
            <div className="absolute bottom-0 right-0 w-64 h-64 bg-emerald-100/50 blur-[80px] rounded-full" />

            <h2 className="text-4xl md:text-6xl font-bold text-slate-900 mb-6">Start Your Vault Today</h2>
            <p className="text-slate-600 text-xl mb-10 max-w-2xl mx-auto">
              Ready to provide the care your loved ones deserve? Join thousands of families already using VitaVault.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/signup" className="group relative px-8 py-4 rounded-xl bg-slate-900 text-white font-bold overflow-hidden shadow-xl shadow-slate-900/10 hover:shadow-2xl hover:shadow-sky-900/20 hover:scale-105 transition-all duration-300">
                <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-sky-500 to-emerald-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                <span className="relative z-10">Create Free Account</span>
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* --- FOOTER --- */}
      <footer className="py-12 px-6 border-t border-slate-200 bg-white">
        <div className="container-app mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-900 flex items-center justify-center text-white font-bold text-xl">
              V
            </div>
            <span className="text-xl font-bold text-slate-900 tracking-tight">Vita<span className="text-sky-500">Vault</span></span>
          </div>

          <div className="text-slate-500 text-sm">
            &copy; {new Date().getFullYear()} VitaVault Health. Built for families.
          </div>

          <div className="flex gap-6">
            {['Privacy', 'Terms', 'Contact'].map((item) => (
              <a key={item} href="#" className="text-slate-500 hover:text-slate-900 transition-colors text-sm font-medium">
                {item}
              </a>
            ))}
          </div>
        </div>
      </footer>
    </main>
  );
}
