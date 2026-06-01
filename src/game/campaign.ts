import {
  BossObjective,
  DayConfig,
  DayReport,
  GameEnding,
  GameSave,
  MarketRegime,
  PlayerState,
} from '../types/game';
import { MarketState } from '../types/game';
import { calcTotalAssets } from './player';

const BOSS_QUOTES = [
  '欢迎来到资本市场。这里没有对错，只有季度报表。',
  '你今天的目标很简单：赚钱。别问为什么。',
  '合规部说他们在看你。我说他们一直都在看所有人。',
  '客户不喜欢波动，除非波动让他赚钱。',
  '如果你亏了，那是市场问题。如果你赚了，那是我的管理能力。',
  '别跟我谈风险，谈回报。风险是合规部的事。',
  '年轻人，市场不是赌场——赌场规则更清楚。',
];

export const CAMPAIGN_DAYS: DayConfig[] = [
  {
    day: 1,
    regime: 'flat',
    bossObjective: {
      id: 'd1-profit',
      description: '今日盈利至少 $1,500',
      targetMetric: 'dailyPnl',
      threshold: 1500,
      sarcasticQuote: '第一天别搞砸，我的咖啡很贵的。',
    },
    specialEventId: 'day1_welcome',
    difficulty: 0.6,
    unlockShort: false,
    tutorialMode: true,
    newsCount: 2,
  },
  {
    day: 2,
    regime: 'bull',
    bossObjective: {
      id: 'd2-profit',
      description: '今日盈利至少 $2,500',
      targetMetric: 'dailyPnl',
      threshold: 2500,
      sarcasticQuote: '牛市里亏钱？那是艺术，不是交易。',
    },
    specialEventId: '',
    difficulty: 0.8,
    unlockShort: false,
    tutorialMode: false,
    newsCount: 3,
  },
  {
    day: 3,
    regime: 'bear',
    bossObjective: {
      id: 'd3-no-loss',
      description: '今日不能亏损',
      targetMetric: 'noLoss',
      threshold: 0,
      sarcasticQuote: '熊市保本就是赢，别跟我争。',
    },
    specialEventId: '',
    difficulty: 0.9,
    unlockShort: false,
    tutorialMode: false,
    newsCount: 4,
  },
  {
    day: 4,
    regime: 'crash',
    bossObjective: {
      id: 'd4-survive',
      description: '收盘总资产不低于 $95,000',
      targetMetric: 'totalAssets',
      threshold: 95000,
      sarcasticQuote: '危机日，活下来就是业绩。',
    },
    specialEventId: 'day4_crisis',
    difficulty: 1.2,
    unlockShort: false,
    tutorialMode: false,
    newsCount: 5,
  },
  {
    day: 5,
    regime: 'flat',
    bossObjective: {
      id: 'd5-short',
      description: '完成至少 3 笔交易（含做空）',
      targetMetric: 'minTrades',
      threshold: 3,
      sarcasticQuote: '做空解锁了，别只会做多，那是散户思维。',
    },
    specialEventId: 'day5_short_unlock',
    difficulty: 1,
    unlockShort: true,
    tutorialMode: false,
    newsCount: 4,
  },
  {
    day: 6,
    regime: 'bear',
    bossObjective: {
      id: 'd6-compliance',
      description: '收盘时合规压力低于 50',
      targetMetric: 'lowCompliance',
      threshold: 50,
      sarcasticQuote: '合规部今天心情不错，别惹他们。',
    },
    specialEventId: '',
    difficulty: 1.1,
    unlockShort: true,
    tutorialMode: false,
    newsCount: 4,
  },
  {
    day: 7,
    regime: 'mania',
    bossObjective: {
      id: 'd7-profit',
      description: '今日盈利至少 $5,000',
      targetMetric: 'dailyPnl',
      threshold: 5000,
      sarcasticQuote: '狂热日，赚不到钱就别下班。',
    },
    specialEventId: 'day7_mania',
    difficulty: 1.3,
    unlockShort: true,
    tutorialMode: false,
    newsCount: 6,
  },
  {
    day: 8,
    regime: 'bear',
    bossObjective: {
      id: 'd8-client',
      description: '今日盈利至少 $3,000（挽回客户信任）',
      targetMetric: 'dailyPnl',
      threshold: 3000,
      sarcasticQuote: '客户要赎回？用 PnL 把他堵回去。',
    },
    specialEventId: 'day8_redemption',
    difficulty: 1.2,
    unlockShort: true,
    tutorialMode: false,
    newsCount: 5,
  },
  {
    day: 9,
    regime: 'flat',
    bossObjective: {
      id: 'd9-compliance',
      description: '合规压力低于 60 且今日不亏损',
      targetMetric: 'lowCompliance',
      threshold: 60,
      sarcasticQuote: '监管在看着，别给我惹事。',
    },
    specialEventId: 'day9_investigation',
    difficulty: 1.25,
    unlockShort: true,
    tutorialMode: false,
    newsCount: 5,
  },
  {
    day: 10,
    regime: 'bull',
    bossObjective: {
      id: 'd10-final',
      description: '收盘总资产达到 $120,000',
      targetMetric: 'totalAssets',
      threshold: 120000,
      sarcasticQuote: '最终考核。让我看看你是不是野兽，还是猎物。',
    },
    specialEventId: 'day10_final',
    difficulty: 1.4,
    unlockShort: true,
    tutorialMode: false,
    newsCount: 6,
  },
];

export function getDayConfig(dayIndex: number): DayConfig {
  return CAMPAIGN_DAYS[Math.min(dayIndex, CAMPAIGN_DAYS.length - 1)];
}

export function evaluateBossObjective(
  objective: BossObjective,
  player: PlayerState,
  market: MarketState
): boolean {
  const assets = calcTotalAssets(player, market);
  switch (objective.targetMetric) {
    case 'dailyPnl':
      return player.dailyPnL >= objective.threshold;
    case 'noLoss':
      return player.dailyPnL >= 0;
    case 'totalAssets':
      return assets >= objective.threshold;
    case 'lowCompliance':
      return player.complianceHeat < objective.threshold && player.dailyPnL >= 0;
    case 'sectorExposure': {
      if (!objective.sector) return true;
      const exp = player.sectorExposure[objective.sector] ?? 0;
      return exp >= objective.threshold;
    }
    case 'highRisk':
      return player.leverage >= 1.5;
    case 'minTrades':
      return player.tradeHistory.length >= objective.threshold;
    default:
      return false;
  }
}

export function buildDayReport(
  save: GameSave,
  bossMet: boolean
): DayReport {
  const assets = calcTotalAssets(save.player, save.market);
  const highlights: string[] = [];
  if (bossMet) highlights.push('老板目标：已完成（他假装很满意）');
  else highlights.push('老板目标：未完成（邮件已发送）');
  if (save.player.dailyPnL > 0) highlights.push(`今日盈利 $${save.player.dailyPnL.toFixed(0)}`);
  else highlights.push(`今日亏损 $${Math.abs(save.player.dailyPnL).toFixed(0)}`);
  if (save.player.complianceHeat > 70) highlights.push('合规压力偏高，请注意');
  if (save.player.tradeHistory.length > 10) highlights.push('交易频繁，手续费贡献突出');

  return {
    day: save.dayIndex + 1,
    dateLabel: `第 ${save.dayIndex + 1} 交易日`,
    startAssets: save.player.dayStartAssets,
    endAssets: assets,
    dailyPnl: save.player.dailyPnL,
    realizedPnl: save.player.realizedPnL,
    feesPaid: save.player.feesPaid,
    bossObjectiveMet: bossMet,
    bossQuote: save.bossObjective.sarcasticQuote,
    complianceDelta: 0,
    reputationDelta: 0,
    tradesCount: save.player.tradeHistory.length,
    highlights,
  };
}

export function scoreEndOfDay(save: GameSave, bossMet: boolean): PlayerState {
  let player = { ...save.player };
  const assets = calcTotalAssets(player, save.market);

  if (bossMet) {
    player.bossSatisfaction = Math.min(100, player.bossSatisfaction + 12);
    player.careerScore += 15;
  } else {
    player.bossSatisfaction = Math.max(0, player.bossSatisfaction - 15);
    player.careerScore = Math.max(0, player.careerScore - 5);
  }

  if (player.dailyPnL > 0) {
    player.reputation = Math.min(100, player.reputation + 5);
    player.clientTrust = Math.min(100, player.clientTrust + 4);
    player.stress = Math.max(0, player.stress - 5);
    player.consecutiveLossDays = 0;
  } else {
    player.reputation = Math.max(0, player.reputation - 3);
    player.clientTrust = Math.max(0, player.clientTrust - 6);
    player.stress = Math.min(100, player.stress + 8);
    player.consecutiveLossDays += 1;
  }

  player.complianceHeat = Math.min(
    100,
    player.complianceHeat + save.player.unethicalActions * 2
  );

  if (assets > 110000) player.careerScore += 10;
  if (player.liquidation) player.careerScore = Math.max(0, player.careerScore - 50);

  return player;
}

export function determineEnding(save: GameSave): { ending: GameEnding; narrative: string[] } {
  const assets = calcTotalAssets(save.player, save.market);
  const p = save.player;

  if (p.liquidation || assets < 10000) {
    return {
      ending: 'bankrupt',
      narrative: [
        '【破产出局】',
        '你的账户在最后一次强平后归零。',
        'Victor 总发来最后一条语音：“年轻人，市场记住了你——作为反面教材。”',
        '你收拾工位，发现抽屉里还有半包过期的免费咖啡粉。',
      ],
    };
  }

  if (p.complianceHeat > 85 && p.reputation < 40) {
    return {
      ending: 'scapegoat',
      narrative: [
        '【替罪羊】',
        '调查结束后，你的名字出现在内部通报里。',
        '老板在全员会上说：“个别员工的个人行为。”',
        '你拿到了丰厚的离职补偿——以及一份行业黑名单的传闻。',
      ],
    };
  }

  if (p.complianceHeat < 25 && assets < 105000) {
    return {
      ending: 'complianceSaint',
      narrative: [
        '【合规模范但赚不到钱】',
        '合规部给你颁发了“零违规交易员”奖状。',
        '老板拍拍你的肩：“很好，下次记得也赚钱。”',
        '你的职业生涯安全得像国债——收益也像。',
      ],
    };
  }

  if (p.leverage > 2.5 && p.stress > 70 && assets > 115000) {
    return {
      ending: 'madGambler',
      narrative: [
        '【疯狂赌徒】',
        '你用最激进的杠杆熬过了 10 天，账户数字惊人。',
        '心理医生不建议你继续这份工作，但老板建议你继续。',
        '传说你在深夜对着 K 线大笑，保安不敢上前。',
      ],
    };
  }

  if (assets >= 130000 && p.careerScore >= 80 && p.reputation >= 60) {
    return {
      ending: 'wallStreetKing',
      narrative: [
        '【华尔街新王】',
        '10 天后，你的名字出现在公司大屏上。',
        'Victor 总罕见地用了“佩服”这个词——然后立刻加了新的 KPI。',
        '资本市场没有永远的赢家，但至少今天是你。',
      ],
    };
  }

  if (p.careerScore >= 70 && p.reputation >= 55 && assets >= 115000) {
    return {
      ending: 'vanishedGenius',
      narrative: [
        '【神秘失踪的天才交易员】',
        '你在达到惊人业绩后突然提交辞呈。',
        '没人知道你去向，只有账户留下一串无法复制的曲线。',
        '业内流传：你去了冰岛钓鱼，或者去了另一家更大的野兽巢穴。',
      ],
    };
  }

  if (assets >= 120000) {
    return {
      ending: 'wallStreetKing',
      narrative: [
        '【华尔街新王】',
        '你完成了最终考核，老板难得地请你喝了杯真咖啡。',
        '客户 Silent Zhang 发来一句：“还行。”——这在他的字典里等于最高赞誉。',
      ],
    };
  }

  return {
    ending: 'madGambler',
    narrative: [
      '【疯狂赌徒】',
      '你活过了 10 天，数字起伏像过山车。',
      '老板说你“有潜力”，合规部说你“有嫌疑”。',
      '资本市场继续运转，而你还坐在第 47 排。',
    ],
  };
}

export const ACHIEVEMENT_DEFS = [
  { id: 'first-profit', title: '第一滴血', description: '完成第一笔盈利交易' },
  { id: 'day-big-win', title: '日进斗金', description: '单日盈利超过 $8,000' },
  { id: 'compliance-clean', title: '清白之身', description: '单日合规压力低于 20' },
  { id: 'boss-favorite', title: '老板宠儿', description: '老板满意度达到 90' },
  { id: 'short-master', title: '空头艺术家', description: '做空盈利超过 $3,000' },
  { id: 'survive-crash', title: '崩盘幸存者', description: '在崩盘日完成老板目标' },
  { id: 'ten-trades', title: '高频野兽', description: '单日完成 10 笔以上交易' },
  { id: 'final-boss', title: '最终考核', description: '完成第 10 天考核' },
];

export function generateFakeLeaderboard(seed: number): { name: string; score: number }[] {
  const names = [
    'Wolf_47',
    'QuantMoth',
    'SilentZhang',
    'BearHugger',
    'GammaChad',
    'DeltaCry',
    'AlgoGhost',
    'PnL_Poet',
    'MarginKing',
    'VultureFan',
  ];
  const rng = (s: number) => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0xffffffff;
  };
  let s = seed;
  return names
    .map((name) => {
      s = (s * 1664525 + 1013904223) >>> 0;
      return { name, score: 80000 + Math.floor(rng(s) * 80000) };
    })
    .sort((a, b) => b.score - a.score);
}

export function randomBossToast(day: number): string {
  return BOSS_QUOTES[day % BOSS_QUOTES.length];
}

export function getRegimeLabel(regime: MarketRegime): string {
  const map: Record<MarketRegime, string> = {
    bull: '牛市',
    bear: '熊市',
    flat: '横盘',
    crash: '崩盘',
    mania: '狂热',
  };
  return map[regime];
}

export function getEndingTitle(ending: GameEnding): string {
  const map: Record<GameEnding, string> = {
    wallStreetKing: '华尔街新王',
    madGambler: '疯狂赌徒',
    complianceSaint: '合规模范',
    scapegoat: '替罪羊',
    bankrupt: '破产出局',
    vanishedGenius: '神秘失踪的天才',
  };
  return map[ending];
}
