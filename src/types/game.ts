export type Sector =
  | 'robotics'
  | 'retail'
  | 'biotech'
  | 'energy'
  | 'media'
  | 'mining'
  | 'cloud'
  | 'logistics'
  | 'medical'
  | 'security'
  | 'fashion'
  | 'food';

export type MarketRegime = 'bull' | 'bear' | 'flat' | 'crash' | 'mania';

export type GamePhase = 'title' | 'preMarket' | 'trading' | 'report' | 'ending';

export type PositionSide = 'long' | 'short';

export type TradeAction = 'buy' | 'sell' | 'short' | 'cover';

export type ImpactDirection = 'up' | 'down' | 'mixed';

export type BossMetric =
  | 'dailyPnl'
  | 'noLoss'
  | 'sectorExposure'
  | 'lowCompliance'
  | 'recoverClientLoss'
  | 'highRisk'
  | 'totalAssets'
  | 'minTrades';

export interface Stock {
  ticker: string;
  name: string;
  sector: Sector;
  price: number;
  openPrice: number;
  volatility: number;
  momentum: number;
  sentiment: number;
  liquidity: number;
  riskLevel: number;
  hiddenTrend: number;
  dayHigh: number;
  dayLow: number;
  volume: number;
  priceHistory: number[];
  playerImpact: number;
}

export interface ScheduledImpact {
  id: string;
  tickers: string[];
  sectors: Sector[];
  strength: number;
  direction: ImpactDirection;
  startMinute: number;
  halfLife: number;
  remainingStrength: number;
}

export interface MarketState {
  stocks: Stock[];
  regime: MarketRegime;
  marketSentiment: number;
  minutes: number;
  sectorSentiment: Record<Sector, number>;
  activeImpacts: ScheduledImpact[];
  whaleCooldown: number;
  dayOpenAssets: number;
  flashCrash: boolean;
}

export interface NewsEvent {
  id: string;
  title: string;
  body: string;
  affectedTickers: string[];
  affectedSectors: Sector[];
  impactDirection: ImpactDirection;
  impactStrength: number;
  delayMinutes: number;
  credibility: number;
  ethicalRisk: number;
  legalRisk: number;
  duration: number;
  timestamp: string;
  gameMinute: number;
  source: string;
  applied: boolean;
}

export interface Position {
  ticker: string;
  qty: number;
  side: PositionSide;
  avgCost: number;
  openedAt: number;
}

export interface TradeOrder {
  id: string;
  ticker: string;
  action: TradeAction;
  qty: number;
  price: number;
  fee: number;
  slippage: number;
  timestamp: string;
  gameMinute: number;
}

export interface BossObjective {
  id: string;
  description: string;
  targetMetric: BossMetric;
  threshold: number;
  sector?: Sector;
  sarcasticQuote: string;
}

export interface DayConfig {
  day: number;
  regime: MarketRegime;
  bossObjective: BossObjective;
  specialEventId: string;
  difficulty: number;
  unlockShort: boolean;
  tutorialMode: boolean;
  newsCount: number;
}

export interface EthicalChoiceOption {
  label: string;
  effects: {
    cash?: number;
    bossSatisfaction?: number;
    complianceHeat?: number;
    reputation?: number;
    stress?: number;
    careerScore?: number;
    clientTrust?: number;
    legalRisk?: number;
  };
  followUpEventId?: string;
}

export interface EthicalChoice {
  id: string;
  prompt: string;
  options: EthicalChoiceOption[];
  resolved: boolean;
}

export interface ComplianceEmail {
  id: string;
  from: string;
  subject: string;
  body: string;
  minute: number;
  read: boolean;
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  unlocked: boolean;
  unlockedAt?: string;
}

export interface DayReport {
  day: number;
  dateLabel: string;
  startAssets: number;
  endAssets: number;
  dailyPnl: number;
  realizedPnl: number;
  feesPaid: number;
  bossObjectiveMet: boolean;
  bossQuote: string;
  complianceDelta: number;
  reputationDelta: number;
  tradesCount: number;
  highlights: string[];
}

export interface PlayerState {
  cash: number;
  positions: Position[];
  realizedPnL: number;
  marginUsed: number;
  leverage: number;
  feesPaid: number;
  bossSatisfaction: number;
  complianceHeat: number;
  reputation: number;
  stress: number;
  careerScore: number;
  clientTrust: number;
  dailyPnL: number;
  dayStartAssets: number;
  tradeHistory: TradeOrder[];
  liquidation: boolean;
  psychPressure: boolean;
  consecutiveLossDays: number;
  sectorExposure: Record<Sector, number>;
  unethicalActions: number;
  shortsUnlocked: boolean;
}

export type GameEnding =
  | 'wallStreetKing'
  | 'madGambler'
  | 'complianceSaint'
  | 'scapegoat'
  | 'bankrupt'
  | 'vanishedGenius';

export interface CampaignFlags {
  tutorialSeen: boolean;
  day1Complete: boolean;
  firstShort: boolean;
  investigated: boolean;
}

export interface GameSave {
  version: number;
  dayIndex: number;
  phase: GamePhase;
  market: MarketState;
  player: PlayerState;
  newsFeed: NewsEvent[];
  eventLog: string[];
  ethicalChoices: EthicalChoice[];
  complianceEmails: ComplianceEmail[];
  achievements: Achievement[];
  campaignFlags: CampaignFlags;
  rngSeed: number;
  bossObjective: BossObjective;
  dayConfig: DayConfig;
  selectedTicker: string;
  speed: 1 | 2 | 5;
  paused: boolean;
  audioEnabled: boolean;
  volume: number;
  lastReports: DayReport[];
  pendingBossToast: string | null;
  ending: GameEnding | null;
  endingNarrative: string[];
  fakeLeaderboard: { name: string; score: number }[];
}

export const SAVE_VERSION = 1;
export const MARKET_OPEN = 540;
export const MARKET_CLOSE = 960;
export const INITIAL_CASH = 100_000;
export const HISTORY_LENGTH = 120;
