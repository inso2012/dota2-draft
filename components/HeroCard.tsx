'use client';

import { Hero } from '@/lib/types';
import { calcProWinRate, calcPubWinRate } from '@/lib/opendota';
import { Language } from '@/lib/i18n';
import clsx from 'clsx';

interface HeroCardProps {
  hero: Hero;
  size?: 'sm' | 'md' | 'lg';
  isBanned?: boolean;
  isPicked?: boolean;
  isActive?: boolean;
  showStats?: boolean;
  lang?: Language;
  onClick?: (hero: Hero) => void;
  dim?: boolean;
}

const ATTR_COLOR: Record<string, string> = {
  str: 'text-red-400',
  agi: 'text-green-400',
  int: 'text-blue-400',
  all: 'text-purple-400',
};

const ATTR_ICON: Record<string, string> = {
  str: '⚔',
  agi: '🏹',
  int: '✨',
  all: '◆',
};

export default function HeroCard({
  hero,
  size = 'md',
  isBanned = false,
  isPicked = false,
  isActive = false,
  showStats = false,
  lang = 'zh',
  onClick,
  dim = false,
}: HeroCardProps) {
  const isUnavailable = isBanned || isPicked;
  const proWR = calcProWinRate(hero);
  const pubWR = calcPubWinRate(hero);

  const sizeClasses = {
    sm: 'w-12 h-12',
    md: 'w-16 h-16',
    lg: 'w-20 h-20',
  };

  const handleClick = () => {
    if (!isUnavailable && onClick) onClick(hero);
  };

  return (
    <div
      className={clsx(
        'relative flex flex-col items-center cursor-pointer select-none transition-all duration-150',
        isUnavailable && 'opacity-30 cursor-not-allowed',
        dim && !isUnavailable && 'opacity-50',
        isActive && 'ring-2 ring-game-gold ring-offset-1 ring-offset-game-bg rounded',
        !isUnavailable && !dim && 'hover:opacity-90 hover:scale-105',
      )}
      onClick={handleClick}
      title={hero.localized_name}
    >
      {/* Hero portrait */}
      <div
        className={clsx(
          'relative overflow-hidden rounded',
          sizeClasses[size],
          isBanned && 'grayscale brightness-40',
          isPicked && 'brightness-60',
        )}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={hero.image_url}
          alt={hero.localized_name}
          className="w-full h-full object-cover object-top"
          loading="lazy"
          onError={(e) => {
            const target = e.target as HTMLImageElement;
            target.style.background = '#1f2937';
            target.src = '';
          }}
        />

        {/* Banned overlay */}
        {isBanned && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-full h-0.5 bg-red-500 rotate-45 absolute" />
            <div className="w-full h-0.5 bg-red-500 -rotate-45 absolute" />
          </div>
        )}

        {/* Attr badge */}
        <div className={clsx('absolute bottom-0 right-0 text-xs px-0.5', ATTR_COLOR[hero.primary_attr])}>
          {ATTR_ICON[hero.primary_attr]}
        </div>
      </div>

      {/* Hero name */}
      {size !== 'sm' && (
        <span className="mt-0.5 text-[9px] text-gray-300 text-center leading-tight max-w-full truncate px-0.5">
          {hero.localized_name}
        </span>
      )}

      {/* Stats tooltip on hover */}
      {showStats && !isUnavailable && (
        <div className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 z-50 hidden group-hover:block bg-game-panel border border-game-border rounded p-2 text-xs whitespace-nowrap shadow-lg">
          <div className="text-game-gold font-semibold">{hero.localized_name}</div>
          <div className="text-gray-300">
            Pro WR: <span className={proWR >= 0.5 ? 'text-green-400' : 'text-red-400'}>
              {proWR > 0 ? `${(proWR * 100).toFixed(1)}%` : 'N/A'}
            </span>
          </div>
          <div className="text-gray-300">
            Pub WR: <span className={pubWR >= 0.5 ? 'text-green-400' : 'text-red-400'}>
              {(pubWR * 100).toFixed(1)}%
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
