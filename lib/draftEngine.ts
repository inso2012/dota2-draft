import { DraftStep, GameMode } from './types';

export const CAPTAINS_MODE_SEQUENCE: DraftStep[] = [
  // Ban Phase 1: 6 bans (3 each, alternating)
  { team: 'radiant', action: 'ban', phase: 1 },
  { team: 'dire', action: 'ban', phase: 1 },
  { team: 'radiant', action: 'ban', phase: 1 },
  { team: 'dire', action: 'ban', phase: 1 },
  { team: 'radiant', action: 'ban', phase: 1 },
  { team: 'dire', action: 'ban', phase: 1 },
  // Pick Phase 1: 4 picks (2 Radiant, 2 Dire)
  { team: 'radiant', action: 'pick', phase: 1 },
  { team: 'radiant', action: 'pick', phase: 1 },
  { team: 'dire', action: 'pick', phase: 1 },
  { team: 'dire', action: 'pick', phase: 1 },
  // Ban Phase 2: 4 bans (2 each)
  { team: 'dire', action: 'ban', phase: 2 },
  { team: 'dire', action: 'ban', phase: 2 },
  { team: 'radiant', action: 'ban', phase: 2 },
  { team: 'radiant', action: 'ban', phase: 2 },
  // Pick Phase 2: 4 picks
  { team: 'radiant', action: 'pick', phase: 2 },
  { team: 'dire', action: 'pick', phase: 2 },
  { team: 'dire', action: 'pick', phase: 2 },
  { team: 'radiant', action: 'pick', phase: 2 },
  // Ban Phase 3: 2 bans (1 each)
  { team: 'radiant', action: 'ban', phase: 3 },
  { team: 'dire', action: 'ban', phase: 3 },
  // Pick Phase 3: 2 picks
  { team: 'dire', action: 'pick', phase: 3 },
  { team: 'radiant', action: 'pick', phase: 3 },
];

export const ALL_PICK_SEQUENCE: DraftStep[] = [
  // 10 bans (5 each, alternating)
  { team: 'radiant', action: 'ban', phase: 1 },
  { team: 'dire', action: 'ban', phase: 1 },
  { team: 'radiant', action: 'ban', phase: 1 },
  { team: 'dire', action: 'ban', phase: 1 },
  { team: 'radiant', action: 'ban', phase: 1 },
  { team: 'dire', action: 'ban', phase: 1 },
  { team: 'radiant', action: 'ban', phase: 1 },
  { team: 'dire', action: 'ban', phase: 1 },
  { team: 'radiant', action: 'ban', phase: 1 },
  { team: 'dire', action: 'ban', phase: 1 },
  // 10 picks (alternating)
  { team: 'radiant', action: 'pick', phase: 2 },
  { team: 'dire', action: 'pick', phase: 2 },
  { team: 'radiant', action: 'pick', phase: 2 },
  { team: 'dire', action: 'pick', phase: 2 },
  { team: 'radiant', action: 'pick', phase: 2 },
  { team: 'dire', action: 'pick', phase: 2 },
  { team: 'radiant', action: 'pick', phase: 2 },
  { team: 'dire', action: 'pick', phase: 2 },
  { team: 'radiant', action: 'pick', phase: 2 },
  { team: 'dire', action: 'pick', phase: 2 },
];

export function getSequence(mode: GameMode): DraftStep[] {
  return mode === 'captains' ? CAPTAINS_MODE_SEQUENCE : ALL_PICK_SEQUENCE;
}

export function getPhaseLabel(step: DraftStep, lang: 'en' | 'zh'): string {
  const phaseMap = {
    en: { ban: 'Ban', pick: 'Pick' },
    zh: { ban: '禁用', pick: '选取' },
  };
  const phaseNum = lang === 'zh'
    ? `第${step.phase}阶段`
    : `Phase ${step.phase}`;
  return `${phaseMap[lang][step.action]} • ${phaseNum}`;
}
