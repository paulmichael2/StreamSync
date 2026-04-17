import { NextRequest, NextResponse } from 'next/server';
import { pusherServer } from '@/lib/pusher';
import { roomStates } from '@/lib/roomStates';

function getOrCreate(roomId: string) {
  if (!roomStates[roomId]) {
    roomStates[roomId] = { currentTime: 0, isPlaying: false, movieId: '', users: [], updatedAt: Date.now() };
  }
  return roomStates[roomId];
}

/** Broadcast the current active-rooms list to the global 'rooms' channel */
async function broadcastRooms() {
  const active = Object.entries(roomStates)
    .filter(([, s]) => s.users.length > 0)
    .map(([id, s]) => ({ id, ...s }));
  await pusherServer.trigger('rooms', 'rooms-updated', { rooms: active }).catch(() => {});
}

export async function GET(req: NextRequest) {
  const roomId = req.nextUrl.searchParams.get('roomId') || '';
  const state = roomStates[roomId] ?? { currentTime: 0, isPlaying: false, movieId: '', users: [], updatedAt: 0 };
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
      await broadcastRooms();
      break;
    case 'user-left':
      room.users = room.users.filter((u) => u.id !== data.id);
      room.updatedAt = Date.now();
      await broadcastRooms();
      break;
  }

  await pusherServer.trigger(`room-${roomId}`, event, data);
  return NextResponse.json({ success: true });
}
