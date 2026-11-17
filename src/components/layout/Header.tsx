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
    <header className="fixed top-0 left-0 right-0 z-50 px-3 sm:px-6 pt-3 sm:pt-4 pointer-events-none">
      <div
        className={`pointer-events-auto mx-auto max-w-6xl rounded-full border backdrop-blur-xl transition-all duration-500 ${
          scrolled
            ? 'bg-[#0a0b0fcc] border-gold-500/25 shadow-[0_10px_40px_-12px_rgba(0,0,0,0.9)] py-2'
            : 'bg-[#0a0b0f66] border-white/10 py-2.5'
        }`}
      >
        <div className="flex items-center justify-between pl-3 pr-2 sm:pl-4">
          <Link href="/" className="flex items-center gap-2.5 group" aria-label="Home">
            <span className="w-8 h-8 rounded-full bg-gradient-to-br from-gold-400/30 via-imperial-800 to-imperial-950 border border-gold-500/50 flex items-center justify-center group-hover:border-gold-300 transition-colors">
              <span className="font-serif font-black text-gold-300 text-sm">Λ</span>
            </span>
            <span className="font-serif font-bold text-sm tracking-[0.22em] text-white group-hover:text-gold-300 transition-colors hidden sm:block">
              LAMO
            </span>
          </Link>

          <nav className="hidden lg:flex items-center gap-0.5" aria-label="Primary">
            {mainNavItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={isActive ? 'page' : undefined}
                  className={`px-3 py-1.5 rounded-full text-[12px] font-medium tracking-wide transition-all duration-200 ${
                    isActive ? 'text-imperial-950 bg-gold-400' : 'text-neutral-300 hover:text-white hover:bg-white/10'
                  }`}
                >
                  {item.title}
                </Link>
              );
            })}

            <div className="relative">
              <button
                onClick={() => setMoreMenuOpen(!moreMenuOpen)}
                aria-expanded={moreMenuOpen}
                aria-haspopup="menu"
                className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-[12px] font-medium tracking-wide transition-all ${
                  moreMenuOpen ? 'text-white bg-white/10' : 'text-neutral-300 hover:text-white hover:bg-white/10'
                }`}
              >
                <span>More</span>
                <ChevronDown className={`w-3.5 h-3.5 transition-transform ${moreMenuOpen ? 'rotate-180' : ''}`} />
              </button>

              {moreMenuOpen && (
                <div role="menu" className="absolute right-0 mt-3 w-60 rounded-2xl bg-[#0c0e12f2] border border-gold-500/25 shadow-2xl p-2 z-50 backdrop-blur-xl">
                  {secondaryNavItems.map((item) => {
                    const isActive = pathname === item.href;
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        role="menuitem"
                        onClick={() => setMoreMenuOpen(false)}
                        className={`block px-3 py-2 rounded-xl text-xs tracking-wide transition-colors ${
                          isActive ? 'text-gold-300 bg-gold-500/10 font-semibold' : 'text-neutral-300 hover:text-white hover:bg-white/5'
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

          <div className="flex items-center gap-2">
            <Link
              href="https://github.com/helloAi0"
              target="_blank"
              rel="noopener noreferrer"
              className="hidden sm:flex p-2 rounded-full text-neutral-300 hover:text-gold-300 hover:bg-white/10 transition-all"
              aria-label="GitHub profile"
            >
              <Github className="w-4 h-4" />
            </Link>
            <Link
              href="/contact"
              className="hidden sm:inline-flex px-4 py-2 rounded-full text-[12px] font-semibold tracking-wide bg-gradient-to-r from-gold-400 to-gold-500 text-imperial-950 hover:shadow-[0_0_24px_rgba(212,175,55,0.45)] transition-all"
            >
              Get in touch
            </Link>
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 rounded-full text-neutral-200 hover:text-gold-300 hover:bg-white/10"
              aria-label="Toggle navigation menu"
              aria-expanded={mobileMenuOpen}
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer Navigation */}
      {mobileMenuOpen && (
        <div className="lg:hidden fixed inset-x-0 top-[72px] bottom-0 pointer-events-auto bg-[#07080aef] backdrop-blur-xl border-t border-gold-500/20 overflow-y-auto p-6 z-40">
          <div className="flex flex-col space-y-2">
            <div className="text-[10px] font-mono uppercase text-gold-400 tracking-widest px-3 pt-2 pb-1">
              Pages
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
              More
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
                Get in touch
              </Link>
              <div className="flex justify-center space-x-4 pt-2">
                <Link
                  href="https://github.com/helloAi0"
                  target="_blank"
                  className="text-xs text-neutral-400 flex items-center space-x-1"
                >
                  <Github className="w-4 h-4" />
                  <span>GitHub</span>
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}

