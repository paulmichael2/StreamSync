'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Play, Search, Bell, User, Menu, X, Film, Shield } from 'lucide-react';

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
            <div className="w-8 h-8 bg-brand-red rounded-md flex items-center justify-center">
              <Play size={16} className="text-white fill-white ml-0.5" />
            </div>
            <span className="text-xl font-bold tracking-tight text-white">
              Stream<span className="text-brand-red">Sync</span>
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
            <Link href="/admin" className="flex items-center gap-2 text-white/60 hover:text-white py-2" onClick={() => setMenuOpen(false)}>
              <Shield size={16} /> Admin
            </Link>
          </nav>
        </div>
      )}
    </header>
  );
}
