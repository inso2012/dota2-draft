export type Language = 'en' | 'zh' | 'sv';

/** Inline 3-way language string helper */
export function ls(lang: Language, zh: string, sv: string, en: string): string {
  return lang === 'zh' ? zh : lang === 'sv' ? sv : en;
}

const translations = {
  en: {
    // App
    'app.title': 'Dota 2 Draft Assistant',
    'app.subtitle': 'Pick & Ban Optimizer',
    // Mode
    'mode.label': 'Game Mode',
    'mode.captains': 'Captains Mode',
    'mode.allpick': 'All Pick',
    // Teams
    'team.radiant': 'Radiant',
    'team.dire': 'Dire',
    // Actions
    'action.ban': 'Ban',
    'action.pick': 'Pick',
    'action.undo': 'Undo',
    'action.reset': 'Reset Draft',
    // Phase
    'phase.label': 'Phase',
    'phase.current': 'Current Turn',
    'phase.complete': 'Draft Complete',
    // Hero pool
    'pool.title': 'Hero Pool',
    'pool.search': 'Search heroes...',
    'pool.filter.all': 'All',
    'pool.filter.str': 'Strength',
    'pool.filter.agi': 'Agility',
    'pool.filter.int': 'Intelligence',
    'pool.filter.all_attr': 'Universal',
    // Recommendations
    'rec.title': 'Recommendations',
    'rec.subtitle': 'For current pick turn',
    'rec.winrate': 'Win Rate',
    'rec.pro_wr': 'Pro WR',
    'rec.counter': 'Counter Score',
    'rec.reason.high_wr': 'High pro win rate',
    'rec.reason.counter': 'Counters enemy lineup',
    'rec.reason.synergy': 'Synergizes with your team',
    'rec.reason.meta': 'Strong meta pick',
    'rec.reason.flex': 'Flexible role',
    // Status
    'status.banned': 'BANNED',
    'status.picked': 'PICKED',
    // Stats
    'stats.pro_pick': 'Pro Picks',
    'stats.pro_ban': 'Pro Bans',
    // Bans
    'bans.label': 'Bans',
    'picks.label': 'Picks',
  },
  zh: {
    // App
    'app.title': 'Dota 2 选人助手',
    'app.subtitle': '选人/禁人优化工具',
    // Mode
    'mode.label': '游戏模式',
    'mode.captains': '队长模式',
    'mode.allpick': '全英雄选择',
    // Teams
    'team.radiant': '天辉',
    'team.dire': '夜魇',
    // Actions
    'action.ban': '禁用',
    'action.pick': '选取',
    'action.undo': '撤销',
    'action.reset': '重置选人',
    // Phase
    'phase.label': '阶段',
    'phase.current': '当前操作',
    'phase.complete': '选人完成',
    // Hero pool
    'pool.title': '英雄池',
    'pool.search': '搜索英雄...',
    'pool.filter.all': '全部',
    'pool.filter.str': '力量',
    'pool.filter.agi': '敏捷',
    'pool.filter.int': '智力',
    'pool.filter.all_attr': '全属性',
    // Recommendations
    'rec.title': '推荐',
    'rec.subtitle': '当前轮次推荐',
    'rec.winrate': '胜率',
    'rec.pro_wr': '职业胜率',
    'rec.counter': '克制分数',
    'rec.reason.high_wr': '职业高胜率',
    'rec.reason.counter': '克制对方阵容',
    'rec.reason.synergy': '与己方阵容协同',
    'rec.reason.meta': '当前强势英雄',
    'rec.reason.flex': '多职能英雄',
    // Status
    'status.banned': '已禁用',
    'status.picked': '已选取',
    // Stats
    'stats.pro_pick': '职业选取',
    'stats.pro_ban': '职业禁用',
    // Bans
    'bans.label': '禁用',
    'picks.label': '已选',
  },
  sv: {
    // App
    'app.title': 'Dota 2 Utkasthjälp',
    'app.subtitle': 'Pick & Ban-optimerare',
    // Mode
    'mode.label': 'Spelläge',
    'mode.captains': 'Kaptenläge',
    'mode.allpick': 'Alla hjältar',
    // Teams
    'team.radiant': 'Radiant',
    'team.dire': 'Dire',
    // Actions
    'action.ban': 'Banna',
    'action.pick': 'Välja',
    'action.undo': 'Ångra',
    'action.reset': 'Återställ utkast',
    // Phase
    'phase.label': 'Fas',
    'phase.current': 'Aktuellt drag',
    'phase.complete': 'Utkast klart',
    // Hero pool
    'pool.title': 'Hjältepool',
    'pool.search': 'Sök hjältar...',
    'pool.filter.all': 'Alla',
    'pool.filter.str': 'Styrka',
    'pool.filter.agi': 'Smidighet',
    'pool.filter.int': 'Intelligens',
    'pool.filter.all_attr': 'Universell',
    // Recommendations
    'rec.title': 'Förslag',
    'rec.subtitle': 'För aktuell picktur',
    'rec.winrate': 'Vinstfrekvens',
    'rec.pro_wr': 'Pro VF',
    'rec.counter': 'Motpoäng',
    'rec.reason.high_wr': 'Hög pro-vinstfrekvens',
    'rec.reason.counter': 'Motverkar fiendelaget',
    'rec.reason.synergy': 'Synergi med ditt lag',
    'rec.reason.meta': 'Stark metapick',
    'rec.reason.flex': 'Flexibel roll',
    // Status
    'status.banned': 'BANNAD',
    'status.picked': 'VALD',
    // Stats
    'stats.pro_pick': 'Pro val',
    'stats.pro_ban': 'Pro bann',
    // Bans
    'bans.label': 'Banningar',
    'picks.label': 'Val',
  },
} as const;

type TranslationKey = keyof typeof translations.en;

export function t(key: TranslationKey, lang: Language): string {
  const langMap = translations[lang] as Record<string, string> | undefined;
  return langMap?.[key] ?? translations.en[key] ?? key;
}

export function createTranslator(lang: Language) {
  return (key: TranslationKey) => t(key, lang);
}
