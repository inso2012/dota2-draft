'use client';

import { useEffect, useState, useCallback } from 'react';
import { useDraftStore } from '@/store/draftStore';
import { Language } from '@/lib/i18n';
import { GameMode } from '@/lib/types';
import Header from '@/components/Header';
import TeamPanel from '@/components/TeamPanel';
import PhaseIndicator from '@/components/PhaseIndicator';
import HeroPool from '@/components/HeroPool';
import Recommendations from '@/components/Recommendations';
import DraftSummary from '@/components/DraftSummary';

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

        {/* Draft complete: full analysis panel */}
        {isComplete && (
          <DraftSummary
            radiantPicks={radiantPicks}
            direPicks={direPicks}
            lang={lang}
            onReset={resetDraft}
          />
        )}
      </main>
    </div>
  );
}
