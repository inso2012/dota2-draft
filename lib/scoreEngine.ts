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
  // How many heroes that counter this pick have been banned (safety indicator)
  bannedCounterCount: number;
  bannedCounterBonus: number;
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
  // How many important roles this hero fills that enemy team is missing
  enemyRoleGapFill: number;
}

export function analyzePickHero(
  hero: Hero,
  myPicks: Hero[],
  enemyPicks: Hero[],
  allBannedHeroes: Hero[],
  matchupCache: Record<number, HeroMatchup[]>,
): PickAnalysis {
  const proWR = calcProWinRate(hero);
  const pubWR = calcPubWinRate(hero);
  const baseWR = proWR > 0 ? proWR : pubWR;

  // Counter score: this hero's win rate vs each enemy pick
  const heroMatchups = matchupCache[hero.id] ?? [];
  const heroMatchupMap = new Map(heroMatchups.map((m) => [m.hero_id, m]));

  let counterScore = 0.5;
  let counterDataPoints = 0;
  if (enemyPicks.length > 0) {
    let total = 0;
    let count = 0;
    for (const enemy of enemyPicks) {
      const m = heroMatchupMap.get(enemy.id);
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

  // Banned counter bonus: if heroes that counter this pick have been banned, it becomes safer
  let bannedCounterCount = 0;
  let bannedCounterBonus = 0;
  for (const bannedHero of allBannedHeroes) {
    const m = heroMatchupMap.get(bannedHero.id);
    if (m && m.games_played > 50) {
      const wrVsBanned = calcMatchupWinRate(m);
      if (wrVsBanned < 0.48) {
        // This banned hero was a counter to our candidate — its removal is a safety boost
        bannedCounterBonus += (0.48 - wrVsBanned) * 0.3;
        bannedCounterCount++;
      }
    }
  }
  bannedCounterBonus = Math.min(bannedCounterBonus, 0.03);

  // Combined lineup win rate: base + counter adjustment + synergy + banned-counter safety
  const counterAdj = counterDataPoints > 0 ? (counterScore - 0.5) * 0.45 : 0;
  const combinedWinRate = Math.min(0.78, Math.max(0.28, baseWR + counterAdj + synergyBonus + bannedCounterBonus));

  const reasons: string[] = [];
  if (baseWR >= 0.54) reasons.push('high_wr');
  if (hero.pro_pick >= 50) reasons.push('meta');
  if (counterScore >= 0.54 && counterDataPoints > 0) reasons.push('counter');
  if (synergyBonus > 0.02) reasons.push('synergy');
  if (hero.roles.length >= 3) reasons.push('flex');
  if (bannedCounterCount > 0) reasons.push('safe_pick');

  return {
    proWinRate: proWR,
    pubWinRate: pubWR,
    counterScore: counterDataPoints > 0 ? counterScore : 0,
    counterDataPoints,
    synergyBonus,
    combinedWinRate,
    reasons,
    bannedCounterCount,
    bannedCounterBonus,
  };
}

export function analyzeBanHero(
  hero: Hero,
  myPicks: Hero[],
  enemyPicks: Hero[],
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

  // Enemy role gap: how many important roles this hero fills that enemy currently lacks
  // If it fills gaps in enemy's lineup, it's a natural pick for them → higher ban priority
  const importantRoles = ['Carry', 'Support', 'Initiator', 'Nuker', 'Disabler'];
  const enemyRoles = new Set(enemyPicks.flatMap((h) => h.roles));
  let enemyRoleGapFill = 0;
  if (enemyPicks.length > 0) {
    for (const role of hero.roles) {
      if (importantRoles.includes(role) && !enemyRoles.has(role)) enemyRoleGapFill++;
    }
  }
  const enemyFillAdj = enemyPicks.length > 0 ? enemyRoleGapFill * 0.01 : 0;

  // Our win rate improvement from banning this hero
  const banImpact = Math.max(0, (threatScore - 0.5) * 0.55);
  const winRateIfBanned = Math.min(0.78, 0.5 + banImpact);

  const banScore = heroStrength * 0.3 + threatScore * 0.4 + proBanRate * 0.3 + enemyFillAdj;
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
    enemyRoleGapFill,
  };
}

export function buildBanRecommendations(
  availableHeroes: Hero[],
  myPicks: Hero[],
  enemyPicks: Hero[],
  matchupCache: Record<number, HeroMatchup[]>,
) {
  return availableHeroes
    .map((hero) => {
      const analysis = analyzeBanHero(hero, myPicks, enemyPicks, matchupCache);
      const enemyFillAdj = enemyPicks.length > 0 ? analysis.enemyRoleGapFill * 0.01 : 0;
      const scoreA = analysis.heroStrength * 0.3 + analysis.threatScore * 0.4 + analysis.proBanRate * 0.3 + enemyFillAdj;
      return { hero, analysis, score: scoreA };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 12);
}

export function buildPickRecommendations(
  availableHeroes: Hero[],
  myPicks: Hero[],
  enemyPicks: Hero[],
  allBannedHeroes: Hero[],
  matchupCache: Record<number, HeroMatchup[]>,
) {
  return availableHeroes
    .map((hero) => {
      const analysis = analyzePickHero(hero, myPicks, enemyPicks, allBannedHeroes, matchupCache);
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
