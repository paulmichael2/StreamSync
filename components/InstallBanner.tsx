'use client';

import { useEffect, useState } from 'react';
import { X, Share, Plus } from 'lucide-react';

const DISMISSED_KEY = 'heartsync_install_dismissed';

export default function InstallBanner() {
  const [show, setShow] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    // Only show on mobile
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    if (!isMobile) return;

    // Don't show if already installed (standalone mode)
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (navigator as Navigator & { standalone?: boolean }).standalone === true;
    if (isStandalone) return;

    // Don't show if dismissed before
    if (localStorage.getItem(DISMISSED_KEY)) return;

    const ios = /iPhone|iPad|iPod/i.test(navigator.userAgent);
    setIsIOS(ios);

    // Small delay so it doesn't flash immediately on load
    const t = setTimeout(() => setShow(true), 2000);
    return () => clearTimeout(t);
  }, []);

  const dismiss = () => {
    setShow(false);
    localStorage.setItem(DISMISSED_KEY, '1');
  };

  if (!show) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 z-[9999] animate-slide-up">
      <div className="bg-[#1a1a1a] border border-white/15 rounded-2xl shadow-2xl shadow-black/60 p-4 flex items-start gap-3">
        {/* App icon */}
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-pink-500 via-purple-500 to-blue-500 flex items-center justify-center flex-shrink-0">
          <svg width="24" height="24" viewBox="0 0 32 32" fill="none">
            <path d="M16 27C16 27 4 19.5 4 11.5C4 8.42 6.42 6 9.5 6C11.74 6 13.68 7.28 14.72 9.1L16 11.5L17.28 9.1C18.32 7.28 20.26 6 22.5 6C25.58 6 28 8.42 28 11.5C28 19.5 16 27 16 27Z" fill="white" />
          </svg>
        </div>

        {/* Text */}
        <div className="flex-1 min-w-0">
          <p className="text-white font-semibold text-sm">Add HeartSync to Home Screen</p>
          {isIOS ? (
            <p className="text-white/50 text-xs mt-1 leading-relaxed">
              Tap <span className="inline-flex items-center gap-0.5 text-white/70"><Share size={11} className="inline" /> Share</span> then{' '}
              <span className="inline-flex items-center gap-0.5 text-white/70"><Plus size={11} className="inline" /> Add to Home Screen</span>
            </p>
          ) : (
            <p className="text-white/50 text-xs mt-1 leading-relaxed">
              Tap your browser menu → <span className="text-white/70">Add to Home Screen</span>
            </p>
          )}
        </div>

        {/* Close */}
        <button
          onClick={dismiss}
          className="p-1 text-white/30 hover:text-white transition-colors flex-shrink-0 cursor-pointer"
          aria-label="Dismiss"
        >
          <X size={18} />
        </button>
      </div>
    </div>
  );
}
