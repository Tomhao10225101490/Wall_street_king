import {
  ACHIEVEMENT_DEFS,
  CAMPAIGN_DAYS,
  generateFakeLeaderboard,
  getDayConfig,
} from './campaign';
import { generateDayEvents, getDailyEthicalChoice } from './events';
import { createMarket } from './market';
import { calcTotalAssets, createPlayer } from './player';
import {
  Achievement,
  GamePhase,
  GameSave,
  MARKET_OPEN,
  SAVE_VERSION,
} from '../types/game';

export function createNewGame(seed = Date.now()): GameSave {
  const dayConfig = getDayConfig(0);
  const market = createMarket(dayConfig.regime, seed);
  const player = createPlayer();
  player.shortsUnlocked = dayConfig.unlockShort;
  player.dayStartAssets = player.cash;

  const achievements: Achievement[] = ACHIEVEMENT_DEFS.map((a) => ({
    ...a,
    unlocked: false,
  }));

  const newsFeed = generateDayEvents(dayConfig, seed, MARKET_OPEN - 30);
  const ethicalChoice = getDailyEthicalChoice(1, seed);

  return {
    version: SAVE_VERSION,
    dayIndex: 0,
    phase: 'preMarket' as GamePhase,
    market,
    player,
    newsFeed,
    eventLog: ['入职 Beast Capital，工位 #47。'],
    ethicalChoices: ethicalChoice ? [ethicalChoice] : [],
    complianceEmails: [],
    achievements,
    campaignFlags: {
      tutorialSeen: false,
      day1Complete: false,
      firstShort: false,
      investigated: false,
    },
    rngSeed: seed,
    bossObjective: dayConfig.bossObjective,
    dayConfig,
    selectedTicker: 'NOVA',
    speed: 1,
    paused: false,
    audioEnabled: false,
    volume: 0.35,
    lastReports: [],
    pendingBossToast: dayConfig.bossObjective.sarcasticQuote,
    ending: null,
    endingNarrative: [],
    fakeLeaderboard: generateFakeLeaderboard(seed),
  };
}

export function startTradingDay(save: GameSave): GameSave {
  const assets = calcTotalAssets(save.player, save.market);
  return {
    ...save,
    phase: 'trading',
    player: {
      ...save.player,
      dayStartAssets: assets,
      dailyPnL: 0,
      tradeHistory: [],
    },
    market: { ...save.market, minutes: MARKET_OPEN, dayOpenAssets: assets },
  };
}

export function prepareNextDay(save: GameSave): GameSave {
  const nextDayIndex = save.dayIndex + 1;
  if (nextDayIndex >= CAMPAIGN_DAYS.length) {
    return { ...save, phase: 'ending' };
  }
  const dayConfig = getDayConfig(nextDayIndex);
  const seed = save.rngSeed + nextDayIndex * 7919;
  const newsFeed = generateDayEvents(dayConfig, seed, MARKET_OPEN - 30);
  const ethicalChoice = getDailyEthicalChoice(nextDayIndex + 1, seed);
  return {
    ...save,
    dayIndex: nextDayIndex,
    dayConfig,
    bossObjective: dayConfig.bossObjective,
    phase: 'preMarket',
    newsFeed,
    ethicalChoices: ethicalChoice ? [ethicalChoice] : [],
    player: {
      ...save.player,
      shortsUnlocked: save.player.shortsUnlocked || dayConfig.unlockShort,
      unethicalActions: 0,
    },
    pendingBossToast: dayConfig.bossObjective.sarcasticQuote,
    market: {
      ...save.market,
      regime: dayConfig.regime,
      minutes: MARKET_OPEN - 30,
    },
  };
}
