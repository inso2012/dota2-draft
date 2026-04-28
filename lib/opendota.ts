import { Hero, HeroMatchup } from './types';

const OPENDOTA_BASE = 'https://api.opendota.com/api';
const CDN_BASE = 'https://cdn.cloudflare.steamstatic.com';

// Cache TTL: 1 hour for hero stats (they update daily on OpenDota)
const CACHE_TTL = 3600;

export interface OpenDotaHeroStat {
  id: number;
  name: string;
  localized_name: string;
  primary_attr: string;
  attack_type: string;
  roles: string[];
  img: string;
  icon: string;
  pro_win: number;
  pro_pick: number;
  pro_ban: number;
  pub_win: number;
  pub_pick: number;
  '1_pick'?: number;
  '1_win'?: number;
  '2_pick'?: number;
  '2_win'?: number;
  '3_pick'?: number;
  '3_win'?: number;
  '4_pick'?: number;
  '4_win'?: number;
  '5_pick'?: number;
  '5_win'?: number;
  '6_pick'?: number;
  '6_win'?: number;
  '7_pick'?: number;
  '7_win'?: number;
  '8_pick'?: number;
  '8_win'?: number;
  turbo_picks?: number;
  turbo_wins?: number;
}

export async function fetchAllHeroes(): Promise<Hero[]> {
  const res = await fetch(`${OPENDOTA_BASE}/heroStats`, {
    // Edge-compatible cache: let Cloudflare CDN cache via response headers
    cache: 'no-store',
  });

  if (!res.ok) throw new Error(`OpenDota API error: ${res.status}`);

  const data: OpenDotaHeroStat[] = await res.json();

  return data.map((h) => ({
    id: h.id,
    name: h.name,
    localized_name: h.localized_name,
    primary_attr: h.primary_attr as Hero['primary_attr'],
    attack_type: h.attack_type as Hero['attack_type'],
    roles: h.roles,
    pro_win: h.pro_win ?? 0,
    pro_pick: h.pro_pick ?? 0,
    pro_ban: h.pro_ban ?? 0,
    pub_win: h.pub_win ?? 0,
    pub_pick: h.pub_pick ?? 0,
    image_url: `${CDN_BASE}${h.img}`,
    icon_url: `${CDN_BASE}${h.icon}`,
  }));
}

export async function fetchHeroMatchups(heroId: number): Promise<HeroMatchup[]> {
  const res = await fetch(`${OPENDOTA_BASE}/heroes/${heroId}/matchups`, {
    cache: 'no-store',
  });

  if (!res.ok) return [];

  return res.json();
}

export function calcProWinRate(hero: Hero): number {
  if (hero.pro_pick === 0) return 0;
  return hero.pro_win / hero.pro_pick;
}

export function calcPubWinRate(hero: Hero): number {
  if (hero.pub_pick === 0) return 0;
  return hero.pub_win / hero.pub_pick;
}

export function calcMatchupWinRate(matchup: HeroMatchup): number {
  if (matchup.games_played === 0) return 0.5;
  return matchup.wins / matchup.games_played;
}
