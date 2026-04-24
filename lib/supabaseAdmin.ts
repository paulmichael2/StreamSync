import { createClient } from '@supabase/supabase-js';

// Service-role client — bypasses RLS. Server-side only, never import in client components.
const url        = process.env.NEXT_PUBLIC_SUPABASE_URL        ?? '';
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY       ?? '';

export const supabaseAdmin = url && serviceKey
  ? createClient(url, serviceKey, {
      auth: { persistSession: false },
      global: {
        fetch: (input, init) => fetch(input, { ...init, cache: 'no-store' }),
      },
    })
  : null;
