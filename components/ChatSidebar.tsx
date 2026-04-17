'use client';

import { useState, useEffect, useRef } from 'react';
import { Send, MessageCircle, Users, Wifi } from 'lucide-react';
import { Socket } from 'socket.io-client';
import { ChatMessage, Participant } from '@/lib/types';

interface ChatSidebarProps {
  socket: Socket | null;
  roomId: string;
  username: string;
  participants: Participant[];
}

// Deterministic color per username
const USER_COLORS = [
  '#E11D48', '#7C3AED', '#2563EB', '#059669',
  '#D97706', '#DC2626', '#7C3AED', '#0891B2',
];
function getUserColor(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return USER_COLORS[Math.abs(hash) % USER_COLORS.length];
}

function formatTs(ts: number) {
  return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export default function ChatSidebar({ socket, roomId, username, participants }: ChatSidebarProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [tab, setTab] = useState<'chat' | 'users'>('chat');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Listen for messages
  useEffect(() => {
    if (!socket) return;
    const handler = (msg: ChatMessage) => {
      setMessages((prev) => [...prev, msg]);
    };
    socket.on('chat-message', handler);
    return () => { socket.off('chat-message', handler); };
  }, [socket]);

  const sendMessage = () => {
    const text = input.trim();
    if (!text || !socket) return;
    socket.emit('chat-message', { roomId, username, message: text });
    setInput('');
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <aside className="flex flex-col h-full bg-[#0d0d0d] border-l border-white/8">
      {/* Header */}
      <div className="flex-shrink-0 px-4 py-3 border-b border-white/8">
        <div className="flex gap-1 p-1 bg-white/5 rounded-xl">
          <button
            onClick={() => setTab('chat')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              tab === 'chat'
                ? 'bg-brand-red text-white'
                : 'text-white/50 hover:text-white'
            }`}
          >
            <MessageCircle size={13} />
            Chat
          </button>
          <button
            onClick={() => setTab('users')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              tab === 'users'
                ? 'bg-brand-red text-white'
                : 'text-white/50 hover:text-white'
            }`}
          >
            <Users size={13} />
            Viewers
            {participants.length > 0 && (
              <span className="ml-1 px-1.5 py-0.5 text-[10px] rounded-full bg-white/20">
                {participants.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Chat Tab */}
      {tab === 'chat' && (
        <>
          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3 min-h-0">
            {messages.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full gap-3 text-center">
                <div className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center">
                  <MessageCircle size={24} className="text-white/30" />
                </div>
                <div>
                  <p className="text-white/40 text-sm font-medium">No messages yet</p>
                  <p className="text-white/25 text-xs mt-1">Be the first to say something!</p>
                </div>
              </div>
            )}

            {messages.map((msg) => (
              <div key={msg.id} className={`animate-fade-in ${msg.isSystem ? 'text-center' : ''}`}>
                {msg.isSystem ? (
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-white/5 rounded-full text-xs text-white/40">
                    <Wifi size={10} />
                    {msg.message}
                  </div>
                ) : (
                  <div className={`flex gap-2 ${msg.username === username ? 'flex-row-reverse' : 'flex-row'}`}>
                    {/* Avatar */}
                    <div
                      className="w-7 h-7 rounded-full flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0 mt-0.5"
                      style={{ background: getUserColor(msg.username) }}
                    >
                      {msg.username.charAt(0).toUpperCase()}
                    </div>

                    <div className={`flex flex-col max-w-[75%] ${msg.username === username ? 'items-end' : 'items-start'}`}>
                      <div className="flex items-baseline gap-1.5 mb-0.5">
                        <span
                          className="text-[11px] font-semibold"
                          style={{ color: getUserColor(msg.username) }}
                        >
                          {msg.username === username ? 'You' : msg.username}
                        </span>
                        <span className="text-[10px] text-white/25">{formatTs(msg.timestamp)}</span>
                      </div>
                      <div
                        className={`px-3 py-2 rounded-2xl text-sm leading-relaxed ${
                          msg.username === username
                            ? 'bg-brand-red text-white rounded-tr-sm'
                            : 'bg-white/8 text-white/90 rounded-tl-sm'
                        }`}
                      >
                        {msg.message}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="flex-shrink-0 px-3 py-3 border-t border-white/8">
            <div className="flex items-center gap-2 bg-white/5 rounded-xl border border-white/10 focus-within:border-brand-red/60 transition-colors">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Say something..."
                maxLength={300}
                className="flex-1 px-3 py-3 bg-transparent text-white text-sm placeholder-white/30 focus:outline-none"
                aria-label="Chat message input"
              />
              <button
                onClick={sendMessage}
                disabled={!input.trim()}
                className="mr-2 p-2 rounded-lg bg-brand-red text-white hover:bg-rose-600 disabled:opacity-40 disabled:cursor-not-allowed active:scale-95 transition-all cursor-pointer"
                aria-label="Send message"
              >
                <Send size={15} />
              </button>
            </div>
            <p className="text-[10px] text-white/20 mt-1 px-1">Press Enter to send</p>
          </div>
        </>
      )}

      {/* Users Tab */}
      {tab === 'users' && (
        <div className="flex-1 overflow-y-auto px-3 py-3">
          {participants.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-3 text-center">
              <div className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center">
                <Users size={24} className="text-white/30" />
              </div>
              <p className="text-white/40 text-sm">No one else here yet</p>
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-xs text-white/30 px-1 mb-3">
                {participants.length} {participants.length === 1 ? 'person' : 'people'} watching
              </p>
              {participants.map((p) => (
                <div key={p.id} className="flex items-center gap-3 px-3 py-2.5 bg-white/5 rounded-xl">
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                    style={{ background: getUserColor(p.username) }}
                  >
                    {p.username.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm font-medium truncate">
                      {p.username}
                      {p.username === username && (
                        <span className="ml-1.5 text-xs text-white/40 font-normal">(you)</span>
                      )}
                    </p>
                  </div>
                  <div className="w-2 h-2 rounded-full bg-green-400" title="Online" />
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </aside>
  );
}
