import { NextRequest, NextResponse } from 'next/server';
import { pusherServer } from '@/lib/pusher';
import { roomStates } from '@/lib/roomStates';
import { GRACE_MS } from '@/lib/roomConfig';

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

  // Payload to include in the rooms-updated broadcast (null = no broadcast needed)
  let roomsPayload: Record<string, unknown> | null = null;

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
        const { error: e1 } = await supabase.from('room_sessions').upsert(
          { user_id: data.id, room_id: roomId, username: data.username, movie_id: data.movieId ?? '', updated_at: new Date().toISOString() },
          { onConflict: 'user_id,room_id' }
        );
        if (e1) console.error('[room_sessions upsert]', JSON.stringify(e1));
        await supabase.from('room_closings').delete().eq('room_id', roomId);
      }

      roomsPayload = {
        action: 'user-joined',
        roomId,
        movieId: room.movieId,
        user: { id: data.id, username: data.username },
      };
      break;

    case 'keepalive':
      room.updatedAt = Date.now();
      if (hasSupabase) {
        const { supabase } = await import('@/lib/supabase');
        await supabase.from('room_sessions')
          .update({ updated_at: new Date().toISOString() })
          .eq('user_id', data.id).eq('room_id', roomId);
      }
      return NextResponse.json({ success: true });

    case 'user-left': {
      room.users = room.users.filter((u) => u.id !== data.id);
      room.updatedAt = Date.now();

      let closingAt: number | null = null;

      if (hasSupabase) {
        const { supabase } = await import('@/lib/supabase');

        const { error: e2 } = await supabase.from('room_sessions').delete()
          .eq('user_id', data.id).eq('room_id', roomId);
        if (e2) console.error('[room_sessions delete]', JSON.stringify(e2));

        const { count } = await supabase
          .from('room_sessions')
          .select('*', { count: 'exact', head: true })
          .eq('room_id', roomId);

        if ((count ?? 0) === 0) {
          closingAt = Date.now() + GRACE_MS;
          const { error: e3 } = await supabase.from('room_closings').upsert(
            { room_id: roomId, movie_id: room.movieId || '', closed_at: new Date().toISOString() },
            { onConflict: 'room_id' }
          );
          if (e3) console.error('[room_closings upsert]', JSON.stringify(e3));
        }
      } else if (room.users.length === 0) {
        closingAt = Date.now() + GRACE_MS;
      }

      roomsPayload = { action: 'user-left', roomId, userId: data.id, closingAt };
      break;
    }
  }

  // Broadcast rooms update with the specific change as payload so clients
  // can update local state immediately without a round-trip to Supabase.
  // Awaited with try-catch so a Pusher error never blocks the room-specific event.
  if (roomsPayload) {
    try {
      await pusherServer.trigger('rooms', 'rooms-updated', roomsPayload);
    } catch (err) {
      console.error('[rooms-updated trigger]', String(err));
    }
  }

  await pusherServer.trigger(`room-${roomId}`, event, data);
  return NextResponse.json({ success: true });
}
