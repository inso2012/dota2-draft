'use client';

import { GameMode } from '@/lib/types';
import { Language, createTranslator } from '@/lib/i18n';
import { useDraftStore } from '@/store/draftStore';
import clsx from 'clsx';

interface HeaderProps {
  lang: Language;
  onLangToggle: () => void;
}

export default function Header({ lang, onLangToggle }: HeaderProps) {
  const { mode, setMode, resetDraft } = useDraftStore();
  const tr = createTranslator(lang);

  const handleModeChange = (newMode: GameMode) => {
    setMode(newMode);
  };

  return (
    <header className="bg-game-panel/90 backdrop-blur-sm border-b border-game-border sticky top-0 z-50">
      <div className="max-w-screen-2xl mx-auto px-4 py-2 flex items-center justify-between gap-4">
        {/* Logo + Title */}
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded bg-gradient-to-br from-game-gold to-yellow-700 flex items-center justify-center text-black font-black text-sm">
            D2
          </div>
          <div>
            <h1 className="text-game-gold font-bold text-base tracking-wide leading-none">
              {tr('app.title')}
            </h1>
            <p className="text-gray-500 text-[10px] tracking-widest uppercase">
              {tr('app.subtitle')}
            </p>
          </div>
        </div>

        {/* Mode switcher */}
        <div className="flex items-center bg-gray-900 rounded border border-gray-700 p-0.5 gap-0.5">
          {(['captains', 'allpick'] as GameMode[]).map((m) => (
            <button
              key={m}
              onClick={() => handleModeChange(m)}
              className={clsx(
                'px-3 py-1 rounded text-xs font-medium transition-all',
                mode === m
                  ? 'bg-game-gold text-black font-bold'
                  : 'text-gray-400 hover:text-gray-200',
              )}
            >
              {m === 'captains' ? tr('mode.captains') : tr('mode.allpick')}
            </button>
          ))}
        </div>

        {/* Language toggle */}
        <button
          onClick={onLangToggle}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded border border-gray-700 bg-gray-900 hover:border-game-gold/50 text-xs text-gray-300 hover:text-game-gold transition-colors"
        >
          <span className="text-base">{lang === 'zh' ? '🇨🇳' : '🇬🇧'}</span>
          <span className="font-medium">{lang === 'zh' ? 'EN' : '中'}</span>
        </button>
      </div>
    </header>
  );
}
