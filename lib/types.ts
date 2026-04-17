export interface Movie {
  id: string;
  title: string;
  description: string;
  genre: string;
  genres: string[];
  year: number;
  rating: number;
  thumbnail: string;
  backdrop: string;
  videoUrl: string;
  duration: string;
  featured: boolean;
  subtitleUrl?: string;
}

export interface ChatMessage {
  id: string;
  username: string;
  message: string;
  timestamp: number;
  isSystem: boolean;
}

export interface Participant {
  id: string;
  username: string;
}

export interface RoomState {
  currentTime: number;
  isPlaying: boolean;
  movieId: string;
}
