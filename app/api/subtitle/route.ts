import { NextRequest, NextResponse } from 'next/server';

function srtToVtt(srt: string): string {
  return (
    'WEBVTT\n\n' +
    srt
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n')
      // SRT uses commas for milliseconds; VTT needs dots
      .replace(/(\d{2}:\d{2}:\d{2}),(\d{3})/g, '$1.$2')
      .trim()
  );
}

export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get('url');
  if (!url) {
    return NextResponse.json({ error: 'url param required' }, { status: 400 });
  }

  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
      // next: { revalidate: 3600 }, // optional cache
    });

    if (!res.ok) {
      return NextResponse.json(
        { error: `Upstream returned ${res.status}` },
        { status: 502 }
      );
    }

    const text = await res.text();
    // Auto-detect: if it already starts with WEBVTT, serve as-is
    const vtt = text.trimStart().startsWith('WEBVTT') ? text : srtToVtt(text);

    return new NextResponse(vtt, {
      headers: {
        'Content-Type': 'text/vtt; charset=utf-8',
        'Cache-Control': 'public, max-age=3600',
        // Allow the browser to load the track (same-origin after proxying)
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (err) {
    return NextResponse.json(
      { error: `Failed to fetch subtitle: ${String(err)}` },
      { status: 502 }
    );
  }
}
