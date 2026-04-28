import { NextResponse } from 'next/server';
import { fetchAllHeroes } from '@/lib/opendota';

export async function GET() {
  try {
    const heroes = await fetchAllHeroes();
    return NextResponse.json(heroes, {
      headers: {
        // Cloudflare CDN caches for 1 hour, browser for 5 min
        'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=300',
      },
    });
  } catch (err) {
    console.error('Failed to fetch heroes:', err);
    return NextResponse.json({ error: 'Failed to fetch heroes' }, { status: 500 });
  }
}
