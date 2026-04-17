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
        const { error } = await supabase.from('room_sessions').upsert(
          { user_id: data.id, room_id: roomId, username: data.username, movie_id: data.movieId ?? '', updated_at: new Date().toISOString() },
          { onConflict: 'user_id,room_id' }
        );
        if (error) console.error('[room_sessions upsert]', JSON.stringify(error));
      }
      break;

    case 'user-left':
      room.users = room.users.filter((u) => u.id !== data.id);
      room.updatedAt = Date.now();

      if (hasSupabase) {
        const { supabase } = await import('@/lib/supabase');
        const { error } = await supabase.from('room_sessions').delete()
          .eq('user_id', data.id).eq('room_id', roomId);
        if (error) console.error('[room_sessions delete]', error.message);
      }
      break;
  }

  // Broadcast rooms update so /rooms page stays in sync
  if (event === 'user-joined' || event === 'user-left') {
    pusherServer.trigger('rooms', 'rooms-updated', {}).catch(() => {});
  }

  await pusherServer.trigger(`room-${roomId}`, event, data);
  return NextResponse.json({ success: true });
}
