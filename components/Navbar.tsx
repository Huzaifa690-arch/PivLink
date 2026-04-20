'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { usePrivy } from '@privy-io/react-auth';
import { useSolanaAddress } from '@/lib/privy';

function NavbarStatic() {
    const pathname = usePathname();
    const [scrolled, setScrolled] = useState(false);
    const [mobileOpen, setMobileOpen] = useState(false);

    useEffect(() => {
        const handleScroll = () => setScrolled(window.scrollY > 8);
        window.addEventListener('scroll', handleScroll, { passive: true });
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    useEffect(() => {
        setMobileOpen(false);
    }, [pathname]);

    const isActive = (href: string) => pathname === href;

    return (
        <nav
            className={`w-full sticky top-0 z-50 transition-all duration-200 ${scrolled
                    ? 'bg-white/90 backdrop-blur-md border-b border-gray-200/80 shadow-sm'
                    : 'bg-white/80 backdrop-blur-sm border-b border-gray-100'
                }`}
        >
            <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
                <Link href="/" className="flex items-center gap-2 group">
                    <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-white font-bold text-sm group-hover:scale-105 transition-transform">
                        P
                    </div>
                    <span className="text-xl font-bold text-text tracking-tight">PivLink</span>
                </Link>

                <div className="hidden md:flex items-center gap-6">
                    <Link
                        href="/about"
                        className={`text-sm font-medium transition-colors ${isActive('/about') ? 'text-primary' : 'text-gray-500 hover:text-text'
                            }`}
                    >
                        About
                    </Link>
                    <Link
                        href="/contact"
                        className={`text-sm font-medium transition-colors ${isActive('/contact') ? 'text-primary' : 'text-gray-500 hover:text-text'
                            }`}
                    >
                        Contact
                    </Link>
                    <Link
                        href="/support"
                        className={`text-sm font-medium transition-colors ${isActive('/support') ? 'text-primary' : 'text-gray-500 hover:text-text'
                            }`}
                    >
                        Support
                    </Link>
                    <Link
                        href="/login"
                        className="bg-primary text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-blue-600 active:scale-95 transition-all shadow-sm shadow-primary/20"
                    >
                        Sign In
                    </Link>
                </div>

                <button
                    className="md:hidden p-2 rounded-lg hover:bg-gray-100 transition-colors"
                    onClick={() => setMobileOpen(!mobileOpen)}
                    aria-label="Toggle menu"
                >
                    <div className="w-5 h-4 flex flex-col justify-between">
                        <span
                            className={`block h-0.5 bg-text rounded transition-all duration-200 ${mobileOpen ? 'rotate-45 translate-y-[7px]' : ''
                                }`}
                        />
                        <span
                            className={`block h-0.5 bg-text rounded transition-all duration-200 ${mobileOpen ? 'opacity-0' : ''
                                }`}
                        />
                        <span
                            className={`block h-0.5 bg-text rounded transition-all duration-200 ${mobileOpen ? '-rotate-45 -translate-y-[9px]' : ''
                                }`}
                        />
                    </div>
                </button>
            </div>

            {mobileOpen && (
                <div className="md:hidden border-t border-gray-100 bg-white/95 backdrop-blur-md px-6 py-4 space-y-3">
                    <Link href="/about" className="block text-sm font-medium text-gray-600 hover:text-primary py-1">
                        About
                    </Link>
                    <Link href="/contact" className="block text-sm font-medium text-gray-600 hover:text-primary py-1">
                        Contact
                    </Link>
                    <Link href="/support" className="block text-sm font-medium text-gray-600 hover:text-primary py-1">
                        Support
                    </Link>
                    <Link href="/login" className="btn-primary inline-block text-sm py-2 px-4">
                        Sign In
                    </Link>
                </div>
            )}
        </nav>
    );
}

function NavbarWithPrivy() {
    const { authenticated, logout, ready } = usePrivy();
    const walletAddress = useSolanaAddress();
    const isAuthenticated = authenticated && ready;
    const pathname = usePathname();
    const [scrolled, setScrolled] = useState(false);
    const [mobileOpen, setMobileOpen] = useState(false);

    useEffect(() => {
        const handleScroll = () => setScrolled(window.scrollY > 8);
        window.addEventListener('scroll', handleScroll, { passive: true });
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    // Close mobile menu on route change
    useEffect(() => {
        setMobileOpen(false);
    }, [pathname]);

    const isActive = (href: string) => pathname === href;

    return (
        <nav
            className={`w-full sticky top-0 z-50 transition-all duration-200 ${scrolled
                    ? 'bg-white/90 backdrop-blur-md border-b border-gray-200/80 shadow-sm'
                    : 'bg-white/80 backdrop-blur-sm border-b border-gray-100'
                }`}
        >
            <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
                {/* Logo */}
                <Link href="/" className="flex items-center gap-2 group">
                    <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-white font-bold text-sm group-hover:scale-105 transition-transform">
                        P
                    </div>
                    <span className="text-xl font-bold text-text tracking-tight">PivLink</span>
                </Link>

                {/* Desktop nav */}
                <div className="hidden md:flex items-center gap-6">
                    <Link
                        href="/about"
                        className={`text-sm font-medium transition-colors ${isActive('/about') ? 'text-primary' : 'text-gray-500 hover:text-text'
                            }`}
                    >
                        About
                    </Link>
                    <Link
                        href="/contact"
                        className={`text-sm font-medium transition-colors ${isActive('/contact') ? 'text-primary' : 'text-gray-500 hover:text-text'
                            }`}
                    >
                        Contact
                    </Link>
                    <Link
                        href="/support"
                        className={`text-sm font-medium transition-colors ${isActive('/support') ? 'text-primary' : 'text-gray-500 hover:text-text'
                            }`}
                    >
                        Support
                    </Link>
                    {isAuthenticated && (
                        <>
                            <Link
                                href="/wallet"
                                className={`text-sm font-medium transition-colors ${isActive('/wallet') ? 'text-primary' : 'text-gray-500 hover:text-text'
                                    }`}
                            >
                                My Wallet
                            </Link>
                            <span className="text-xs text-gray-400 font-mono bg-gray-100 px-2 py-1 rounded-md">
                                {walletAddress
                                    ? `${walletAddress.slice(0, 4)}…${walletAddress.slice(-4)}`
                                    : 'Connected'}
                            </span>
                            <button
                                onClick={logout}
                                className="text-sm text-gray-500 hover:text-red-500 font-medium transition-colors"
                            >
                                Sign out
                            </button>
                            <Link
                                href="/create"
                                className="bg-primary text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-blue-600 active:scale-95 transition-all shadow-sm shadow-primary/20"
                            >
                                Create Invoice
                            </Link>
                        </>
                    )}
                    {!isAuthenticated && ready && (
                        <Link
                            href="/login"
                            className="bg-primary text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-blue-600 active:scale-95 transition-all shadow-sm shadow-primary/20"
                        >
                            Sign In
                        </Link>
                    )}
                </div>

                {/* Mobile hamburger */}
                <button
                    className="md:hidden p-2 rounded-lg hover:bg-gray-100 transition-colors"
                    onClick={() => setMobileOpen(!mobileOpen)}
                    aria-label="Toggle menu"
                >
                    <div className="w-5 h-4 flex flex-col justify-between">
                        <span
                            className={`block h-0.5 bg-text rounded transition-all duration-200 ${mobileOpen ? 'rotate-45 translate-y-[7px]' : ''
                                }`}
                        />
                        <span
                            className={`block h-0.5 bg-text rounded transition-all duration-200 ${mobileOpen ? 'opacity-0' : ''
                                }`}
                        />
                        <span
                            className={`block h-0.5 bg-text rounded transition-all duration-200 ${mobileOpen ? '-rotate-45 -translate-y-[9px]' : ''
                                }`}
                        />
                    </div>
                </button>
            </div>

            {/* Mobile menu */}
            {mobileOpen && (
                <div className="md:hidden border-t border-gray-100 bg-white/95 backdrop-blur-md px-6 py-4 space-y-3">
                    <Link href="/about" className="block text-sm font-medium text-gray-600 hover:text-primary py-1">
                        About
                    </Link>
                    <Link href="/contact" className="block text-sm font-medium text-gray-600 hover:text-primary py-1">
                        Contact
                    </Link>
                    <Link href="/support" className="block text-sm font-medium text-gray-600 hover:text-primary py-1">
                        Support
                    </Link>
                    {isAuthenticated && (
                        <>
                            <Link href="/wallet" className="block text-sm font-medium text-gray-600 hover:text-primary py-1">
                                My Wallet
                            </Link>
                            <button
                                onClick={logout}
                                className="block text-sm font-medium text-red-500 hover:text-red-600 py-1"
                            >
                                Sign out
                            </button>
                            <Link href="/create" className="btn-primary inline-block text-sm py-2 px-4">
                                Create Invoice
                            </Link>
                        </>
                    )}
                    {!isAuthenticated && ready && (
                        <Link href="/login" className="btn-primary inline-block text-sm py-2 px-4">
                            Sign In
                        </Link>
                    )}
                </div>
            )}
        </nav>
    );
}

export function Navbar() {
    // If Privy isn't configured, rendering Privy hooks will crash during prerender/build.
    if (!process.env.NEXT_PUBLIC_PRIVY_APP_ID) return <NavbarStatic />;
    return <NavbarWithPrivy />;
}
