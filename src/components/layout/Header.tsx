'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { mainNavItems, secondaryNavItems } from '@/config/navigation';
import { Menu, X, ShieldAlert, ChevronDown, Github, ExternalLink, Terminal } from 'lucide-react';

export function Header() {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Close mobile drawer on route transition
  useEffect(() => {
    setMobileMenuOpen(false);
    setMoreMenuOpen(false);
  }, [pathname]);

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? 'bg-[#08090cd9] backdrop-blur-md border-b border-gold-500/20 py-3 shadow-lg shadow-black/60'
          : 'bg-transparent py-5 border-b border-white/5'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between">
          {/* Imperial Crest / Logo */}
          <Link href="/" className="flex items-center space-x-3 group">
            <div className="w-10 h-10 rounded-sm bg-gradient-to-br from-gold-500/20 via-imperial-800 to-imperial-950 border border-gold-500/40 flex items-center justify-center shadow-imperial-gold group-hover:border-gold-400 transition-all">
              <span className="font-serif font-black text-gold-400 text-lg tracking-wider">Λ</span>
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-serif font-bold text-lg tracking-widest text-white group-hover:text-gold-300 transition-colors">
                  PROJECT LAMO
                </span>
                <span className="px-1.5 py-0.5 text-[10px] font-mono uppercase bg-gold-500/10 border border-gold-500/30 text-gold-300 rounded">
                  v1.0
                </span>
              </div>
              <p className="text-[10px] font-mono tracking-wider text-neutral-400 hidden sm:block uppercase">
                Imperial AI & Robotics
              </p>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center space-x-1">
            {mainNavItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`px-3.5 py-2 rounded text-xs font-medium tracking-wide uppercase transition-all duration-200 relative ${
                    isActive
                      ? 'text-gold-300 bg-gold-500/10 border border-gold-500/30 shadow-[0_0_12px_rgba(212,175,55,0.15)]'
                      : 'text-neutral-300 hover:text-white hover:bg-imperial-800/60 border border-transparent'
                  }`}
                >
                  {item.title}
                  {item.badge && (
                    <span className="ml-1.5 px-1 py-0.2 text-[9px] bg-gold-500/20 text-gold-400 rounded border border-gold-500/40">
                      {item.badge}
                    </span>
                  )}
                  {isActive && (
                    <span className="absolute bottom-0 left-2 right-2 h-0.5 bg-gradient-to-r from-transparent via-gold-400 to-transparent" />
                  )}
                </Link>
              );
            })}

            {/* More Sections Dropdown */}
            <div className="relative">
              <button
                onClick={() => setMoreMenuOpen(!moreMenuOpen)}
                className={`flex items-center space-x-1 px-3 py-2 rounded text-xs font-medium tracking-wide uppercase transition-all ${
                  moreMenuOpen
                    ? 'text-gold-300 bg-imperial-800 border border-gold-500/30'
                    : 'text-neutral-300 hover:text-white hover:bg-imperial-800/60 border border-transparent'
                }`}
              >
                <span>Citadel Archives</span>
                <ChevronDown className={`w-3.5 h-3.5 transition-transform ${moreMenuOpen ? 'rotate-180' : ''}`} />
              </button>

              {moreMenuOpen && (
                <div className="absolute right-0 mt-2 w-56 rounded-md bg-imperial-900 border border-gold-500/30 shadow-2xl py-2 z-50 backdrop-blur-xl">
                  {secondaryNavItems.map((item) => {
                    const isActive = pathname === item.href;
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setMoreMenuOpen(false)}
                        className={`block px-4 py-2 text-xs tracking-wider transition-colors ${
                          isActive
                            ? 'text-gold-300 bg-gold-500/10 font-semibold'
                            : 'text-neutral-300 hover:text-white hover:bg-imperial-800'
                        }`}
                      >
                        {item.title}
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          </nav>

          {/* Identity & External Actions */}
          <div className="hidden sm:flex items-center space-x-3">
            <Link
              href="https://github.com/helloAi0/Portfolio.git"
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 text-neutral-400 hover:text-gold-300 hover:bg-imperial-800 rounded border border-transparent hover:border-gold-500/20 transition-all"
              title="GitHub Imperial Repository"
            >
              <Github className="w-4 h-4" />
            </Link>

            <Link
              href="/contact"
              className="px-4 py-2 rounded text-xs font-semibold tracking-wider uppercase bg-gradient-to-r from-gold-500 to-gold-600 hover:from-gold-400 hover:to-gold-500 text-imperial-950 shadow-md shadow-gold-500/20 hover:shadow-gold-500/40 transition-all"
            >
              Transmit Signal
            </Link>
          </div>

          {/* Mobile menu trigger */}
          <div className="lg:hidden flex items-center space-x-2">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded text-neutral-300 hover:text-gold-400 hover:bg-imperial-800 border border-gold-500/20"
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer Navigation */}
      {mobileMenuOpen && (
        <div className="lg:hidden fixed inset-x-0 top-[65px] bottom-0 bg-[#07080aef] backdrop-blur-xl border-t border-gold-500/20 overflow-y-auto p-6 z-40">
          <div className="flex flex-col space-y-2">
            <div className="text-[10px] font-mono uppercase text-gold-400 tracking-widest px-3 pt-2 pb-1">
              Primary Citadel Portals
            </div>
            {mainNavItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`px-4 py-3 rounded text-sm font-medium tracking-wider flex items-center justify-between ${
                    isActive
                      ? 'text-gold-300 bg-gold-500/10 border border-gold-500/30'
                      : 'text-neutral-300 hover:bg-imperial-800/60'
                  }`}
                >
                  <span>{item.title}</span>
                  {item.badge && (
                    <span className="text-[10px] px-2 py-0.5 rounded bg-gold-500/20 text-gold-300 border border-gold-500/30">
                      {item.badge}
                    </span>
                  )}
                </Link>
              );
            })}

            <div className="text-[10px] font-mono uppercase text-gold-400 tracking-widest px-3 pt-4 pb-1">
              Secondary Imperial Archives
            </div>
            {secondaryNavItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`px-4 py-2.5 rounded text-xs font-medium tracking-wider ${
                    isActive
                      ? 'text-gold-300 bg-gold-500/10'
                      : 'text-neutral-400 hover:text-neutral-200 hover:bg-imperial-800/40'
                  }`}
                >
                  {item.title}
                </Link>
              );
            })}

            <div className="pt-6 border-t border-neutral-800 flex flex-col space-y-3">
              <Link
                href="/contact"
                className="w-full py-3 text-center rounded text-xs font-bold uppercase tracking-wider bg-gold-500 text-imperial-950"
              >
                Transmit Direct Signal
              </Link>
              <div className="flex justify-center space-x-4 pt-2">
                <Link
                  href="https://github.com/helloAi0/Portfolio.git"
                  target="_blank"
                  className="text-xs text-neutral-400 flex items-center space-x-1"
                >
                  <Github className="w-4 h-4" />
                  <span>GitHub Repository</span>
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}

