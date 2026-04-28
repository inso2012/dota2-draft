'use client';

import { create } from 'zustand';
import { Hero, GameMode, Team, DraftState } from '@/lib/types';
import { Language } from '@/lib/i18n';
import { getSequence } from '@/lib/draftEngine';

interface DraftStore extends DraftState {
  // UI state
  language: Language;
  heroes: Hero[];
  heroesLoaded: boolean;
  matchupCache: Record<number, { hero_id: number; games_played: number; wins: number }[]>;
  searchQuery: string;
  attrFilter: string;

  // Actions
  setLanguage: (lang: Language) => void;
  setHeroes: (heroes: Hero[]) => void;
  setMode: (mode: GameMode) => void;
  selectHero: (hero: Hero) => void;
  undoLastAction: () => void;
  resetDraft: () => void;
  setMatchupData: (heroId: number, data: { hero_id: number; games_played: number; wins: number }[]) => void;
  setSearchQuery: (q: string) => void;
  setAttrFilter: (attr: string) => void;

  // Derived
  getBannedHeroIds: () => Set<number>;
  getPickedHeroIds: () => Set<number>;
  getCurrentStep: () => import('@/lib/types').DraftStep | null;
  getActiveTeam: () => Team | null;
}

function createInitialDraftState(mode: GameMode): Omit<DraftState, 'mode'> {
  return {
    currentStep: 0,
    radiantBans: [],
    radiantPicks: [],
    direBans: [],
    direPicks: [],
    sequence: getSequence(mode),
    isComplete: false,
  };
}

export const useDraftStore = create<DraftStore>((set, get) => ({
  // Draft state
  mode: 'captains',
  ...createInitialDraftState('captains'),

  // UI state
  language: 'zh',
  heroes: [],
  heroesLoaded: false,
  matchupCache: {},
  searchQuery: '',
  attrFilter: 'all',

  setLanguage: (lang) => set({ language: lang }),

  setHeroes: (heroes) => set({ heroes, heroesLoaded: true }),

  setMode: (mode) =>
    set({
      mode,
      ...createInitialDraftState(mode),
    }),

  selectHero: (hero) =>
    set((state) => {
      if (state.isComplete) return state;
      const step = state.sequence[state.currentStep];
      if (!step) return state;

      const nextStep = state.currentStep + 1;
      const isComplete = nextStep >= state.sequence.length;

      const updates: Partial<DraftStore> = { currentStep: nextStep, isComplete };

      if (step.team === 'radiant' && step.action === 'ban') {
        updates.radiantBans = [...state.radiantBans, hero];
      } else if (step.team === 'radiant' && step.action === 'pick') {
        updates.radiantPicks = [...state.radiantPicks, hero];
      } else if (step.team === 'dire' && step.action === 'ban') {
        updates.direBans = [...state.direBans, hero];
      } else if (step.team === 'dire' && step.action === 'pick') {
        updates.direPicks = [...state.direPicks, hero];
      }

      return updates;
    }),

  undoLastAction: () =>
    set((state) => {
      if (state.currentStep === 0) return state;
      const prevStep = state.currentStep - 1;
      const step = state.sequence[prevStep];
      if (!step) return state;

      const updates: Partial<DraftStore> = { currentStep: prevStep, isComplete: false };

      if (step.team === 'radiant' && step.action === 'ban') {
        updates.radiantBans = state.radiantBans.slice(0, -1);
      } else if (step.team === 'radiant' && step.action === 'pick') {
        updates.radiantPicks = state.radiantPicks.slice(0, -1);
      } else if (step.team === 'dire' && step.action === 'ban') {
        updates.direBans = state.direBans.slice(0, -1);
      } else if (step.team === 'dire' && step.action === 'pick') {
        updates.direPicks = state.direPicks.slice(0, -1);
      }

      return updates;
    }),

  resetDraft: () =>
    set((state) => ({
      ...createInitialDraftState(state.mode),
    })),

  setMatchupData: (heroId, data) =>
    set((state) => ({
      matchupCache: { ...state.matchupCache, [heroId]: data },
    })),

  setSearchQuery: (q) => set({ searchQuery: q }),
  setAttrFilter: (attr) => set({ attrFilter: attr }),

  getBannedHeroIds: () => {
    const s = get();
    return new Set([
      ...s.radiantBans.map((h) => h.id),
      ...s.direBans.map((h) => h.id),
    ]);
  },

  getPickedHeroIds: () => {
    const s = get();
    return new Set([
      ...s.radiantPicks.map((h) => h.id),
      ...s.direPicks.map((h) => h.id),
    ]);
  },

  getCurrentStep: () => {
    const s = get();
    return s.sequence[s.currentStep] ?? null;
  },

  getActiveTeam: () => {
    const s = get();
    const step = s.sequence[s.currentStep];
    return step?.team ?? null;
  },
}));
