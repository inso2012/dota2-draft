export type Team = 'radiant' | 'dire';
export type ActionType = 'ban' | 'pick';
export type GameMode = 'captains' | 'allpick';
export type Language = 'en' | 'zh';
export type PrimaryAttr = 'agi' | 'str' | 'int' | 'all';

export interface DraftStep {
  team: Team;
  action: ActionType;
  phase: number;
}

export interface Hero {
  id: number;
  name: string;
  localized_name: string;
  primary_attr: PrimaryAttr;
  attack_type: 'Melee' | 'Ranged';
  roles: string[];
  pro_win: number;
  pro_pick: number;
  pro_ban: number;
  pub_win: number;
  pub_pick: number;
  image_url: string;
  icon_url: string;
}

export interface HeroMatchup {
  hero_id: number;
  games_played: number;
  wins: number;
}

export interface Recommendation {
  hero: Hero;
  score: number;
  winRate: number;
  proWinRate: number;
  counterScore: number;
  reasons: string[];
}

export interface DraftState {
  mode: GameMode;
  currentStep: number;
  radiantBans: Hero[];
  radiantPicks: Hero[];
  direBans: Hero[];
  direPicks: Hero[];
  sequence: DraftStep[];
  isComplete: boolean;
}
