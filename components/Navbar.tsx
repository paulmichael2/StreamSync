'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Search, Bell, Menu, X, Shield, Radio } from 'lucide-react';

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled ? 'bg-black/95 backdrop-blur-md shadow-lg shadow-black/50' : 'bg-gradient-to-b from-black/80 to-transparent'
      }`}
    >
      <div className="max-w-[1800px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 group flex-shrink-0">
            <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <linearGradient id="heartGrad" x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
                  <stop offset="0%" stopColor="#FF3CAC" />
                  <stop offset="50%" stopColor="#784BA0" />
                  <stop offset="100%" stopColor="#2B86C5" />
                </linearGradient>
              </defs>
              <path d="M16 27C16 27 4 19.5 4 11.5C4 8.42 6.42 6 9.5 6C11.74 6 13.68 7.28 14.72 9.1L16 11.5L17.28 9.1C18.32 7.28 20.26 6 22.5 6C25.58 6 28 8.42 28 11.5C28 19.5 16 27 16 27Z" fill="url(#heartGrad)" />
              <path d="M13 16L15.5 19L19.5 13" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" opacity="0.9" />
            </svg>
            <span className="text-xl font-bold tracking-tight text-white">
              Heart<span style={{ background: 'linear-gradient(90deg,#FF3CAC,#784BA0,#2B86C5)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Sync</span>
            </span>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-6 text-sm font-medium">
            <Link
              href="/"
              className={`transition-colors hover:text-white ${pathname === '/' ? 'text-white' : 'text-white/60'}`}
            >
              Home
            </Link>
            <Link
              href="/?genre=Action"
              className="text-white/60 hover:text-white transition-colors"
            >
              Movies
            </Link>
            <Link
              href="/?genre=Drama"
              className="text-white/60 hover:text-white transition-colors"
            >
              Series
            </Link>
            <Link
              href="/?genre=Animation"
              className="text-white/60 hover:text-white transition-colors"
            >
              New & Popular
            </Link>
            <Link
              href="/rooms"
              className={`flex items-center gap-1.5 transition-colors hover:text-white ${pathname === '/rooms' ? 'text-white' : 'text-white/60'}`}
            >
              <Radio size={13} className="text-brand-red" />
              Live Rooms
            </Link>
          </nav>

          {/* Right Actions */}
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              aria-label="Search"
              className="p-2 rounded-full text-white/60 hover:text-white hover:bg-white/10 transition-all"
            >
              <Search size={20} />
            </button>
            <button
              aria-label="Notifications"
              className="p-2 rounded-full text-white/60 hover:text-white hover:bg-white/10 transition-all hidden sm:flex"
            >
              <Bell size={20} />
            </button>
            <Link
              href="/admin"
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-white/80 hover:text-white hover:bg-white/10 rounded-md transition-all"
              aria-label="Admin panel"
            >
              <Shield size={15} />
              <span>Admin</span>
            </Link>
            <button
              aria-label="Profile"
              className="w-8 h-8 bg-brand-red rounded-full flex items-center justify-center text-white font-semibold text-sm flex-shrink-0"
            >
              U
            </button>
            <button
              aria-label="Menu"
              className="md:hidden p-2 text-white/60 hover:text-white transition-colors"
              onClick={() => setMenuOpen((v) => !v)}
            >
              {menuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {menuOpen && (
        <div className="md:hidden bg-black/95 border-t border-white/10 animate-fade-in">
          <nav className="px-4 py-4 flex flex-col gap-3 text-sm font-medium">
            <Link href="/" className="text-white/80 hover:text-white py-2" onClick={() => setMenuOpen(false)}>
              Home
            </Link>
            <Link href="/?genre=Action" className="text-white/60 hover:text-white py-2" onClick={() => setMenuOpen(false)}>
              Movies
            </Link>
            <Link href="/?genre=Animation" className="text-white/60 hover:text-white py-2" onClick={() => setMenuOpen(false)}>
              New & Popular
            </Link>
            <Link href="/rooms" className="flex items-center gap-2 text-white/60 hover:text-white py-2" onClick={() => setMenuOpen(false)}>
              <Radio size={16} className="text-brand-red" /> Live Rooms
            </Link>
            <Link href="/admin" className="flex items-center gap-2 text-white/60 hover:text-white py-2" onClick={() => setMenuOpen(false)}>
              <Shield size={16} /> Admin
            </Link>
          </nav>
        </div>
      )}
    </header>
  );
}
