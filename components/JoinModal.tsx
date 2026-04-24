'use client';

import { useState, useEffect, useRef } from 'react';
import { X, Users, Film } from 'lucide-react';

interface JoinModalProps {
  movieTitle: string;
  onJoin: (username: string) => void;
  onClose: () => void;
}

export default function JoinModal({ movieTitle, onJoin, onClose }: JoinModalProps) {
  const [username, setUsername] = useState('');
  const [error, setError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    // Trap focus
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = username.trim();
    if (!trimmed) {
      setError('Please enter a name to continue');
      return;
    }
    if (trimmed.length < 2) {
      setError('Name must be at least 2 characters');
      return;
    }
    onJoin(trimmed);
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="join-modal-title"
    >
      {/* Scrim */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Panel */}
      <div className="relative z-10 w-full max-w-md bg-[#141414] border border-white/10 rounded-2xl shadow-2xl animate-scale-in">
        <div className="p-6">
          {/* Header */}
          <div className="flex items-start justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-brand-red/20 rounded-xl flex items-center justify-center">
                <Users size={20} className="text-brand-red" />
              </div>
              <div>
                <h2 id="join-modal-title" className="text-lg font-bold text-white">
                  Join Watch Party
                </h2>
                <p className="text-xs text-white/50 mt-0.5 flex items-center gap-1">
                  <Film size={11} />
                  {movieTitle}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-white/40 hover:text-white hover:bg-white/10 transition-all cursor-pointer"
              aria-label="Close"
            >
              <X size={18} />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} noValidate>
            <div className="mb-4">
              <label
                htmlFor="username"
                className="block text-sm font-medium text-white/70 mb-2"
              >
                Your display name
              </label>
              <input
                ref={inputRef}
                id="username"
                type="text"
                value={username}
                onChange={(e) => {
                  setUsername(e.target.value);
                  setError('');
                }}
                placeholder="e.g. heartcute"
                maxLength={20}
                className="w-full px-4 py-3 bg-white/5 border border-white/15 rounded-xl text-white placeholder-white/30 text-sm
                  focus:outline-none focus:border-brand-red focus:ring-1 focus:ring-brand-red transition-all"
              />
              {error && (
                <p className="mt-2 text-xs text-red-400" role="alert">
                  {error}
                </p>
              )}
            </div>

            <div className="bg-white/5 rounded-xl p-3 mb-5 text-xs text-white/50 flex items-start gap-2">
              <Users size={13} className="text-brand-red mt-0.5 flex-shrink-0" />
              <span>Your video will sync in real-time with everyone in the room. Play, pause, and seek together.</span>
            </div>

            <button
              type="submit"
              className="w-full py-3 bg-brand-red text-white font-bold rounded-xl hover:bg-rose-600 active:scale-[0.97] transition-all duration-150 cursor-pointer"
            >
              Join the Party
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
