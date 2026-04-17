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
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  const { id } = await Promise.resolve(params);

  if (hasSupabase) {
    const { supabase } = await import('@/lib/supabase');
    const { error } = await supabase.from('movies').delete().eq('id', id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  }

  // Local fallback
  const movies = readLocal();
  writeLocal(movies.filter((m) => m.id !== id));
  return NextResponse.json({ success: true });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  const { id } = await Promise.resolve(params);
  const body = await req.json();

  // Build an explicit, whitelist-only update object with snake_case keys for Supabase.
  // Spreading body directly can include unknown fields that cause Supabase to reject the update.
  const update: Record<string, unknown> = {};
  if (body.title       !== undefined) update.title       = body.title;
  if (body.description !== undefined) update.description = body.description;
  if (body.genre       !== undefined) update.genre       = body.genre;
  if (body.genres      !== undefined) update.genres      = body.genres;
  if (body.year        !== undefined) update.year        = Number(body.year);
  if (body.rating      !== undefined) update.rating      = Number(body.rating);
  if (body.thumbnail   !== undefined) update.thumbnail   = body.thumbnail;
  if (body.backdrop    !== undefined) update.backdrop    = body.backdrop;
  if (body.duration    !== undefined) update.duration    = body.duration;
  if (body.featured    !== undefined) update.featured    = body.featured;
  if (body.videoUrl    !== undefined) update.video_url   = body.videoUrl;
  if (body.subtitleUrl !== undefined) update.subtitle_url = body.subtitleUrl;

  if (hasSupabase) {
    const { supabase } = await import('@/lib/supabase');

    // Try full update first; if subtitle_url column doesn't exist yet, retry without it
    let { error } = await supabase.from('movies').update(update).eq('id', id);
    if (error && error.message.includes('subtitle_url')) {
      const { subtitle_url: _dropped, ...updateWithoutSubtitle } = update;
      void _dropped;
      const retry = await supabase.from('movies').update(updateWithoutSubtitle).eq('id', id);
      error = retry.error;
      if (!error) {
        return NextResponse.json({
          success: true,
          warning: 'subtitle_url column missing — run: ALTER TABLE movies ADD COLUMN IF NOT EXISTS subtitle_url TEXT DEFAULT \'\';',
        });
      }
    }
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  }

  // Local fallback
  const movies = readLocal();
  const idx = movies.findIndex((m) => m.id === id);
  if (idx === -1) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  const merged = { ...movies[idx], ...body };
  if (body.videoUrl) merged.videoUrl = body.videoUrl;
  if (body.subtitleUrl !== undefined) merged.subtitleUrl = body.subtitleUrl;
  movies[idx] = merged;
  writeLocal(movies);
  return NextResponse.json(movies[idx]);
}
