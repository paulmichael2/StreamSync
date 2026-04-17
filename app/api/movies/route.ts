import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { Movie } from '@/lib/types';

const hasSupabase =
  process.env.NEXT_PUBLIC_SUPABASE_URL &&
  !process.env.NEXT_PUBLIC_SUPABASE_URL.includes('placeholder');

const moviesPath = path.join(process.cwd(), 'data', 'movies.json');

function readLocal(): Movie[] {
  try {
    return JSON.parse(fs.readFileSync(moviesPath, 'utf-8'));
  } catch {
    return [];
  }
}

function writeLocal(movies: Movie[]) {
  fs.writeFileSync(moviesPath, JSON.stringify(movies, null, 2));
}

function toMovie(row: Record<string, unknown>): Movie {
  return {
    id: row.id as string,
    title: row.title as string,
    description: row.description as string,
    genre: row.genre as string,
    genres: row.genres as string[],
    year: row.year as number,
    rating: row.rating as number,
    thumbnail: row.thumbnail as string,
    backdrop: row.backdrop as string,
    videoUrl: (row.video_url ?? row.videoUrl) as string,
    duration: row.duration as string,
    featured: row.featured as boolean,
  };
}

export async function GET() {
  if (hasSupabase) {
    const { supabase } = await import('@/lib/supabase');
    const { data, error } = await supabase
      .from('movies')
      .select('*')
      .order('created_at', { ascending: true });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json((data ?? []).map((r) => toMovie(r as Record<string, unknown>)));
  }

  // Local fallback
  return NextResponse.json(readLocal());
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const newMovie: Movie = {
    id: Date.now().toString(),
    title: body.title,
    description: body.description ?? '',
    genre: body.genre ?? 'Action',
    genres: body.genres ?? [body.genre],
    year: Number(body.year),
    rating: Number(body.rating),
    thumbnail: body.thumbnail ?? '',
    backdrop: body.backdrop || body.thumbnail || '',
    videoUrl: body.videoUrl,
    duration: body.duration ?? 'N/A',
    featured: body.featured ?? false,
  };

  if (hasSupabase) {
    const { supabase } = await import('@/lib/supabase');
    const { data, error } = await supabase
      .from('movies')
      .insert({ ...newMovie, video_url: newMovie.videoUrl })
      .select()
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(toMovie(data as Record<string, unknown>), { status: 201 });
  }

  // Local fallback
  const movies = readLocal();
  movies.push(newMovie);
  writeLocal(movies);
  return NextResponse.json(newMovie, { status: 201 });
}
