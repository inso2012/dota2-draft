'use client';

import { useMemo, useEffect } from 'react';
import { Hero, Team } from '@/lib/types';
import { Language } from '@/lib/i18n';
import { buildPickRecommendations, buildBanRecommendations } from '@/lib/scoreEngine';
import { useDraftStore } from '@/store/draftStore';
import HeroCard from './HeroCard';
import clsx from 'clsx';

interface RecommendationsProps {
  lang: Language;
  activeTeam: Team;
  currentAction: 'ban' | 'pick';
}

const PRIORITY_COLOR: Record<string, string> = {
  critical: 'text-red-400 border-red-900 bg-red-950/30',
  high:     'text-orange-400 border-orange-900 bg-orange-950/20',
  medium:   'text-yellow-400 border-yellow-900 bg-yellow-950/10',
  low:      'text-gray-500 border-gray-800 bg-transparent',
};
const PRIORITY_LABEL: Record<string, Record<Language, string>> = {
  critical: { zh: '极高', en: 'Critical' },
  high:     { zh: '高',   en: 'High'     },
  medium:   { zh: '中',   en: 'Med'      },
  low:      { zh: '低',   en: 'Low'      },
};

function WRBadge({ value, label }: { value: number; label: string }) {
  const color = value >= 0.55 ? 'text-green-400' : value >= 0.50 ? 'text-yellow-400' : 'text-red-400';
  return (
    <span className="text-[10px] text-gray-500">
      {label}: <span className={color}>{(value * 100).toFixed(1)}%</span>
    </span>
  );
}

export default function Recommendations({ lang, activeTeam, currentAction }: RecommendationsProps) {
  const zh = lang === 'zh';
  const {
    heroes,
    radiantPicks,
    direPicks,
    getBannedHeroIds,
    getPickedHeroIds,
    matchupCache,
    setMatchupData,
    selectHero,
  } = useDraftStore();

  const bannedIds = getBannedHeroIds();
  const pickedIds = getPickedHeroIds();

  const availableHeroes = useMemo(
    () => heroes.filter((h) => !bannedIds.has(h.id) && !pickedIds.has(h.id)),
    [heroes, bannedIds, pickedIds]
  );

  const myPicks = activeTeam === 'radiant' ? radiantPicks : direPicks;
  const enemyPicks = activeTeam === 'radiant' ? direPicks : radiantPicks;

  // Pre-fetch matchup data:
  //   pick mode → need this hero's matchups vs enemies (fetched per-hero in pool)
  //   ban mode  → need each of our picks' matchups (to calc threat of available heroes)
  useEffect(() => {
    const heroesToFetch = currentAction === 'ban'
      ? myPicks.map((h) => h.id)       // ban: need our picks' matchups
      : enemyPicks.map((h) => h.id);   // pick: need enemy picks' matchups

    for (const id of heroesToFetch) {
      if (!matchupCache[id]) {
        fetch(`/api/matchups/${id}`)
          .then((r) => r.json())
          .then((data) => setMatchupData(id, data))
          .catch(() => {});
      }
    }
  }, [currentAction, myPicks, enemyPicks, matchupCache, setMatchupData]);

  const pickRecs = useMemo(
    () => currentAction === 'pick'
      ? buildPickRecommendations(availableHeroes, myPicks, enemyPicks, matchupCache)
      : [],
    [currentAction, availableHeroes, myPicks, enemyPicks, matchupCache]
  );

  const banRecs = useMemo(
    () => currentAction === 'ban'
      ? buildBanRecommendations(availableHeroes, myPicks, matchupCache)
      : [],
    [currentAction, availableHeroes, myPicks, matchupCache]
  );

  const teamName = activeTeam === 'radiant'
    ? (zh ? '天辉' : 'Radiant')
    : (zh ? '夜魇' : 'Dire');

  const teamColor = activeTeam === 'radiant' ? 'text-radiant-glow' : 'text-dire-glow';
  const teamBorder = activeTeam === 'radiant' ? 'border-radiant/30' : 'border-dire/30';
  const actionColor = currentAction === 'ban' ? 'text-red-400' : 'text-blue-400';
  const actionLabel = currentAction === 'ban'
    ? (zh ? '禁用推荐' : 'Ban Suggestions')
    : (zh ? '选取推荐' : 'Pick Suggestions');

  return (
    <div className={clsx('bg-game-panel/80 border rounded-lg p-3 flex flex-col gap-2', teamBorder)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="text-game-gold font-bold text-sm tracking-wider uppercase">
            {zh ? '推荐' : 'Suggestions'}
          </h3>
          <span className={clsx('text-[10px] font-semibold', teamColor)}>
            {teamName}
          </span>
          <span className={clsx('text-[10px] px-1.5 py-0.5 rounded border', actionColor,
            currentAction === 'ban'
              ? 'border-red-900/60 bg-red-950/20'
              : 'border-blue-900/60 bg-blue-950/20'
          )}>
            {actionLabel}
          </span>
        </div>
        <div className="text-[10px] text-gray-600">
          {currentAction === 'pick' && enemyPicks.length > 0
            ? (zh ? `对 ${enemyPicks.length} 个敌方英雄` : `vs ${enemyPicks.length} enemy`)
            : currentAction === 'ban' && myPicks.length > 0
            ? (zh ? `基于 ${myPicks.length} 个己方英雄` : `based on ${myPicks.length} allies`)
            : (zh ? '基于整体强度' : 'by overall strength')}
        </div>
      </div>

      {/* Pick recommendations */}
      {currentAction === 'pick' && (
        <div className="flex flex-col gap-1.5 max-h-52 overflow-y-auto pr-1 scrollbar-thin">
          {pickRecs.map(({ hero, analysis, score }, idx) => (
            <div
              key={hero.id}
              onClick={() => selectHero(hero)}
              className="flex items-center gap-2 p-1.5 rounded border cursor-pointer transition-all duration-150 bg-gray-900/60 border-gray-800 hover:border-blue-800/50 hover:bg-gray-800/60"
            >
              <span className="text-[10px] text-gray-600 w-3 text-right font-mono">{idx + 1}</span>
              <HeroCard hero={hero} size="sm" lang={lang} />
              <div className="flex-1 min-w-0">
                <div className="text-xs font-semibold text-gray-200 truncate">{hero.localized_name}</div>
                <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                  {analysis.proWinRate > 0 && (
                    <WRBadge value={analysis.proWinRate} label={zh ? '职业' : 'Pro'} />
                  )}
                  <WRBadge value={analysis.pubWinRate} label={zh ? '公共' : 'Pub'} />
                  {analysis.counterDataPoints > 0 && (
                    <WRBadge value={analysis.counterScore} label={zh ? '克制' : 'Ctr'} />
                  )}
                </div>
              </div>
              {/* Combined WR */}
              <div className="text-right shrink-0">
                <div className={clsx(
                  'text-xs font-bold',
                  analysis.combinedWinRate >= 0.55 ? 'text-green-400' :
                  analysis.combinedWinRate >= 0.50 ? 'text-yellow-400' : 'text-red-400',
                )}>
                  {(analysis.combinedWinRate * 100).toFixed(1)}%
                </div>
                <div className="text-[9px] text-gray-600">{zh ? '预计' : 'est.'}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Ban recommendations */}
      {currentAction === 'ban' && (
        <div className="flex flex-col gap-1.5 max-h-52 overflow-y-auto pr-1 scrollbar-thin">
          {banRecs.map(({ hero, analysis }, idx) => (
            <div
              key={hero.id}
              onClick={() => selectHero(hero)}
              className="flex items-center gap-2 p-1.5 rounded border cursor-pointer transition-all duration-150 bg-gray-900/60 border-gray-800 hover:border-red-900/50 hover:bg-gray-800/60"
            >
              <span className="text-[10px] text-gray-600 w-3 text-right font-mono">{idx + 1}</span>
              <HeroCard hero={hero} size="sm" lang={lang} />
              <div className="flex-1 min-w-0">
                <div className="text-xs font-semibold text-gray-200 truncate">{hero.localized_name}</div>
                <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                  <WRBadge value={analysis.heroStrength} label={zh ? '实力' : 'Str'} />
                  {analysis.proBanRate > 0 && (
                    <WRBadge value={analysis.proBanRate} label={zh ? 'Ban率' : 'Ban'} />
                  )}
                  {analysis.threatDataPoints > 0 && (
                    <WRBadge value={analysis.threatScore} label={zh ? '威胁' : 'Thr'} />
                  )}
                </div>
              </div>
              {/* Win rate if banned + priority */}
              <div className="text-right shrink-0 flex flex-col items-end gap-0.5">
                <div className={clsx(
                  'text-xs font-bold',
                  analysis.winRateIfBanned >= 0.55 ? 'text-green-400' :
                  analysis.winRateIfBanned >= 0.50 ? 'text-yellow-400' : 'text-gray-400',
                )}>
                  {(analysis.winRateIfBanned * 100).toFixed(1)}%
                </div>
                <span className={clsx(
                  'text-[9px] px-1 py-0.5 rounded border',
                  PRIORITY_COLOR[analysis.banPriority],
                )}>
                  {PRIORITY_LABEL[analysis.banPriority][lang]}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
