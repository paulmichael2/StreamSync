// Shared in-memory room state — imported by /api/pusher and /api/rooms
// Both routes run on the same Node.js module cache, so state is shared within one instance.

export interface RoomUser {
  id: string;
  username: string;
}

export interface RoomState {
  currentTime: number;
  isPlaying: boolean;
  movieId: string;
  isPublic: boolean;
  users: RoomUser[];
  updatedAt: number;
}

export const roomStates: Record<string, RoomState> = {};
