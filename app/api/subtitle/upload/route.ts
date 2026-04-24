import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/adminAuth';

const COOKIE = 'heartsync_admin';

export async function POST(req: NextRequest) {
  // Require admin session
  const cookieStore = await cookies();
  if (!verifyToken(cookieStore.get(COOKIE)?.value)) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  // Read env vars at request time (not build time)
  const supabaseUrl     = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
  const serviceRoleKey  = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';

  if (!supabaseUrl || supabaseUrl.includes('placeholder')) {
    return NextResponse.json({ error: 'Supabase is not configured.' }, { status: 503 });
  }

  if (!serviceRoleKey) {
    return NextResponse.json(
      { error: 'SUPABASE_SERVICE_ROLE_KEY is not set. Add it in Vercel → Settings → Environment Variables.' },
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

  if (file.size > 2 * 1024 * 1024) {
    return NextResponse.json({ error: 'File too large (max 2MB)' }, { status: 400 });
  }

  const { createClient } = await import('@supabase/supabase-js');
  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
    global: { fetch: (input, init) => fetch(input, { ...init, cache: 'no-store' }) },
  });

  const filename = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  const { error } = await admin.storage
    .from('subtitles')
    .upload(filename, buffer, {
      contentType: ext === 'vtt' ? 'text/vtt' : 'application/x-subrip',
      upsert: false,
    });

  if (error) {
    if (error.message?.includes('not found') || error.message?.includes('Bucket')) {
      return NextResponse.json(
        { error: 'Bucket "subtitles" not found. Go to Supabase → Storage → New bucket → name "subtitles", enable Public.' },
        { status: 503 }
      );
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const { data: publicData } = admin.storage.from('subtitles').getPublicUrl(filename);
  return NextResponse.json({ url: publicData.publicUrl });
}
