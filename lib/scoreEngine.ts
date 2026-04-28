import { Hero, HeroMatchup } from './types';
import { calcProWinRate, calcPubWinRate, calcMatchupWinRate } from './opendota';

export interface PickAnalysis {
  proWinRate: number;
  pubWinRate: number;
  // Hero's win rate vs each enemy pick (0 = no data)
  counterScore: number;
  counterDataPoints: number;
  // Role gap fill bonus
  synergyBonus: number;
  // Final combined lineup win rate estimate
  combinedWinRate: number;
  reasons: string[];
}

export interface BanAnalysis {
  proBanRate: number;
  heroStrength: number;
  // How well this hero performs vs our current lineup (higher = more threatening)
  threatScore: number;
  threatDataPoints: number;
  // Estimated our win rate after banning this hero
  winRateIfBanned: number;
  banPriority: 'critical' | 'high' | 'medium' | 'low';
}

export function analyzePickHero(
  hero: Hero,
  myPicks: Hero[],
  enemyPicks: Hero[],
  matchupCache: Record<number, HeroMatchup[]>,
): PickAnalysis {
  const proWR = calcProWinRate(hero);
  const pubWR = calcPubWinRate(hero);
  const baseWR = proWR > 0 ? proWR : pubWR;

  // Counter score: this hero's win rate vs each enemy pick
  let counterScore = 0.5;
  let counterDataPoints = 0;
  if (enemyPicks.length > 0) {
    const heroMatchups = matchupCache[hero.id] ?? [];
    const matchupMap = new Map(heroMatchups.map((m) => [m.hero_id, m]));
    let total = 0;
    let count = 0;
    for (const enemy of enemyPicks) {
      const m = matchupMap.get(enemy.id);
      if (m && m.games_played > 50) {
        total += calcMatchupWinRate(m);
        count++;
      }
    }
    if (count > 0) {
      counterScore = total / count;
      counterDataPoints = count;
    }
  }

  // Synergy bonus: fills role gaps in current lineup
  const myRoles = new Set(myPicks.flatMap((h) => h.roles));
  let synergyBonus = 0;
  const importantRoles = ['Carry', 'Support', 'Initiator', 'Nuker', 'Disabler'];
  let gapsFilled = 0;
  for (const role of hero.roles) {
    if (importantRoles.includes(role) && !myRoles.has(role)) gapsFilled++;
  }
  synergyBonus = Math.min(gapsFilled * 0.015, 0.04);

  // Combined lineup win rate: base + counter adjustment + synergy
  const counterAdj = counterDataPoints > 0 ? (counterScore - 0.5) * 0.45 : 0;
  const combinedWinRate = Math.min(0.78, Math.max(0.28, baseWR + counterAdj + synergyBonus));

  const reasons: string[] = [];
  if (baseWR >= 0.54) reasons.push('high_wr');
  if (hero.pro_pick >= 50) reasons.push('meta');
  if (counterScore >= 0.54 && counterDataPoints > 0) reasons.push('counter');
  if (synergyBonus > 0.02) reasons.push('synergy');
  if (hero.roles.length >= 3) reasons.push('flex');

  return {
    proWinRate: proWR,
    pubWinRate: pubWR,
    counterScore: counterDataPoints > 0 ? counterScore : 0,
    counterDataPoints,
    synergyBonus,
    combinedWinRate,
    reasons,
  };
}

export function analyzeBanHero(
  hero: Hero,
  myPicks: Hero[],
  matchupCache: Record<number, HeroMatchup[]>,
): BanAnalysis {
  const proWR = calcProWinRate(hero);
  const pubWR = calcPubWinRate(hero);
  const heroStrength = proWR > 0 ? proWR : pubWR;

  const totalPB = hero.pro_ban + hero.pro_pick;
  const proBanRate = totalPB > 10 ? hero.pro_ban / totalPB : 0;

  // Threat to our team: average of (1 - ally's win rate vs this hero)
  // = how well this hero performs vs each of our allies
  let threatScore = heroStrength;
  let threatDataPoints = 0;

  if (myPicks.length > 0) {
    let totalThreats = 0;
    let count = 0;
    for (const ally of myPicks) {
      const allyMatchups = matchupCache[ally.id] ?? [];
      const m = allyMatchups.find((mu) => mu.hero_id === hero.id);
      if (m && m.games_played > 50) {
        // This hero's win rate vs our ally = 1 - ally's win rate vs it
        totalThreats += 1 - calcMatchupWinRate(m);
        count++;
        threatDataPoints++;
      }
    }
    if (count > 0) threatScore = totalThreats / count;
  }

  // Our win rate improvement from banning this hero:
  // If threat > 0.5, banning removes that advantage from the enemy
  const banImpact = Math.max(0, (threatScore - 0.5) * 0.55);
  const winRateIfBanned = Math.min(0.78, 0.5 + banImpact);

  const banScore = heroStrength * 0.3 + threatScore * 0.4 + proBanRate * 0.3;
  let banPriority: BanAnalysis['banPriority'];
  if (banScore >= 0.60) banPriority = 'critical';
  else if (banScore >= 0.53) banPriority = 'high';
  else if (banScore >= 0.47) banPriority = 'medium';
  else banPriority = 'low';

  return {
    proBanRate,
    heroStrength,
    threatScore,
    threatDataPoints,
    winRateIfBanned,
    banPriority,
  };
}

export function buildBanRecommendations(
  availableHeroes: Hero[],
  myPicks: Hero[],
  matchupCache: Record<number, HeroMatchup[]>,
) {
  return availableHeroes
    .map((hero) => {
      const analysis = analyzeBanHero(hero, myPicks, matchupCache);
      return { hero, analysis };
    })
    .sort((a, b) => {
      const scoreA = a.analysis.heroStrength * 0.3 + a.analysis.threatScore * 0.4 + a.analysis.proBanRate * 0.3;
      const scoreB = b.analysis.heroStrength * 0.3 + b.analysis.threatScore * 0.4 + b.analysis.proBanRate * 0.3;
      return scoreB - scoreA;
    })
    .slice(0, 12);
}

export function buildPickRecommendations(
  availableHeroes: Hero[],
  myPicks: Hero[],
  enemyPicks: Hero[],
  matchupCache: Record<number, HeroMatchup[]>,
) {
  return availableHeroes
    .map((hero) => {
      const analysis = analyzePickHero(hero, myPicks, enemyPicks, matchupCache);
      const score =
        (analysis.proWinRate > 0 ? analysis.proWinRate : analysis.pubWinRate) * 0.35 +
        (analysis.counterDataPoints > 0 ? analysis.counterScore : 0.5) * 0.4 +
        analysis.synergyBonus * 0.05 +
        (hero.pro_pick > 0 ? Math.min(hero.pro_pick / 300, 1) : 0) * 0.2;
      return { hero, analysis, score };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 12);
}
