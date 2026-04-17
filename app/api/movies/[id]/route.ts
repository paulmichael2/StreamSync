import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { Movie } from '@/lib/types';

const moviesPath = path.join(process.cwd(), 'data', 'movies.json');

function readMovies(): Movie[] {
  try {
    return JSON.parse(fs.readFileSync(moviesPath, 'utf-8'));
  } catch {
    return [];
  }
}

function writeMovies(movies: Movie[]) {
  fs.writeFileSync(moviesPath, JSON.stringify(movies, null, 2));
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const movies = readMovies();
  const filtered = movies.filter((m) => m.id !== params.id);
  if (filtered.length === movies.length) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
  writeMovies(filtered);
  return NextResponse.json({ success: true });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const body = await req.json();
  const movies = readMovies();
  const idx = movies.findIndex((m) => m.id === params.id);
  if (idx === -1) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
  movies[idx] = { ...movies[idx], ...body };
  writeMovies(movies);
  return NextResponse.json(movies[idx]);
}
