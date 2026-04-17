import { NextRequest, NextResponse } from 'next/server';
import { pusherServer } from '@/lib/pusher';

// In-memory room state — persists across requests on the same serverless instance
const roomStates: Record<string, {
  currentTime: number;
  isPlaying: boolean;
  movieId: string;
  users: { id: string; username: string }[];
}> = {};

// GET — return current room state for sync on join
export async function GET(req: NextRequest) {
  const roomId = req.nextUrl.searchParams.get('roomId') || '';
  const state = roomStates[roomId] ?? { currentTime: 0, isPlaying: false, movieId: '', users: [] };
  return NextResponse.json(state);
}

// POST — trigger a Pusher event and update room state
export async function POST(req: NextRequest) {
  const { roomId, event, data } = await req.json();

  if (!roomStates[roomId]) {
    roomStates[roomId] = { currentTime: 0, isPlaying: false, movieId: '', users: [] };
  }

  const room = roomStates[roomId];

  switch (event) {
    case 'play':
      room.currentTime = data.currentTime ?? room.currentTime;
      room.isPlaying = true;
      break;
    case 'pause':
      room.currentTime = data.currentTime ?? room.currentTime;
      room.isPlaying = false;
      break;
    case 'seek':
      room.currentTime = data.currentTime ?? room.currentTime;
      break;
    case 'user-joined':
      if (!room.users.find((u) => u.id === data.id)) {
        room.users.push({ id: data.id, username: data.username });
      }
      break;
    case 'user-left':
      room.users = room.users.filter((u) => u.id !== data.id);
      break;
  }

  // Broadcast to all subscribers of this room channel
  await pusherServer.trigger(`room-${roomId}`, event, data);

  return NextResponse.json({ success: true });
}
