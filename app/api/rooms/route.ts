import { NextResponse } from 'next/server';
import { roomStates } from '@/lib/roomStates';
import { GRACE_MS } from '@/lib/roomConfig';

const hasSupabase =
  !!process.env.NEXT_PUBLIC_SUPABASE_URL &&
  !process.env.NEXT_PUBLIC_SUPABASE_URL.includes('placeholder');

export async function GET() {
  if (hasSupabase) {
    const { supabase } = await import('@/lib/supabase');

    const now      = new Date();
    const staleAt  = new Date(now.getTime() - 8 * 60 * 60 * 1000).toISOString(); // 8-hour crash cleanup
    const graceAt  = new Date(now.getTime() - GRACE_MS).toISOString();

    // Clean truly stale sessions and expired closing records in parallel
    await Promise.all([
      supabase.from('room_sessions').delete().lt('updated_at', staleAt),
      supabase.from('room_closings').delete().lt('closed_at', graceAt),
    ]);

    // Fetch active sessions + rooms still in grace period
    const [{ data: sessions, error: e1 }, { data: closings, error: e2 }] = await Promise.all([
      supabase.from('room_sessions').select('*'),
      supabase.from('room_closings').select('*').gte('closed_at', graceAt),
    ]);

    if (e1) console.error('[room_sessions select]', JSON.stringify(e1));
    if (e2) console.error('[room_closings select]', JSON.stringify(e2));

    // Build active rooms map
    const map: Record<string, {
      id: string; movieId: string;
      users: { id: string; username: string }[];
      currentTime: number; isPlaying: boolean;
      updatedAt: number; closingAt: number | null;
    }> = {};

    // Filter to public rooms only (is_public missing = legacy row, treat as public)
    const publicSessions = (sessions ?? []).filter((r) => r.is_public !== false);
    const publicClosings = (closings ?? []).filter((r) => r.is_public !== false);

    for (const row of publicSessions) {
      if (!map[row.room_id]) {
        map[row.room_id] = {
          id: row.room_id, movieId: row.movie_id ?? '',
          users: [], currentTime: 0, isPlaying: false,
          updatedAt: new Date(row.updated_at).getTime(),
          closingAt: null,
        };
      }
      map[row.room_id].users.push({ id: row.user_id, username: row.username });
    }

    // Include ghost rooms (empty but still in grace window)
    const activeIds = new Set(Object.keys(map));
    for (const closing of publicClosings) {
      if (!activeIds.has(closing.room_id)) {
        map[closing.room_id] = {
          id: closing.room_id, movieId: closing.movie_id ?? '',
          users: [], currentTime: 0, isPlaying: false,
          updatedAt: new Date(closing.closed_at).getTime(),
          closingAt: new Date(closing.closed_at).getTime() + GRACE_MS,
        };
      }
    }

    return NextResponse.json(Object.values(map), {
      headers: { 'Cache-Control': 'no-store' },
    });
  }

  // Local fallback
  const active = Object.entries(roomStates)
    .filter(([, s]) => s.users.length > 0 && s.isPublic !== false)
    .map(([id, s]) => ({ id, ...s, closingAt: null }));
  return NextResponse.json(active, {
    headers: { 'Cache-Control': 'no-store' },
  });
}
