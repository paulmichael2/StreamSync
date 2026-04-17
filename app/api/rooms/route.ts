import { NextResponse } from 'next/server';
import { roomStates } from '@/lib/roomStates';

const hasSupabase =
  !!process.env.NEXT_PUBLIC_SUPABASE_URL &&
  !process.env.NEXT_PUBLIC_SUPABASE_URL.includes('placeholder');

export async function GET() {
  if (hasSupabase) {
    const { supabase } = await import('@/lib/supabase');

    // Drop stale sessions (sendBeacon may fail on hard refresh / crash)
    const staleAt = new Date(Date.now() - 10 * 60 * 1000).toISOString();
    await supabase.from('room_sessions').delete().lt('updated_at', staleAt);

    const { data, error } = await supabase.from('room_sessions').select('*');
    if (error) {
      console.error('[room_sessions select]', JSON.stringify(error));
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Group rows by room_id
    const map: Record<string, { id: string; movieId: string; users: { id: string; username: string }[]; currentTime: number; isPlaying: boolean; updatedAt: number }> = {};
    for (const row of data ?? []) {
      if (!map[row.room_id]) {
        map[row.room_id] = {
          id: row.room_id,
          movieId: row.movie_id ?? '',
          users: [],
          currentTime: 0,
          isPlaying: false,
          updatedAt: new Date(row.updated_at).getTime(),
        };
      }
      map[row.room_id].users.push({ id: row.user_id, username: row.username });
    }

    return NextResponse.json(Object.values(map), {
      headers: { 'Cache-Control': 'no-store' },
    });
  }

  // Local fallback — use in-memory state
  const active = Object.entries(roomStates)
    .filter(([, s]) => s.users.length > 0)
    .map(([id, s]) => ({ id, ...s }));
  return NextResponse.json(active, {
    headers: { 'Cache-Control': 'no-store' },
  });
}
