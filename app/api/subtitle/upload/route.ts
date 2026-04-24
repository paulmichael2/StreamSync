import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/adminAuth';

const COOKIE = 'heartsync_admin';

const hasSupabase =
  !!process.env.NEXT_PUBLIC_SUPABASE_URL &&
  !process.env.NEXT_PUBLIC_SUPABASE_URL.includes('placeholder');

export async function POST(req: NextRequest) {
  // Require admin session
  const cookieStore = await cookies();
  if (!verifyToken(cookieStore.get(COOKIE)?.value)) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  if (!hasSupabase) {
    return NextResponse.json(
      { error: 'File upload requires Supabase storage. Use a direct URL instead.' },
      { status: 503 }
    );
  }

  const formData = await req.formData();
  const file = formData.get('file') as File | null;

  if (!file) {
    return NextResponse.json({ error: 'No file provided' }, { status: 400 });
  }

  const ext = file.name.split('.').pop()?.toLowerCase();
  if (ext !== 'srt' && ext !== 'vtt') {
    return NextResponse.json({ error: 'Only .srt and .vtt files are supported' }, { status: 400 });
  }

  // Max 2MB
  if (file.size > 2 * 1024 * 1024) {
    return NextResponse.json({ error: 'File too large (max 2MB)' }, { status: 400 });
  }

  const { supabase } = await import('@/lib/supabase');

  const filename = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  const { error } = await supabase.storage
    .from('subtitles')
    .upload(filename, buffer, {
      contentType: ext === 'vtt' ? 'text/vtt' : 'application/x-subrip',
      upsert: false,
    });

  if (error) {
    // Bucket may not exist — give a helpful message
    if (error.message?.includes('not found') || error.message?.includes('Bucket')) {
      return NextResponse.json(
        { error: 'Supabase "subtitles" storage bucket not found. Create it in your Supabase dashboard (Storage → New bucket → "subtitles", Public).' },
        { status: 503 }
      );
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const { data: publicData } = supabase.storage.from('subtitles').getPublicUrl(filename);

  return NextResponse.json({ url: publicData.publicUrl });
}
