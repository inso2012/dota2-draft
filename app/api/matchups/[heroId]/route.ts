import { NextResponse } from 'next/server';
import { fetchHeroMatchups } from '@/lib/opendota';

export const runtime = 'edge';

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ heroId: string }> }
) {
  const { heroId: heroIdStr } = await params;
  const heroId = parseInt(heroIdStr, 10);
  if (isNaN(heroId)) {
    return NextResponse.json({ error: 'Invalid hero ID' }, { status: 400 });
  }

  try {
    const matchups = await fetchHeroMatchups(heroId);
    return NextResponse.json(matchups, {
      headers: {
        'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=300',
      },
    });
  } catch (err) {
    console.error('Failed to fetch matchups:', err);
    return NextResponse.json([], { status: 200 });
  }
}
