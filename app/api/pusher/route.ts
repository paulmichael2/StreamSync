import { NextRequest, NextResponse } from 'next/server';
import { pusherServer } from '@/lib/pusher';
import { roomStates } from '@/lib/roomStates';

const hasSupabase =
  !!process.env.NEXT_PUBLIC_SUPABASE_URL &&
  !process.env.NEXT_PUBLIC_SUPABASE_URL.includes('placeholder');

function getOrCreate(roomId: string) {
  if (!roomStates[roomId]) {
    roomStates[roomId] = { currentTime: 0, isPlaying: false, movieId: '', users: [], updatedAt: Date.now() };
  }
  return roomStates[roomId];
}

export async function GET(req: NextRequest) {
  const roomId = req.nextUrl.searchParams.get('roomId') || '';
  const state  = roomStates[roomId] ?? { currentTime: 0, isPlaying: false, movieId: '', users: [], updatedAt: 0 };
  return NextResponse.json(state);
}

export async function POST(req: NextRequest) {
  const { roomId, event, data } = await req.json();
  const room = getOrCreate(roomId);

  switch (event) {
    case 'play':
      room.currentTime = data.currentTime ?? room.currentTime;
      room.isPlaying   = true;
      break;

    case 'pause':
      room.currentTime = data.currentTime ?? room.currentTime;
      room.isPlaying   = false;
      break;

    case 'seek':
      room.currentTime = data.currentTime ?? room.currentTime;
      break;

    case 'user-joined':
      room.users = room.users.filter((u) => u.id !== data.id);
      room.users.push({ id: data.id, username: data.username });
      if (data.movieId) room.movieId = data.movieId;
      room.updatedAt = Date.now();

      if (hasSupabase) {
        const { supabase } = await import('@/lib/supabase');
        // Upsert session
        const { error: e1 } = await supabase.from('room_sessions').upsert(
          { user_id: data.id, room_id: roomId, username: data.username, movie_id: data.movieId ?? '', updated_at: new Date().toISOString() },
          { onConflict: 'user_id,room_id' }
        );
        if (e1) console.error('[room_sessions upsert]', JSON.stringify(e1));

        // Cancel any pending closing record — room is alive again
        await supabase.from('room_closings').delete().eq('room_id', roomId);
      }
      break;

    case 'keepalive':
      // Refresh updated_at so the session doesn't get cleaned up as stale
      room.updatedAt = Date.now();
      if (hasSupabase) {
        const { supabase } = await import('@/lib/supabase');
        await supabase.from('room_sessions')
          .update({ updated_at: new Date().toISOString() })
          .eq('user_id', data.id).eq('room_id', roomId);
      }
      return NextResponse.json({ success: true });

    case 'user-left':
      room.users = room.users.filter((u) => u.id !== data.id);
      room.updatedAt = Date.now();

      if (hasSupabase) {
        const { supabase } = await import('@/lib/supabase');

        const { error: e2 } = await supabase.from('room_sessions').delete()
          .eq('user_id', data.id).eq('room_id', roomId);
        if (e2) console.error('[room_sessions delete]', JSON.stringify(e2));

        // Check if room is now empty
        const { count } = await supabase
          .from('room_sessions')
          .select('*', { count: 'exact', head: true })
          .eq('room_id', roomId);

        if ((count ?? 0) === 0) {
          // Start 2-minute grace period before room disappears
          const { error: e3 } = await supabase.from('room_closings').upsert(
            { room_id: roomId, movie_id: room.movieId || '', closed_at: new Date().toISOString() },
            { onConflict: 'room_id' }
          );
          if (e3) console.error('[room_closings upsert]', JSON.stringify(e3));
        }
      }
      break;
  }

  // Broadcast rooms update — non-fatal, must not block room-specific event
  if (event === 'user-joined' || event === 'user-left') {
    pusherServer.trigger('rooms', 'rooms-updated', {}).catch((err) =>
      console.error('[rooms-updated trigger]', String(err))
    );
  }

  await pusherServer.trigger(`room-${roomId}`, event, data);
  return NextResponse.json({ success: true });
}
