import { NextResponse } from 'next/server';
import { roomStates } from '@/lib/roomStates';

export async function GET() {
  const active = Object.entries(roomStates)
    .filter(([, s]) => s.users.length > 0)
    .map(([id, s]) => ({ id, ...s }));
  return NextResponse.json(active);
}
