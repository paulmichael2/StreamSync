import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import {
  hashPassword, createToken, verifyToken,
  DEFAULT_EMAIL, DEFAULT_HASH,
} from '@/lib/adminAuth';

const COOKIE = 'heartsync_admin';

const hasSupabase =
  !!process.env.NEXT_PUBLIC_SUPABASE_URL &&
  !process.env.NEXT_PUBLIC_SUPABASE_URL.includes('placeholder');

// In-memory fallback when Supabase is not configured
let memEmail = DEFAULT_EMAIL;
let memHash  = DEFAULT_HASH;

async function getCredentials() {
  if (hasSupabase) {
    const { supabase } = await import('@/lib/supabase');
    const { data, error } = await supabase
      .from('admin_config')
      .select('email, password_hash')
      .eq('id', 1)
      .single();

    if (error || !data) {
      // Table may not exist yet — auto-seed on first access
      await supabase.from('admin_config').upsert(
        { id: 1, email: DEFAULT_EMAIL, password_hash: DEFAULT_HASH },
        { onConflict: 'id' }
      ).then(() => {});
      return { email: DEFAULT_EMAIL, hash: DEFAULT_HASH };
    }
    return { email: data.email, hash: data.password_hash };
  }
  return { email: memEmail, hash: memHash };
}

async function saveCredentials(email: string, hash: string) {
  if (hasSupabase) {
    const { supabase } = await import('@/lib/supabase');
    await supabase.from('admin_config').upsert(
      { id: 1, email, password_hash: hash },
      { onConflict: 'id' }
    );
  } else {
    memEmail = email;
    memHash  = hash;
  }
}

// GET — verify session cookie
export async function GET() {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE)?.value;
  if (!verifyToken(token)) {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }
  return NextResponse.json({ authenticated: true });
}

// POST — login
export async function POST(req: NextRequest) {
  const { email, password } = await req.json();
  const creds = await getCredentials();

  if (email !== creds.email || hashPassword(password) !== creds.hash) {
    return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
  }

  const res = NextResponse.json({ success: true });
  res.cookies.set(COOKIE, createToken(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
    maxAge: 24 * 60 * 60,
  });
  return res;
}

// PATCH — change password
export async function PATCH(req: NextRequest) {
  const cookieStore = await cookies();
  if (!verifyToken(cookieStore.get(COOKIE)?.value)) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const { currentPassword, newPassword } = await req.json();
  if (!newPassword || newPassword.length < 6) {
    return NextResponse.json({ error: 'New password must be at least 6 characters' }, { status: 400 });
  }

  const creds = await getCredentials();
  if (hashPassword(currentPassword) !== creds.hash) {
    return NextResponse.json({ error: 'Current password is incorrect' }, { status: 401 });
  }

  await saveCredentials(creds.email, hashPassword(newPassword));
  return NextResponse.json({ success: true });
}

// DELETE — logout
export async function DELETE() {
  const res = NextResponse.json({ success: true });
  res.cookies.set(COOKIE, '', { maxAge: 0, path: '/' });
  return res;
}
