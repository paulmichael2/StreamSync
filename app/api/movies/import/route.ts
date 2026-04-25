import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/adminAuth';

const COOKIE = 'heartsync_admin';

const hasSupabase =
  !!process.env.NEXT_PUBLIC_SUPABASE_URL &&
  !process.env.NEXT_PUBLIC_SUPABASE_URL.includes('placeholder');

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function normalise(m: any) {
  return {
    id: Date.now().toString() + Math.random().toString(36).slice(2, 7),
    title:       m.title ?? '',
    description: m.description ?? '',
    genre:       m.genre ?? 'Action',
    genres:      Array.isArray(m.genres) ? m.genres : [m.genre ?? 'Action'],
    year:        Number(m.year) || new Date().getFullYear(),
    rating:      Number(m.rating) || 0,
    thumbnail:   m.thumbnail ?? '',
    backdrop:    m.backdrop || m.thumbnail || '',
    video_url:   m.videoUrl ?? m.video_url ?? m.m3u8Url ?? '',
    duration:    m.duration ?? 'N/A',
    featured:    m.featured ?? false,
    subtitle_url: m.subtitleUrl ?? m.subtitle_url ?? '',
  };
}

export async function POST(req: NextRequest) {
  const cookieStore = await cookies();
  if (!verifyToken(cookieStore.get(COOKIE)?.value)) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  let incoming: unknown[];
  try {
    const body = await req.json();
    incoming = Array.isArray(body) ? body : [];
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  if (incoming.length === 0) {
    return NextResponse.json({ error: 'No movies in payload' }, { status: 400 });
  }

  if (hasSupabase) {
    const { supabase } = await import('@/lib/supabase');

    // Fetch existing titles (lowercase) for dedup
    const { data: existing } = await supabase.from('movies').select('title');
    const existingTitles = new Set(
      (existing ?? []).map((r: { title: string }) => r.title.toLowerCase().trim())
    );

    const toInsert = incoming
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .filter((m: any) => m.title && !existingTitles.has(m.title.toLowerCase().trim()))
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .map((m: any) => normalise(m));

    const skipped = incoming.length - toInsert.length;

    if (toInsert.length === 0) {
      return NextResponse.json({ imported: 0, skipped, message: 'All movies already exist.' });
    }

    // Insert in batches of 50 to avoid payload limits
    let imported = 0;
    const errors: string[] = [];
    for (let i = 0; i < toInsert.length; i += 50) {
      const batch = toInsert.slice(i, i + 50);
      const { error } = await supabase.from('movies').insert(batch);
      if (error) {
        errors.push(error.message);
      } else {
        imported += batch.length;
      }
    }

    return NextResponse.json({
      imported,
      skipped,
      errors: errors.length ? errors : undefined,
      message: `Imported ${imported} movie${imported !== 1 ? 's' : ''}${skipped ? `, skipped ${skipped} duplicate${skipped !== 1 ? 's' : ''}` : ''}.`,
    });
  }

  // Local fallback
  const fs = await import('fs');
  const path = await import('path');
  const moviesPath = path.join(process.cwd(), 'data', 'movies.json');
  let local: { title: string }[] = [];
  try { local = JSON.parse(fs.readFileSync(moviesPath, 'utf-8')); } catch { local = []; }

  const existingTitles = new Set(local.map((m) => m.title.toLowerCase().trim()));
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const toInsert = incoming.filter((m: any) => m.title && !existingTitles.has(m.title.toLowerCase().trim()));
  const skipped = incoming.length - toInsert.length;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const newMovies = toInsert.map((m: any) => {
    const n = normalise(m);
    return { ...n, videoUrl: n.video_url, subtitleUrl: n.subtitle_url };
  });
  fs.writeFileSync(moviesPath, JSON.stringify([...local, ...newMovies], null, 2));

  return NextResponse.json({
    imported: newMovies.length,
    skipped,
    message: `Imported ${newMovies.length} movie${newMovies.length !== 1 ? 's' : ''}${skipped ? `, skipped ${skipped} duplicate${skipped !== 1 ? 's' : ''}` : ''}.`,
  });
}
