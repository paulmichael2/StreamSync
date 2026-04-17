import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { Movie } from '@/lib/types';

const moviesPath = path.join(process.cwd(), 'data', 'movies.json');

function readMovies(): Movie[] {
  try {
    const data = fs.readFileSync(moviesPath, 'utf-8');
    return JSON.parse(data);
  } catch {
    return [];
  }
}

function writeMovies(movies: Movie[]) {
  fs.writeFileSync(moviesPath, JSON.stringify(movies, null, 2));
}

export async function GET() {
  const movies = readMovies();
  return NextResponse.json(movies);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const movies = readMovies();

  const newMovie: Movie = {
    id: Date.now().toString(),
    title: body.title,
    description: body.description,
    genre: body.genre,
    genres: body.genres || [body.genre],
    year: Number(body.year),
    rating: Number(body.rating),
    thumbnail: body.thumbnail,
    backdrop: body.backdrop || body.thumbnail,
    videoUrl: body.videoUrl,
    duration: body.duration || 'N/A',
    featured: body.featured || false,
  };

  movies.push(newMovie);
  writeMovies(movies);

  return NextResponse.json(newMovie, { status: 201 });
}
