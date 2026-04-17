import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

function toMovie(row: Record<string, unknown>) {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    genre: row.genre,
    genres: row.genres,
    year: row.year,
    rating: row.rating,
    thumbnail: row.thumbnail,
    backdrop: row.backdrop,
    videoUrl: row.video_url,
    duration: row.duration,
    featured: row.featured,
  };
}

export async function GET() {
  const { data, error } = await supabase
    .from('movies')
    .select('*')
    .order('created_at', { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json((data ?? []).map(toMovie));
}

export async function POST(req: NextRequest) {
  const body = await req.json();

  const { data, error } = await supabase
    .from('movies')
    .insert({
      id: Date.now().toString(),
      title: body.title,
      description: body.description ?? '',
      genre: body.genre ?? 'Action',
      genres: body.genres ?? [body.genre],
      year: Number(body.year),
      rating: Number(body.rating),
      thumbnail: body.thumbnail ?? '',
      backdrop: body.backdrop || body.thumbnail || '',
      video_url: body.videoUrl,
      duration: body.duration ?? 'N/A',
      featured: body.featured ?? false,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(toMovie(data as Record<string, unknown>), { status: 201 });
}
