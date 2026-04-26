import { NextRequest, NextResponse } from 'next/server';

// Proxies HLS .m3u8 manifests and .ts segments so HLS.js fetches
// from our own origin — avoids CORS blocks from the video CDN.
export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get('url');
  if (!url) return new NextResponse('Missing url', { status: 400 });

  let decoded: string;
  try {
    decoded = decodeURIComponent(url);
  } catch {
    return new NextResponse('Invalid url', { status: 400 });
  }

  // Only proxy http/https URLs
  if (!/^https?:\/\//i.test(decoded)) {
    return new NextResponse('Forbidden', { status: 403 });
  }

  let upstream: Response;
  try {
    upstream = await fetch(decoded, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; HeartSync/1.0)',
        'Referer': decoded, // some CDNs check Referer
      },
      cache: 'no-store',
    });
  } catch {
    return new NextResponse('Upstream fetch failed', { status: 502 });
  }

  if (!upstream.ok) {
    return new NextResponse('Upstream error', { status: upstream.status });
  }

  const contentType = upstream.headers.get('content-type') ?? 'application/octet-stream';
  const body = await upstream.arrayBuffer();

  // If this is an .m3u8 manifest, rewrite segment URLs so they also go through the proxy
  if (
    contentType.includes('mpegurl') ||
    contentType.includes('x-mpegurl') ||
    decoded.includes('.m3u8')
  ) {
    const text = new TextDecoder().decode(body);
    const base = decoded.substring(0, decoded.lastIndexOf('/') + 1);

    const rewritten = text
      .split('\n')
      .map((line) => {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) return line;
        // Resolve relative URLs to absolute, then wrap in proxy
        const absolute = trimmed.startsWith('http')
          ? trimmed
          : base + trimmed;
        return `/api/proxy?url=${encodeURIComponent(absolute)}`;
      })
      .join('\n');

    return new NextResponse(rewritten, {
      headers: {
        'Content-Type': 'application/vnd.apple.mpegurl',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'no-store',
      },
    });
  }

  return new NextResponse(body, {
    headers: {
      'Content-Type': contentType,
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 'public, max-age=300',
    },
  });
}
