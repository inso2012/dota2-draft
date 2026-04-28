'use client';

import { useMemo, useState, useCallback, useEffect } from 'react';
import { Hero } from '@/lib/types';
import { Language, createTranslator, ls } from '@/lib/i18n';
import { useDraftStore, SortBy, SortDir } from '@/store/draftStore';
import { analyzePickHero, analyzeBanHero, PickAnalysis, BanAnalysis } from '@/lib/scoreEngine';
import { getHeroDisplayName } from '@/lib/heroNames';
import { calcProWinRate, calcPubWinRate } from '@/lib/opendota';
import HeroCard from './HeroCard';
import clsx from 'clsx';

interface HeroPoolProps {
  lang: Language;
}

const ATTR_FILTERS = [
  { key: 'all', icon: '★' },
  { key: 'str', icon: '⚔' },
  { key: 'agi', icon: '🏹' },
  { key: 'int', icon: '✨' },
  { key: 'all_attr', icon: '◆' },
] as const;

const ATTR_COLOR: Record<string, string> = {
  str: 'text-red-400 border-red-900',
  agi: 'text-green-400 border-green-900',
  int: 'text-blue-400 border-blue-900',
  all: 'text-purple-400 border-purple-900',
};

const PRIORITY_LABELS: Record<string, Record<Language, string>> = {
  critical: { zh: '极高 ⚠', sv: 'Kritisk ⚠', en: 'Critical ⚠' },
  high:     { zh: '高',      sv: 'Hög',        en: 'High'       },
  medium:   { zh: '中等',    sv: 'Medel',       en: 'Medium'     },
  low:      { zh: '低',      sv: 'Låg',        en: 'Low'        },
};
const PRIORITY_COLOR: Record<string, string> = {
  critical: 'text-red-400',
  high:     'text-orange-400',
  medium:   'text-yellow-400',
  low:      'text-gray-400',
};

// ─── Tooltip ───────────────────────────────────────────────────────────────

interface TooltipPos { x: number; y: number; above: boolean }

function WinRateBar({ value, label }: { value: number; label: string }) {
  const pct = Math.round(value * 100);
  const color = value >= 0.55 ? 'bg-green-500' : value >= 0.50 ? 'bg-yellow-500' : 'bg-red-500';
  return (
    <div className="flex items-center gap-2">
      <span className="text-gray-400 text-[10px] w-20 shrink-0">{label}</span>
      <div className="flex-1 h-1.5 bg-gray-800 rounded-full overflow-hidden">
        <div className={clsx('h-full rounded-full transition-all', color)} style={{ width: `${pct}%` }} />
      </div>
      <span className={clsx('text-[11px] font-mono w-10 text-right', value >= 0.5 ? 'text-green-400' : 'text-red-400')}>
        {pct}%
      </span>
    </div>
  );
}

function PickTooltip({ hero, analysis, lang }: { hero: Hero; analysis: PickAnalysis; lang: Language }) {
  const hasCounter = analysis.counterDataPoints > 0;
  const hasSynergy = analysis.synergyBonus > 0.005;
  const hasBannedCounters = analysis.bannedCounterCount > 0;

  return (
    <div className="w-64 pointer-events-none">
      {/* Header */}
      <div className="flex items-center gap-2 mb-2 pb-2 border-b border-gray-700">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={hero.icon_url} alt="" className="w-7 h-7 rounded object-cover" />
        <div>
          <div className="text-white font-semibold text-xs">{hero.localized_name}</div>
          <div className="text-[9px] text-blue-400">{ls(lang, '选取分析', 'Pickanalys', 'Pick Analysis')}</div>
        </div>
      </div>

      {/* Win rates */}
      <div className="flex flex-col gap-1.5 mb-2">
        {analysis.proWinRate > 0 && (
          <WinRateBar value={analysis.proWinRate} label={ls(lang, '职业胜率', 'Pro VF', 'Pro WR')} />
        )}
        <WinRateBar value={analysis.pubWinRate} label={ls(lang, '公共胜率', 'Pub VF', 'Pub WR')} />
        {hasCounter && (
          <WinRateBar value={analysis.counterScore} label={ls(lang, '克制对方', 'vs Fiende', 'vs Enemy')} />
        )}
        {hasSynergy && (
          <WinRateBar value={0.5 + analysis.synergyBonus} label={ls(lang, '阵容协同', 'Synergi', 'Synergy')} />
        )}
        {hasBannedCounters && (
          <WinRateBar value={0.5 + analysis.bannedCounterBonus} label={ls(lang, '克制已封禁', 'Räknare bannade', 'Counters Banned')} />
        )}
      </div>

      {/* Banned counter safety note */}
      {hasBannedCounters && (
        <div className="flex items-center gap-1.5 mb-2 px-2 py-1 rounded bg-green-950/40 border border-green-900/40">
          <span className="text-green-400 text-[10px]">🛡</span>
          <span className="text-green-300 text-[10px]">
            {ls(
              lang,
              `${analysis.bannedCounterCount} 个克制英雄已被封禁`,
              `${analysis.bannedCounterCount} räknare bannade`,
              `${analysis.bannedCounterCount} counter${analysis.bannedCounterCount > 1 ? 's' : ''} banned`,
            )}
          </span>
        </div>
      )}

      {/* Divider + combined */}
      <div className="border-t border-gray-700 pt-2">
        <div className="flex items-center justify-between">
          <span className="text-[10px] text-gray-400">{ls(lang, '加入阵容预计胜率', 'Uppsk. lag-VF', 'Est. Lineup WR')}</span>
          <span className={clsx(
            'text-sm font-bold',
            analysis.combinedWinRate >= 0.55 ? 'text-green-400' :
            analysis.combinedWinRate >= 0.50 ? 'text-yellow-400' : 'text-red-400',
          )}>
            {(analysis.combinedWinRate * 100).toFixed(1)}%
          </span>
        </div>
        <div className="mt-1 h-2 bg-gray-800 rounded-full overflow-hidden">
          <div
            className={clsx(
              'h-full rounded-full',
              analysis.combinedWinRate >= 0.55 ? 'bg-green-500' :
              analysis.combinedWinRate >= 0.50 ? 'bg-yellow-500' : 'bg-red-500',
            )}
            style={{ width: `${Math.round(analysis.combinedWinRate * 100)}%` }}
          />
        </div>
      </div>

      {/* Reason tags */}
      {analysis.reasons.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-2">
          {analysis.reasons.map((r) => {
            const labels: Record<string, Record<Language, string>> = {
              high_wr:   { zh: '📈 高胜率',  sv: '📈 Hög VF',      en: '📈 High WR'     },
              meta:      { zh: '🔥 强势',    sv: '🔥 Meta',        en: '🔥 Meta'        },
              counter:   { zh: '⚔ 克制',    sv: '⚔ Motverkar',   en: '⚔ Counter'      },
              synergy:   { zh: '🤝 协同',    sv: '🤝 Synergi',     en: '🤝 Synergy'     },
              flex:      { zh: '🔄 灵活',    sv: '🔄 Flexibel',    en: '🔄 Flex'        },
              safe_pick: { zh: '🛡 安全',    sv: '🛡 Säker',       en: '🛡 Safe Pick'   },
            };
            return (
              <span key={r} className="text-[9px] px-1.5 py-0.5 rounded-full bg-gray-800 border border-gray-700 text-gray-300">
                {labels[r]?.[lang] ?? r}
              </span>
            );
          })}
        </div>
      )}
    </div>
  );
}

function BanTooltip({ hero, analysis, lang }: { hero: Hero; analysis: BanAnalysis; lang: Language }) {
  const hasTheatData = analysis.threatDataPoints > 0;
  const hasEnemyFit = analysis.enemyRoleGapFill > 0;

  return (
    <div className="w-64 pointer-events-none">
      {/* Header */}
      <div className="flex items-center gap-2 mb-2 pb-2 border-b border-gray-700">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={hero.icon_url} alt="" className="w-7 h-7 rounded object-cover" />
        <div>
          <div className="text-white font-semibold text-xs">{hero.localized_name}</div>
          <div className="text-[9px] text-red-400">{ls(lang, '禁用分析', 'Bannanalys', 'Ban Analysis')}</div>
        </div>
      </div>

      {/* Stats */}
      <div className="flex flex-col gap-1.5 mb-2">
        <WinRateBar value={analysis.heroStrength} label={ls(lang, '英雄实力', 'Hjältestyrka', 'Hero Strength')} />
        {analysis.proBanRate > 0 && (
          <WinRateBar value={analysis.proBanRate} label={ls(lang, '职业Ban率', 'Pro Bannfrekvens', 'Pro Ban Rate')} />
        )}
        {hasTheatData && (
          <WinRateBar value={analysis.threatScore} label={ls(lang, '对我方威胁', 'Hot mot oss', 'Threat to Us')} />
        )}
      </div>

      {/* Enemy fit warning */}
      {hasEnemyFit && (
        <div className="flex items-center gap-1.5 mb-2 px-2 py-1 rounded bg-orange-950/40 border border-orange-900/40">
          <span className="text-orange-400 text-[10px]">⚠</span>
          <span className="text-orange-300 text-[10px]">
            {ls(
              lang,
              `契合敌方阵容 (补全 ${analysis.enemyRoleGapFill} 个缺失职能)`,
              `Passar fiendelaget (${analysis.enemyRoleGapFill} roll${analysis.enemyRoleGapFill > 1 ? 'er' : ''})`,
              `Fits enemy lineup (fills ${analysis.enemyRoleGapFill} role gap${analysis.enemyRoleGapFill > 1 ? 's' : ''})`,
            )}
          </span>
        </div>
      )}

      {/* Divider + win rate if banned */}
      <div className="border-t border-gray-700 pt-2">
        <div className="flex items-center justify-between">
          <span className="text-[10px] text-gray-400">{ls(lang, '禁掉后我方预计胜率', 'Vår VF om bannad', 'Our WR if Banned')}</span>
          <span className={clsx(
            'text-sm font-bold',
            analysis.winRateIfBanned >= 0.55 ? 'text-green-400' :
            analysis.winRateIfBanned >= 0.50 ? 'text-yellow-400' : 'text-gray-400',
          )}>
            {(analysis.winRateIfBanned * 100).toFixed(1)}%
          </span>
        </div>
        <div className="mt-1 h-2 bg-gray-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-red-500 rounded-full"
            style={{ width: `${Math.round(analysis.winRateIfBanned * 100)}%` }}
          />
        </div>
      </div>

      {/* Priority */}
      <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-700">
        <span className="text-[10px] text-gray-400">{ls(lang, 'Ban 优先级', 'Bannprioritet', 'Ban Priority')}</span>
        <span className={clsx('text-xs font-bold', PRIORITY_COLOR[analysis.banPriority])}>
          {PRIORITY_LABELS[analysis.banPriority][lang]}
        </span>
      </div>
    </div>
  );
}

function HeroTooltip({
  hero,
  pos,
  currentAction,
  myPicks,
  enemyPicks,
  allBannedHeroes,
  matchupCache,
  isFetching,
  lang,
}: {
  hero: Hero;
  pos: TooltipPos;
  currentAction: 'ban' | 'pick';
  myPicks: Hero[];
  enemyPicks: Hero[];
  allBannedHeroes: Hero[];
  matchupCache: Record<number, { hero_id: number; games_played: number; wins: number }[]>;
  isFetching: boolean;
  lang: Language;
}) {
  const analysis = useMemo(() => {
    if (currentAction === 'pick') {
      return analyzePickHero(hero, myPicks, enemyPicks, allBannedHeroes, matchupCache);
    } else {
      return analyzeBanHero(hero, myPicks, enemyPicks, matchupCache);
    }
  }, [hero, currentAction, myPicks, enemyPicks, allBannedHeroes, matchupCache]);

  const TOOLTIP_WIDTH = 256;
  const TOOLTIP_HEIGHT = 200;
  const GAP = 10;

  // Clamp X so tooltip stays within viewport
  const rawX = pos.x - TOOLTIP_WIDTH / 2;
  const clampedX = Math.max(8, Math.min(window.innerWidth - TOOLTIP_WIDTH - 8, rawX));
  const style: React.CSSProperties = {
    position: 'fixed',
    left: clampedX,
    zIndex: 9999,
    ...(pos.above
      ? { bottom: window.innerHeight - pos.y + GAP }
      : { top: pos.y + GAP }),
  };

  return (
    <div
      style={style}
      className={clsx(
        'bg-[#0f1520] border rounded-lg p-3 shadow-2xl',
        currentAction === 'pick' ? 'border-blue-800/70' : 'border-red-900/70',
      )}
    >
      {isFetching ? (
        <div className="flex items-center gap-2 text-gray-400 text-xs py-2">
          <div className="w-3 h-3 border border-gray-500 border-t-transparent rounded-full animate-spin" />
          {ls(lang, '加载数据...', 'Laddar...', 'Loading...')}
        </div>
      ) : currentAction === 'pick' ? (
        <PickTooltip hero={hero} analysis={analysis as PickAnalysis} lang={lang} />
      ) : (
        <BanTooltip hero={hero} analysis={analysis as BanAnalysis} lang={lang} />
      )}
    </div>
  );
}

// ─── Main HeroPool ──────────────────────────────────────────────────────────

export default function HeroPool({ lang }: HeroPoolProps) {
  const tr = createTranslator(lang);
  const {
    heroes,
    heroesLoaded,
    searchQuery,
    attrFilter,
    setSearchQuery,
    setAttrFilter,
    selectHero,
    isComplete,
    getCurrentStep,
    getBannedHeroIds,
    getPickedHeroIds,
    radiantPicks,
    direPicks,
    radiantBans,
    direBans,
    matchupCache,
    setMatchupData,
    getActiveTeam,
    sortBy,
    sortDir,
    setSortBy,
    setSortDir,
  } = useDraftStore();

  const [hoveredHero, setHoveredHero] = useState<Hero | null>(null);
  const [tooltipPos, setTooltipPos] = useState<TooltipPos>({ x: 0, y: 0, above: false });
  const [isFetching, setIsFetching] = useState(false);

  const bannedIds = getBannedHeroIds();
  const pickedIds = getPickedHeroIds();
  const currentStep = getCurrentStep();
  const activeTeam = getActiveTeam();
  const currentAction = currentStep?.action ?? 'pick';

  const myPicks = activeTeam === 'radiant' ? radiantPicks : direPicks;
  const enemyPicks = activeTeam === 'radiant' ? direPicks : radiantPicks;
  const allBannedHeroes = useMemo(() => [...radiantBans, ...direBans], [radiantBans, direBans]);

  // Fetch matchup data for hovered hero + our picks (needed for ban analysis)
  useEffect(() => {
    if (!hoveredHero) return;
    const heroesToFetch = [hoveredHero.id, ...myPicks.map((h) => h.id)];
    const missing = heroesToFetch.filter((id) => !matchupCache[id]);
    if (missing.length === 0) return;

    setIsFetching(true);
    Promise.all(
      missing.map((id) =>
        fetch(`/api/matchups/${id}`)
          .then((r) => r.json())
          .then((data) => setMatchupData(id, data))
          .catch(() => {})
      )
    ).finally(() => setIsFetching(false));
  }, [hoveredHero, myPicks, matchupCache, setMatchupData]);

  const handleMouseEnter = useCallback((hero: Hero, e: React.MouseEvent) => {
    if (bannedIds.has(hero.id) || pickedIds.has(hero.id)) return;
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const above = rect.top > window.innerHeight * 0.55;
    setHoveredHero(hero);
    setTooltipPos({
      x: rect.left + rect.width / 2,
      y: above ? rect.top : rect.bottom,
      above,
    });
  }, [bannedIds, pickedIds]);

  const handleMouseLeave = useCallback(() => {
    setHoveredHero(null);
  }, []);

  const filteredHeroes = useMemo(() => {
    let result = heroes;
    if (attrFilter !== 'all') {
      const attrKey = attrFilter === 'all_attr' ? 'all' : attrFilter;
      result = result.filter((h) => h.primary_attr === attrKey);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (h) =>
          h.localized_name.toLowerCase().includes(q) ||
          h.name.toLowerCase().includes(q) ||
          getHeroDisplayName(h, 'zh').includes(searchQuery)
      );
    }
    return result;
  }, [heroes, attrFilter, searchQuery]);

  const sortedHeroes = useMemo(() => {
    // dir=1 → high-to-low (desc), dir=-1 → low-to-high (asc)
    const dir = sortDir === 'desc' ? 1 : -1;
    return [...filteredHeroes].sort((a, b) => {
      const aUnavail = bannedIds.has(a.id) || pickedIds.has(a.id);
      const bUnavail = bannedIds.has(b.id) || pickedIds.has(b.id);
      if (aUnavail && !bUnavail) return 1;
      if (!aUnavail && bUnavail) return -1;

      if (sortBy === 'alpha') return a.localized_name.localeCompare(b.localized_name);
      if (sortBy === 'pro_pick') return dir * ((b.pro_pick ?? 0) - (a.pro_pick ?? 0));
      if (sortBy === 'pro_ban')  return dir * ((b.pro_ban  ?? 0) - (a.pro_ban  ?? 0));
      if (sortBy === 'pro_win')  return dir * (calcProWinRate(b) - calcProWinRate(a));
      if (sortBy === 'pub_win')  return dir * (calcPubWinRate(b) - calcPubWinRate(a));
      return 0;
    });
  }, [filteredHeroes, bannedIds, pickedIds, sortBy, sortDir]);

  if (!heroesLoaded) {
    return (
      <div className="bg-game-panel/80 border border-game-border rounded-lg p-6 flex flex-col items-center justify-center gap-3">
        <div className="w-8 h-8 border-2 border-game-gold border-t-transparent rounded-full animate-spin" />
        <p className="text-gray-400 text-sm">
          {ls(lang, '加载英雄数据...', 'Laddar hjältar...', 'Loading heroes...')}
        </p>
      </div>
    );
  }

  const actionColor = currentAction === 'ban' ? 'text-red-400' : 'text-blue-400';
  const actionBorder = currentAction === 'ban' ? 'border-red-900/40' : 'border-game-border';

  return (
    <>
      <div className={clsx('bg-game-panel/80 border rounded-lg flex flex-col', actionBorder)}>
        {/* Header + filters */}
        <div className="p-3 border-b border-game-border flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <h3 className="text-game-gold font-bold text-sm tracking-wider uppercase">
              {tr('pool.title')}
            </h3>
            <div className="flex items-center gap-2">
              {currentStep && !isComplete && (
                <span className={clsx(
                  'text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border',
                  currentAction === 'ban'
                    ? 'text-red-400 border-red-900 bg-red-950/30'
                    : 'text-blue-400 border-blue-900 bg-blue-950/30',
                )}>
                  {currentAction === 'ban'
                    ? ls(lang, '禁用阶段', 'BANNFAS', 'BAN PHASE')
                    : ls(lang, '选取阶段', 'VÄLJARFAS', 'PICK PHASE')}
                </span>
              )}
              <span className="text-[10px] text-gray-500">
                {sortedHeroes.filter((h) => !bannedIds.has(h.id) && !pickedIds.has(h.id)).length}
                {ls(lang, ' 可选', ' tillg.', ' avail')}
              </span>
            </div>
          </div>

          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={tr('pool.search')}
            className="w-full bg-gray-900 border border-gray-700 rounded px-2 py-1.5 text-xs text-gray-200 placeholder-gray-600 focus:outline-none focus:border-game-gold/50 transition-colors"
          />

          <div className="flex gap-1">
            {ATTR_FILTERS.map((f) => (
              <button
                key={f.key}
                onClick={() => setAttrFilter(f.key)}
                className={clsx(
                  'flex-1 py-1 text-xs rounded border transition-colors',
                  attrFilter === f.key
                    ? f.key === 'all'
                      ? 'bg-game-gold/20 border-game-gold text-game-gold-light'
                      : `bg-gray-800 ${ATTR_COLOR[f.key === 'all_attr' ? 'all' : f.key]} border-current`
                    : 'bg-gray-900 border-gray-700 text-gray-500 hover:border-gray-600',
                )}
              >
                {f.icon}
              </button>
            ))}
          </div>

          {/* Sort controls */}
          <div className="flex gap-1 items-center">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortBy)}
              className="flex-1 bg-gray-900 border border-gray-700 rounded px-1.5 py-1 text-[10px] text-gray-300 focus:outline-none focus:border-game-gold/50 transition-colors"
            >
              <option value="alpha">{ls(lang, '字母顺序', 'Alfabetisk', 'Alphabetical')}</option>
              <option value="pro_pick">{ls(lang, '职业出场率', 'Pro val', 'Pro Pick Rate')}</option>
              <option value="pro_ban">{ls(lang, '职业禁用率', 'Pro bann', 'Pro Ban Rate')}</option>
              <option value="pro_win">{ls(lang, '职业胜率', 'Pro vinstfrekvens', 'Pro Win Rate')}</option>
              <option value="pub_win">{ls(lang, '公共胜率', 'Pub vinstfrekvens', 'Pub Win Rate')}</option>
            </select>
            {sortBy !== 'alpha' && (
              <button
                onClick={() => setSortDir(sortDir === 'desc' ? 'asc' : 'desc')}
                className="px-2 py-1 text-[10px] bg-gray-900 border border-gray-700 rounded text-gray-400 hover:border-gray-500 hover:text-gray-200 transition-colors whitespace-nowrap"
                title={sortDir === 'desc' ? ls(lang, '从高到低', 'Högt → Lågt', 'High → Low') : ls(lang, '从低到高', 'Lågt → Högt', 'Low → High')}
              >
                {sortDir === 'desc' ? '↓' : '↑'}
              </button>
            )}
          </div>
        </div>

        {/* Hero grid */}
        <div className="p-2 overflow-y-auto" style={{ maxHeight: '420px' }}>
          {sortedHeroes.length === 0 ? (
            <div className="text-center text-gray-600 py-8 text-sm">
              {ls(lang, '未找到英雄', 'Inga hjältar hittades', 'No heroes found')}
            </div>
          ) : (
            <div
              className="grid gap-1"
              style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(68px, 1fr))' }}
            >
              {sortedHeroes.map((hero) => {
                const isBanned = bannedIds.has(hero.id);
                const isPicked = pickedIds.has(hero.id);
                const isUnavailable = isBanned || isPicked;

                return (
                  <div
                    key={hero.id}
                    onMouseEnter={(e) => !isUnavailable && handleMouseEnter(hero, e)}
                    onMouseLeave={handleMouseLeave}
                  >
                    <HeroCard
                      hero={hero}
                      displayName={getHeroDisplayName(hero, lang)}
                      size="md"
                      isBanned={isBanned}
                      isPicked={isPicked}
                      lang={lang}
                      onClick={isComplete || isUnavailable ? undefined : selectHero}
                    />
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Action hint */}
        {currentStep && !isComplete && (
          <div className="px-3 py-2 border-t border-game-border">
            <p className={clsx('text-[10px] text-center', actionColor)}>
              {lang === 'zh'
                ? `悬停查看${currentAction === 'ban' ? '禁用' : '选取'}分析 · 点击确认`
                : lang === 'sv'
                ? `Hovra för analys · Klicka för att ${currentAction === 'ban' ? 'banna' : 'välja'}`
                : `Hover to analyze · Click to ${currentAction}`}
            </p>
          </div>
        )}
      </div>

      {/* Floating tooltip (rendered outside the grid to avoid clipping) */}
      {hoveredHero && !isComplete && currentStep && (
        <HeroTooltip
          hero={hoveredHero}
          pos={tooltipPos}
          currentAction={currentAction}
          myPicks={myPicks}
          enemyPicks={enemyPicks}
          allBannedHeroes={allBannedHeroes}
          matchupCache={matchupCache}
          isFetching={isFetching}
          lang={lang}
        />
      )}
    </>
  );
}
