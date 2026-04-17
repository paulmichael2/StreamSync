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

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  if (hasSupabase) {
    const { supabase } = await import('@/lib/supabase');
    const { error } = await supabase.from('movies').delete().eq('id', params.id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  }

  // Local fallback
  const movies = readLocal();
  const filtered = movies.filter((m) => m.id !== params.id);
  writeLocal(filtered);
  return NextResponse.json({ success: true });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const body = await req.json();

  if (hasSupabase) {
    const { supabase } = await import('@/lib/supabase');
    const { error } = await supabase
      .from('movies')
      .update({ ...body, ...(body.videoUrl ? { video_url: body.videoUrl } : {}) })
      .eq('id', params.id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  }

  // Local fallback
  const movies = readLocal();
  const idx = movies.findIndex((m) => m.id === params.id);
  if (idx === -1) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  movies[idx] = { ...movies[idx], ...body };
  writeLocal(movies);
  return NextResponse.json(movies[idx]);
}
