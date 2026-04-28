'use client';

import { useMemo } from 'react';
import { Hero } from '@/lib/types';
import { Language, ls } from '@/lib/i18n';
import { calcProWinRate, calcPubWinRate } from '@/lib/opendota';
import { getHeroDisplayName } from '@/lib/heroNames';
import clsx from 'clsx';

interface DraftSummaryProps {
  radiantPicks: Hero[];
  direPicks: Hero[];
  lang: Language;
  onReset: () => void;
}

// Dota 2 positions 1–5
type Position = 1 | 2 | 3 | 4 | 5;

interface PositionedHero {
  hero: Hero;
  position: Position;
}

const POSITION_META: Record<
  Position,
  { icon: string; zh: string; sv: string; en: string; lane: 'safe' | 'mid' | 'off' | 'roam' }
> = {
  1: { icon: '🗡', zh: '核心', sv: 'Core', en: 'Carry',     lane: 'safe' },
  2: { icon: '⚡', zh: '中路', sv: 'Mid',  en: 'Mid',       lane: 'mid'  },
  3: { icon: '🛡', zh: '上路', sv: 'Off',  en: 'Offlane',   lane: 'off'  },
  4: { icon: '🏹', zh: '游走', sv: 'Sem',  en: 'Soft Supp', lane: 'roam' },
  5: { icon: '💫', zh: '辅助', sv: 'Hjälp', en: 'Hard Supp', lane: 'safe' },
};

// Assign Dota 2 position based on hero roles using a scoring heuristic.
// Each role contributes a score to positions 1-5; highest score wins.
const ROLE_SCORES: Partial<Record<string, number[]>> = {
  //              P1  P2  P3  P4  P5
  Carry:        [ 4,  0,  1,  0,  0],
  Support:      [ 0,  0,  0,  2,  4],
  Nuker:        [ 0,  3,  1,  2,  0],
  Disabler:     [ 0,  1,  1,  3,  2],
  Initiator:    [ 0,  0,  4,  2,  0],
  Durable:      [ 0,  0,  3,  1,  0],
  Escape:       [ 1,  3,  1,  1,  0],
  Jungler:      [ 0,  0,  2,  2,  0],
  Pusher:       [ 1,  1,  2,  1,  0],
};

function suggestPosition(hero: Hero): Position {
  const scores = [0, 0, 0, 0, 0]; // indices 0–4 = positions 1–5
  for (const role of hero.roles) {
    const weights = ROLE_SCORES[role];
    if (weights) weights.forEach((w, i) => { scores[i] += w; });
  }
  const best = scores.indexOf(Math.max(...scores));
  return (best + 1) as Position;
}

// Greedy assignment: ensure each position 1–5 is used at most once.
// Remaining heroes are assigned their next-best position.
function assignPositions(heroes: Hero[]): PositionedHero[] {
  if (heroes.length === 0) return [];

  // Score each hero for each position
  const scoredHeroes = heroes.map((hero) => {
    const scores = [0, 0, 0, 0, 0];
    for (const role of hero.roles) {
      const weights = ROLE_SCORES[role];
      if (weights) weights.forEach((w, i) => { scores[i] += w; });
    }
    return { hero, scores };
  });

  const used = new Set<Position>();
  const result: PositionedHero[] = [];

  // First pass: assign each hero to their best unoccupied position
  const remaining: typeof scoredHeroes = [];
  for (const sh of scoredHeroes) {
    const sorted = sh.scores
      .map((s, i) => ({ pos: (i + 1) as Position, score: s }))
      .sort((a, b) => b.score - a.score);
    const pick = sorted.find((p) => !used.has(p.pos));
    if (pick) {
      used.add(pick.pos);
      result.push({ hero: sh.hero, position: pick.pos });
    } else {
      remaining.push(sh);
    }
  }

  // Second pass: assign remaining heroes to any open slots
  const allPositions: Position[] = [1, 2, 3, 4, 5];
  const openPositions = allPositions.filter((p) => !used.has(p));
  for (const sh of remaining) {
    const pos = openPositions.shift() ?? 3;
    result.push({ hero: sh.hero, position: pos as Position });
  }

  return result.sort((a, b) => a.position - b.position);
}

function heroWR(hero: Hero): number {
  const pro = calcProWinRate(hero);
  return pro > 0 ? pro : calcPubWinRate(hero);
}

function calcTeamWinRate(picks: Hero[]): number {
  if (picks.length === 0) return 0.5;
  return picks.reduce((sum, h) => sum + heroWR(h), 0) / picks.length;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function HeroLaneRow({
  ph,
  reverse,
  lang,
}: {
  ph: PositionedHero;
  reverse?: boolean;
  lang: Language;
}) {
  const meta = POSITION_META[ph.position];
  const wr = heroWR(ph.hero);
  const wrColor = wr >= 0.54 ? 'text-green-400' : wr >= 0.50 ? 'text-yellow-400' : 'text-red-400';

  return (
    <div className={clsx('flex items-center gap-2', reverse && 'flex-row-reverse')}>
      {/* Position badge */}
      <div className="flex items-center gap-1 w-20 shrink-0">
        <span className="text-base">{meta.icon}</span>
        <div className={clsx('flex flex-col', reverse && 'items-end')}>
          <span className="text-[9px] text-gray-500 font-mono">P{ph.position}</span>
          <span className="text-[9px] text-gray-400 leading-none">
            {ls(lang, meta.zh, meta.sv, meta.en)}
          </span>
        </div>
      </div>
      {/* Hero portrait */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={ph.hero.icon_url}
        alt={ph.hero.localized_name}
        className="w-8 h-8 rounded object-cover shrink-0"
      />
      {/* Name + WR */}
      <div className={clsx('flex-1 min-w-0', reverse && 'text-right')}>
        <div className="text-xs font-semibold text-gray-200 truncate">
          {getHeroDisplayName(ph.hero, lang)}
        </div>
        <div className={clsx('text-[10px]', wrColor)}>{(wr * 100).toFixed(1)}%</div>
      </div>
    </div>
  );
}

// Lane section used in the map: label + hero chips for one team in that lane
function LaneHeroChips({ heroes, team }: { heroes: PositionedHero[]; team: 'radiant' | 'dire' }) {
  if (heroes.length === 0) return null;
  const isRadiant = team === 'radiant';
  return (
    <div className={clsx('flex gap-1', !isRadiant && 'flex-row-reverse')}>
      {heroes.map(({ hero, position }) => (
        <div key={hero.id} className="relative">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={hero.icon_url} alt="" className="w-7 h-7 rounded object-cover" />
          <span
            className={clsx(
              'absolute -bottom-1 -right-1 text-[7px] font-bold w-3 h-3 rounded-full flex items-center justify-center',
              isRadiant ? 'bg-radiant text-black' : 'bg-dire text-white',
            )}
          >
            {position}
          </span>
        </div>
      ))}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function DraftSummary({ radiantPicks, direPicks, lang, onReset }: DraftSummaryProps) {
  const radiantPositioned = useMemo(() => assignPositions(radiantPicks), [radiantPicks]);
  const direPositioned = useMemo(() => assignPositions(direPicks), [direPicks]);

  const radiantWR = useMemo(() => calcTeamWinRate(radiantPicks), [radiantPicks]);
  const direWR = useMemo(() => calcTeamWinRate(direPicks), [direPicks]);

  // Normalise so the two bars always sum to 100%
  const total = radiantWR + direWR || 1;
  const radiantPct = Math.round((radiantWR / total) * 100);
  const direPct = 100 - radiantPct;

  // Group heroes by lane for the map view
  const laneMap = (positioned: PositionedHero[]) => ({
    top:  positioned.filter((p) => p.position === 3),  // offlane = top (by convention)
    mid:  positioned.filter((p) => p.position === 2),
    bot:  positioned.filter((p) => p.position === 1 || p.position === 5),
    roam: positioned.filter((p) => p.position === 4),
  });

  // For Radiant: safe=bot, off=top | For Dire: safe=top, off=bot
  const radiantLanes = laneMap(radiantPositioned);
  const direLanes   = laneMap(direPositioned);

  const LANE_LABELS = [
    { key: 'top' as const, zh: '上路',  sv: 'Topp', en: 'Top Lane'  },
    { key: 'mid' as const, zh: '中路',  sv: 'Mid',  en: 'Mid Lane'  },
    { key: 'bot' as const, zh: '下路',  sv: 'Bot',  en: 'Bot Lane'  },
  ];

  return (
    <div className="bg-game-panel/90 border border-game-gold/30 rounded-lg overflow-hidden">
      {/* ── Header ── */}
      <div className="px-4 py-3 border-b border-game-gold/20 flex items-center justify-between">
        <h2 className="text-game-gold font-bold text-sm tracking-wider uppercase">
          {ls(lang, '✓ 选人完成 — 阵容分析', '✓ Utkast klart — Laganalys', '✓ Draft Complete — Analysis')}
        </h2>
        <button
          onClick={onReset}
          className="px-3 py-1 bg-game-gold text-black font-bold rounded hover:bg-game-gold-light transition-colors text-xs"
        >
          {ls(lang, '重新开始', 'Nytt utkast', 'New Draft')}
        </button>
      </div>

      {/* ── Win-rate comparison ── */}
      <div className="px-4 py-3 border-b border-gray-800">
        <div className="flex items-center justify-between mb-1.5">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-radiant inline-block" />
            <span className="text-radiant-glow font-bold text-sm">
              {ls(lang, '天辉', 'Radiant', 'Radiant')}
            </span>
            <span className="text-green-400 font-mono text-sm">{(radiantWR * 100).toFixed(1)}%</span>
          </div>
          <span className="text-gray-500 text-xs">{ls(lang, '平均胜率', 'Snitt VF', 'Avg WR')}</span>
          <div className="flex items-center gap-2">
            <span className="text-red-400 font-mono text-sm">{(direWR * 100).toFixed(1)}%</span>
            <span className="text-dire-glow font-bold text-sm">
              {ls(lang, '夜魇', 'Dire', 'Dire')}
            </span>
            <span className="w-2 h-2 rounded-full bg-dire inline-block" />
          </div>
        </div>
        {/* Bar */}
        <div className="h-3 rounded-full overflow-hidden flex">
          <div
            className="bg-radiant transition-all"
            style={{ width: `${radiantPct}%` }}
          />
          <div
            className="bg-dire transition-all"
            style={{ width: `${direPct}%` }}
          />
        </div>
        <div className="flex justify-between mt-1 text-[10px] text-gray-500">
          <span>{radiantPct}%</span>
          <span>{direPct}%</span>
        </div>
      </div>

      {/* ── Lane map + position lists ── */}
      <div className="grid grid-cols-1 xl:grid-cols-3 divide-y xl:divide-y-0 xl:divide-x divide-gray-800">

        {/* Radiant position list */}
        <div className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <span className="w-2 h-2 rounded-full bg-radiant" />
            <h3 className="text-radiant-glow font-bold text-xs uppercase tracking-wider">
              {ls(lang, '天辉 — 分路建议', 'Radiant — Rollförslag', 'Radiant — Role Suggestions')}
            </h3>
          </div>
          <div className="flex flex-col gap-2.5">
            {radiantPositioned.map((ph) => (
              <HeroLaneRow key={ph.hero.id} ph={ph} lang={lang} />
            ))}
          </div>
        </div>

        {/* Dota 2 Map visualization (center column) */}
        <div className="p-4 flex flex-col gap-3">
          <h3 className="text-game-gold text-xs font-bold uppercase tracking-wider text-center">
            {ls(lang, '分路地图', 'Banor', 'Lane Map')}
          </h3>

          {/* Lane rows: Top / Mid / Bot */}
          {LANE_LABELS.map(({ key, zh, sv, en }) => {
            const radiantHeroes = key === 'top' ? radiantLanes.top
              : key === 'mid' ? [...radiantLanes.mid, ...radiantLanes.roam]
              : radiantLanes.bot;
            const direHeroes = key === 'top' ? [...direLanes.top, ...direLanes.roam]
              : key === 'mid' ? direLanes.mid
              : direLanes.bot;

            return (
              <div key={key} className="rounded border border-gray-800 bg-gray-900/40 p-2">
                <div className="text-center text-[10px] text-gray-500 uppercase tracking-wider mb-2">
                  {ls(lang, zh, sv, en)}
                </div>
                <div className="flex items-center justify-between gap-2">
                  {/* Radiant side of lane */}
                  <LaneHeroChips heroes={radiantHeroes} team="radiant" />
                  {/* Lane divider */}
                  <div className="flex-1 border-t border-dashed border-gray-700" />
                  {/* Dire side of lane */}
                  <LaneHeroChips heroes={direHeroes} team="dire" />
                </div>
              </div>
            );
          })}

          {/* Jungle / Roam note if any hero is position 4 */}
          {(radiantLanes.roam.length > 0 || direLanes.roam.length > 0) && (
            <div className="text-center text-[10px] text-gray-600">
              🏹 {ls(lang, '游走英雄已显示于中路区域', 'Roaming visas i midlane', 'Roamers shown in mid area')}
            </div>
          )}
        </div>

        {/* Dire position list */}
        <div className="p-4">
          <div className="flex items-center gap-2 justify-end mb-3">
            <h3 className="text-dire-glow font-bold text-xs uppercase tracking-wider">
              {ls(lang, '夜魇 — 分路建议', 'Dire — Rollförslag', 'Dire — Role Suggestions')}
            </h3>
            <span className="w-2 h-2 rounded-full bg-dire" />
          </div>
          <div className="flex flex-col gap-2.5">
            {direPositioned.map((ph) => (
              <HeroLaneRow key={ph.hero.id} ph={ph} reverse lang={lang} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
