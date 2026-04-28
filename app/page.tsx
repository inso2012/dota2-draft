'use client';

import { useEffect, useState, useCallback } from 'react';
import { useDraftStore } from '@/store/draftStore';
import { Language, ls } from '@/lib/i18n';
import { GameMode } from '@/lib/types';
import Header from '@/components/Header';
import TeamPanel from '@/components/TeamPanel';
import PhaseIndicator from '@/components/PhaseIndicator';
import HeroPool from '@/components/HeroPool';
import Recommendations from '@/components/Recommendations';

// Max bans and picks per mode
const MODE_CONFIG = {
  captains: { maxBans: 7, maxPicks: 5 },
  allpick: { maxBans: 5, maxPicks: 5 },
};

export default function DraftPage() {
  const [lang, setLang] = useState<Language>('zh');

  const {
    setHeroes,
    mode,
    currentStep,
    sequence,
    isComplete,
    radiantBans,
    radiantPicks,
    direBans,
    direPicks,
    undoLastAction,
    resetDraft,
    getCurrentStep,
    getActiveTeam,
  } = useDraftStore();

  // Load heroes from our API route
  useEffect(() => {
    fetch('/api/heroes')
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setHeroes(data);
      })
      .catch((err) => console.error('Failed to load heroes:', err));
  }, [setHeroes]);

  const handleLangChange = useCallback((l: Language) => setLang(l), []);

  const currentStepData = getCurrentStep();
  const activeTeam = getActiveTeam();
  const currentAction = currentStepData?.action ?? 'pick';
  const { maxBans, maxPicks } = MODE_CONFIG[mode];

  return (
    <div className="min-h-screen flex flex-col">
      <Header lang={lang} onLangChange={handleLangChange} />

      <main className="flex-1 max-w-screen-2xl mx-auto w-full px-3 py-3 flex flex-col gap-3">
        {/* Phase indicator */}
        <PhaseIndicator
          currentStep={currentStep}
          sequence={sequence}
          mode={mode}
          isComplete={isComplete}
          lang={lang}
          onUndo={undoLastAction}
          onReset={resetDraft}
        />

        {/* Main draft area: Teams + Pool + Recommendations */}
        <div className="flex flex-col xl:flex-row gap-3">
          {/* Radiant panel */}
          <div className="w-full xl:w-64 flex-shrink-0">
            <TeamPanel
              team="radiant"
              bans={radiantBans}
              picks={radiantPicks}
              maxBans={maxBans}
              maxPicks={maxPicks}
              isActive={activeTeam === 'radiant' && !isComplete}
              lang={lang}
            />
          </div>

          {/* Center: Hero pool */}
          <div className="flex-1 min-w-0">
            <HeroPool lang={lang} />
          </div>

          {/* Dire panel */}
          <div className="w-full xl:w-64 flex-shrink-0">
            <TeamPanel
              team="dire"
              bans={direBans}
              picks={direPicks}
              maxBans={maxBans}
              maxPicks={maxPicks}
              isActive={activeTeam === 'dire' && !isComplete}
              lang={lang}
            />
          </div>
        </div>

        {/* Recommendations — show whenever there's an active team */}
        {activeTeam && !isComplete && (
          <Recommendations
            lang={lang}
            activeTeam={activeTeam}
            currentAction={currentAction}
          />
        )}

        {/* Draft complete overlay */}
        {isComplete && (
          <div className="bg-game-panel/90 border border-game-gold/40 rounded-lg p-4 text-center">
            <h2 className="text-game-gold font-bold text-lg mb-1">
              {ls(lang, '✓ 选人阶段完成', '✓ Utkast klart', '✓ Draft Complete')}
            </h2>
            <p className="text-gray-400 text-sm mb-3">
              {ls(lang, '天辉与夜魇阵容已确定', 'Båda lagen har bekräftat sina uppställningar', 'Both teams have finalized their rosters')}
            </p>
            <button
              onClick={resetDraft}
              className="px-4 py-2 bg-game-gold text-black font-bold rounded hover:bg-game-gold-light transition-colors text-sm"
            >
              {ls(lang, '重新开始', 'Nytt utkast', 'New Draft')}
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
