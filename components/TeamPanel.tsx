'use client';

import { Hero, Team } from '@/lib/types';
import { Language, createTranslator, ls } from '@/lib/i18n';
import HeroCard from './HeroCard';
import clsx from 'clsx';

interface TeamPanelProps {
  team: Team;
  bans: Hero[];
  picks: Hero[];
  maxBans: number;
  maxPicks: number;
  isActive: boolean;
  lang: Language;
}

function EmptySlot({ type, team }: { type: 'ban' | 'pick'; team: Team }) {
  return (
    <div
      className={clsx(
        'w-12 h-12 rounded border border-dashed flex items-center justify-center',
        type === 'ban'
          ? 'border-gray-700 bg-gray-900/40'
          : team === 'radiant'
          ? 'border-radiant/30 bg-radiant/5'
          : 'border-dire/30 bg-dire/5',
      )}
    />
  );
}

export default function TeamPanel({
  team,
  bans,
  picks,
  maxBans,
  maxPicks,
  isActive,
  lang,
}: TeamPanelProps) {
  const tr = createTranslator(lang);
  const isRadiant = team === 'radiant';
  const teamColor = isRadiant ? 'radiant' : 'dire';
  const teamName = isRadiant ? tr('team.radiant') : tr('team.dire');

  const banSlots = Array.from({ length: maxBans }, (_, i) => bans[i] ?? null);
  const pickSlots = Array.from({ length: maxPicks }, (_, i) => picks[i] ?? null);

  return (
    <div
      className={clsx(
        'flex flex-col rounded-lg border transition-all duration-300',
        isRadiant ? 'border-radiant/40' : 'border-dire/40',
        isActive && (isRadiant ? 'shadow-radiant border-radiant' : 'shadow-dire border-dire'),
        'bg-game-panel/80 backdrop-blur-sm p-3',
      )}
    >
      {/* Team Header */}
      <div className={clsx('flex items-center gap-2 mb-3', isRadiant ? 'flex-row' : 'flex-row-reverse')}>
        <div
          className={clsx(
            'w-2 h-2 rounded-full',
            isActive ? 'animate-pulse' : '',
            isRadiant ? 'bg-radiant' : 'bg-dire',
          )}
        />
        <h2
          className={clsx(
            'font-bold text-sm tracking-widest uppercase',
            isRadiant ? 'text-radiant-glow' : 'text-dire-glow',
          )}
        >
          {teamName}
        </h2>
        {isActive && (
          <span className="text-[10px] text-game-gold border border-game-gold/50 rounded px-1 py-0.5 animate-pulse">
            {ls(lang, '当前操作', 'AKTIV', 'ACTIVE')}
          </span>
        )}
      </div>

      {/* Picks */}
      <div className="mb-2">
        <div className={clsx('text-[10px] text-gray-500 uppercase tracking-wider mb-1.5', !isRadiant && 'text-right')}>
          {tr('picks.label')}
        </div>
        <div className={clsx('flex gap-1.5 flex-wrap', !isRadiant && 'justify-end')}>
          {pickSlots.map((hero, i) =>
            hero ? (
              <HeroCard key={hero.id} hero={hero} size="md" lang={lang} />
            ) : (
              <EmptySlot key={i} type="pick" team={team} />
            )
          )}
        </div>
      </div>

      {/* Bans */}
      <div>
        <div className={clsx('text-[10px] text-gray-500 uppercase tracking-wider mb-1.5', !isRadiant && 'text-right')}>
          {tr('bans.label')}
        </div>
        <div className={clsx('flex gap-1 flex-wrap', !isRadiant && 'justify-end')}>
          {banSlots.map((hero, i) =>
            hero ? (
              <HeroCard key={hero.id} hero={hero} size="sm" isBanned lang={lang} />
            ) : (
              <EmptySlot key={i} type="ban" team={team} />
            )
          )}
        </div>
      </div>
    </div>
  );
}
