import { createHash, createHmac } from 'crypto';

const SECRET = process.env.ADMIN_JWT_SECRET || 'heartsync-dev-secret-change-in-prod';
const SALT   = 'heartsync';

export const DEFAULT_EMAIL = 'admin@gmail.com';

export function hashPassword(password: string): string {
  return createHash('sha256').update(`${SALT}:${password}`).digest('hex');
}

export const DEFAULT_HASH = hashPassword('admin123');

export function createToken(): string {
  const payload = JSON.stringify({ role: 'admin', exp: Date.now() + 24 * 60 * 60 * 1000 });
  const data    = Buffer.from(payload).toString('base64url');
  const sig     = createHmac('sha256', SECRET).update(data).digest('base64url');
  return `${data}.${sig}`;
}

export function verifyToken(token: string | undefined): boolean {
  if (!token) return false;
  try {
    const [data, sig] = token.split('.');
    if (!data || !sig) return false;
    const expected = createHmac('sha256', SECRET).update(data).digest('base64url');
    if (sig !== expected) return false;
    const payload = JSON.parse(Buffer.from(data, 'base64url').toString());
    return payload.role === 'admin' && payload.exp > Date.now();
  } catch {
    return false;
  }
}
