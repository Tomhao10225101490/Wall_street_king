import {
  HISTORY_LENGTH,
  MARKET_CLOSE,
  MARKET_OPEN,
  MarketRegime,
  MarketState,
  ScheduledImpact,
  Sector,
  Stock,
} from '../types/game';

export interface Rng {
  next: () => number;
}

export function createRng(seed: number): Rng {
  let s = seed >>> 0;
  return {
    next: () => {
      s = (s * 1664525 + 1013904223) >>> 0;
      return s / 0xffffffff;
    },
  };
}

const STOCK_DEFS: Omit<
  Stock,
  'price' | 'openPrice' | 'dayHigh' | 'dayLow' | 'volume' | 'priceHistory' | 'playerImpact' | 'momentum'
>[] = [
  { ticker: 'NOVA', name: 'NovaDyne Robotics', sector: 'robotics', volatility: 0.028, sentiment: 0.1, liquidity: 0.85, riskLevel: 4, hiddenTrend: 0.0008 },
  { ticker: 'GLUM', name: 'GlumMart', sector: 'retail', volatility: 0.018, sentiment: -0.05, liquidity: 0.95, riskLevel: 2, hiddenTrend: -0.0002 },
  { ticker: 'ZENX', name: 'Zenith BioLabs', sector: 'biotech', volatility: 0.035, sentiment: 0.15, liquidity: 0.6, riskLevel: 5, hiddenTrend: 0.001 },
  { ticker: 'COIL', name: 'CoilGrid Energy', sector: 'energy', volatility: 0.022, sentiment: 0, liquidity: 0.8, riskLevel: 3, hiddenTrend: 0.0003 },
  { ticker: 'FIZZ', name: 'FizzPop Media', sector: 'media', volatility: 0.03, sentiment: 0.08, liquidity: 0.75, riskLevel: 4, hiddenTrend: 0.0005 },
  { ticker: 'DUST', name: 'DustBridge Mining', sector: 'mining', volatility: 0.026, sentiment: -0.1, liquidity: 0.7, riskLevel: 4, hiddenTrend: -0.0004 },
  { ticker: 'OMNI', name: 'OmniCloud Systems', sector: 'cloud', volatility: 0.024, sentiment: 0.12, liquidity: 0.9, riskLevel: 3, hiddenTrend: 0.0006 },
  { ticker: 'CRAB', name: 'CrabPort Logistics', sector: 'logistics', volatility: 0.016, sentiment: 0.02, liquidity: 0.88, riskLevel: 2, hiddenTrend: 0.0001 },
  { ticker: 'HALO', name: 'HaloMed Devices', sector: 'medical', volatility: 0.02, sentiment: 0.06, liquidity: 0.82, riskLevel: 3, hiddenTrend: 0.0004 },
  { ticker: 'BYTE', name: 'ByteBunker Security', sector: 'security', volatility: 0.027, sentiment: 0.14, liquidity: 0.78, riskLevel: 4, hiddenTrend: 0.0007 },
  { ticker: 'LUXE', name: 'LuxeLoop Fashion', sector: 'fashion', volatility: 0.021, sentiment: 0.04, liquidity: 0.65, riskLevel: 3, hiddenTrend: 0.0002 },
  { ticker: 'MUD', name: 'MudFoods', sector: 'food', volatility: 0.014, sentiment: -0.02, liquidity: 0.92, riskLevel: 1, hiddenTrend: -0.0001 },
];

const BASE_PRICES: Record<string, number> = {
  NOVA: 142.5,
  GLUM: 23.8,
  ZENX: 88.2,
  COIL: 56.4,
  FIZZ: 34.6,
  DUST: 41.2,
  OMNI: 210.0,
  CRAB: 18.5,
  HALO: 67.3,
  BYTE: 95.7,
  LUXE: 44.1,
  MUD: 9.2,
};

/** 每分钟最大涨跌幅（普通 / 极端行情） */
const MAX_TICK_CHANGE = 0.022;
const MAX_TICK_CHANGE_EXTREME = 0.045;
/** 相对开盘价日内最大涨跌倍数 */
const MAX_INTRADAY_RATIO = 1.35;
const MIN_INTRADAY_RATIO = 0.65;
/** 相对上市基准价的最大偏离倍数 */
const MAX_VS_BASE = 2.5;
const MIN_VS_BASE = 0.2;
/** 动量上限，防止狂热日正反馈失控 */
const MAX_MOMENTUM = 0.12;
/** 多条新闻叠加后的冲击上限（tick 前） */
const MAX_NEWS_IMPACT_STACK = 1.2;

function getBasePrice(ticker: string): number {
  return BASE_PRICES[ticker] ?? 50;
}

function clampTickDelta(delta: number, regime: MarketRegime, flashCrash: boolean): number {
  const cap =
    flashCrash || regime === 'crash' || regime === 'mania'
      ? MAX_TICK_CHANGE_EXTREME
      : MAX_TICK_CHANGE;
  return Math.max(-cap, Math.min(cap, delta));
}

/** 将价格限制在基准价与当日开盘价附近的合理区间 */
export function boundStockPrice(ticker: string, price: number, openPrice: number): number {
  const base = getBasePrice(ticker);
  const maxP = Math.min(base * MAX_VS_BASE, openPrice * MAX_INTRADAY_RATIO);
  const minP = Math.max(0.5, Math.max(base * MIN_VS_BASE, openPrice * MIN_INTRADAY_RATIO));
  return Math.max(minP, Math.min(maxP, price));
}

function clampMomentum(momentum: number): number {
  return Math.max(-MAX_MOMENTUM, Math.min(MAX_MOMENTUM, momentum));
}

function applyPriceChange(
  stock: Stock,
  delta: number,
  regime: MarketRegime,
  flashCrash: boolean
): { price: number; momentum: number; delta: number } {
  const clampedDelta = clampTickDelta(delta, regime, flashCrash);
  let price = stock.price * (1 + clampedDelta);
  price = boundStockPrice(stock.ticker, price, stock.openPrice);
  const momentum = clampMomentum(stock.momentum * 0.92 + clampedDelta * 4);
  return { price, momentum, delta: clampedDelta };
}

function initSectorSentiment(): Record<Sector, number> {
  return {
    robotics: 0,
    retail: 0,
    biotech: 0,
    energy: 0,
    media: 0,
    mining: 0,
    cloud: 0,
    logistics: 0,
    medical: 0,
    security: 0,
    fashion: 0,
    food: 0,
  };
}

function createStock(def: (typeof STOCK_DEFS)[0], price: number): Stock {
  return {
    ...def,
    price,
    openPrice: price,
    dayHigh: price,
    dayLow: price,
    volume: 0,
    momentum: 0,
    priceHistory: Array(HISTORY_LENGTH).fill(price),
    playerImpact: 0,
  };
}

export function createMarket(regime: MarketRegime, _seed: number, dayOpenAssets = 0): MarketState {
  const stocks = STOCK_DEFS.map((d) => createStock(d, BASE_PRICES[d.ticker] ?? 50));
  return {
    stocks,
    regime,
    marketSentiment: regimeSentiment(regime),
    minutes: MARKET_OPEN,
    sectorSentiment: initSectorSentiment(),
    activeImpacts: [],
    whaleCooldown: 0,
    dayOpenAssets,
    flashCrash: false,
  };
}

function regimeSentiment(regime: MarketRegime): number {
  switch (regime) {
    case 'bull':
      return 0.25;
    case 'bear':
      return -0.2;
    case 'crash':
      return -0.55;
    case 'mania':
      return 0.45;
    default:
      return 0;
  }
}

export function regimeDrift(regime: MarketRegime): number {
  switch (regime) {
    case 'bull':
      return 0.00035;
    case 'bear':
      return -0.0003;
    case 'crash':
      return -0.0012;
    case 'mania':
      return 0.0008;
    default:
      return 0;
  }
}

export function regimeVolMultiplier(regime: MarketRegime): number {
  switch (regime) {
    case 'bull':
      return 1.1;
    case 'bear':
      return 1.25;
    case 'crash':
      return 2.2;
    case 'mania':
      return 1.6;
    default:
      return 1;
  }
}

export function getStock(state: MarketState, ticker: string): Stock | undefined {
  return state.stocks.find((s) => s.ticker === ticker);
}

export function scheduleImpact(
  state: MarketState,
  impact: Omit<ScheduledImpact, 'remainingStrength'>
): MarketState {
  return {
    ...state,
    activeImpacts: [
      ...state.activeImpacts,
      { ...impact, remainingStrength: impact.strength },
    ],
  };
}

export function applySectorSentiment(
  state: MarketState,
  sector: Sector,
  delta: number
): MarketState {
  const sectorSentiment = { ...state.sectorSentiment };
  sectorSentiment[sector] = Math.max(-1, Math.min(1, sectorSentiment[sector] + delta));
  return { ...state, sectorSentiment };
}

function gaussian(rng: Rng): number {
  const u1 = rng.next() || 0.0001;
  const u2 = rng.next();
  return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
}

function impactForStock(stock: Stock, impacts: ScheduledImpact[], minute: number): number {
  let total = 0;
  for (const imp of impacts) {
    const elapsed = minute - imp.startMinute;
    if (elapsed < 0) continue;
    const decay = Math.exp(-elapsed / Math.max(imp.halfLife, 1));
    const strength = imp.remainingStrength * decay;
    const tickerHit = imp.tickers.includes(stock.ticker);
    const sectorHit = imp.sectors.includes(stock.sector);
    if (!tickerHit && !sectorHit) continue;
    let dir = 0;
    if (imp.direction === 'up') dir = 1;
    else if (imp.direction === 'down') dir = -1;
    else dir = rngSign(stock.ticker, minute) * 0.5;
    const mult = tickerHit ? 1 : 0.45;
    total += dir * strength * mult;
  }
  return Math.max(-MAX_NEWS_IMPACT_STACK, Math.min(MAX_NEWS_IMPACT_STACK, total));
}

function rngSign(ticker: string, minute: number): number {
  const n = (ticker.charCodeAt(0) + minute) % 2;
  return n === 0 ? 1 : -1;
}

export function applyTradeImpact(
  state: MarketState,
  ticker: string,
  notional: number,
  side: 'buy' | 'sell' | 'short' | 'cover'
): MarketState {
  const stock = getStock(state, ticker);
  if (!stock) return state;
  const sign = side === 'buy' || side === 'cover' ? 1 : -1;
  const rawImpact = sign * (notional / (stock.liquidity * 500_000));
  const impact = Math.max(-0.03, Math.min(0.03, rawImpact));
  const stocks = state.stocks.map((s) => {
    if (s.ticker !== ticker) return s;
    const playerImpact = Math.max(-0.05, Math.min(0.05, s.playerImpact + impact));
    const tradeDelta = clampTickDelta(impact * 0.4, state.regime, false);
    const price = boundStockPrice(s.ticker, s.price * (1 + tradeDelta), s.openPrice);
    return { ...s, playerImpact, price };
  });
  return { ...state, stocks };
}

function runAiParticipants(state: MarketState, rng: Rng): MarketState {
  let next = { ...state, whaleCooldown: Math.max(0, state.whaleCooldown - 1) };

  if (rng.next() < 0.012 && next.whaleCooldown <= 0) {
    const idx = Math.floor(rng.next() * next.stocks.length);
    const pulse = (rng.next() > 0.5 ? 1 : -1) * (0.03 + rng.next() * 0.05);
    next = {
      ...next,
      whaleCooldown: 8 + Math.floor(rng.next() * 5),
      stocks: next.stocks.map((s, i) => {
        if (i !== idx) return s;
        const { price, momentum } = applyPriceChange(s, pulse, state.regime, false);
        return { ...s, price, momentum };
      }),
    };
  }

  if (state.regime === 'mania' && rng.next() < 0.04) {
    const hot = [...next.stocks].sort((a, b) => b.momentum - a.momentum)[0];
    if (hot) {
      next = {
        ...next,
        stocks: next.stocks.map((s) => {
          if (s.ticker !== hot.ticker) return s;
          const bump = 0.006 + rng.next() * 0.008;
          const { price, momentum } = applyPriceChange(s, bump, 'mania', false);
          return { ...s, price, momentum };
        }),
      };
    }
  }

  if (rng.next() < 0.02) {
    const quiet = next.stocks.filter((s) => s.volatility < 0.022);
    const pick = quiet[Math.floor(rng.next() * quiet.length)];
    if (pick) {
      next = {
        ...next,
        stocks: next.stocks.map((s) => {
          if (s.ticker !== pick.ticker) return s;
          const { price, momentum } = applyPriceChange(s, 0.0012, state.regime, false);
          return {
            ...s,
            price,
            momentum,
            hiddenTrend: Math.max(-0.001, Math.min(0.001, s.hiddenTrend + 0.00002)),
          };
        }),
      };
    }
  }

  return next;
}

export function tickMarket(state: MarketState, rng: Rng): MarketState {
  if (state.minutes >= MARKET_CLOSE) return state;

  const minute = state.minutes + 1;
  const drift = regimeDrift(state.regime);
  const volMult = regimeVolMultiplier(state.regime);
  const flashCrash = state.regime === 'crash' && rng.next() < 0.03;

  let stocks = state.stocks.map((stock) => {
    const newsImpact = impactForStock(stock, state.activeImpacts, minute);
    const sector = state.sectorSentiment[stock.sector] * 0.00035;
    const sentiment = stock.sentiment * 0.00015;
    const trend = stock.hiddenTrend;
    const noise =
      Math.max(-0.004, Math.min(0.004, gaussian(rng) * stock.volatility * volMult * 0.003));
    const playerDecay = stock.playerImpact * 0.55;
    const market = state.marketSentiment * 0.00012;
    const momPull = -stock.momentum * 0.08;
    let delta =
      drift +
      trend +
      sector +
      sentiment +
      newsImpact * 0.0025 +
      noise +
      market +
      playerDecay * 0.0015 +
      momPull;

    if (flashCrash) delta -= 0.006 + rng.next() * 0.01;

    const { price, momentum } = applyPriceChange(stock, delta, state.regime, flashCrash);
    const boundedHigh = boundStockPrice(stock.ticker, Math.max(stock.dayHigh, price), stock.openPrice);
    const boundedLow = boundStockPrice(stock.ticker, Math.min(stock.dayLow, price), stock.openPrice);
    const history = [...stock.priceHistory.slice(1), price];
    const volume = stock.volume + Math.floor(rng.next() * 5000 * stock.liquidity);

    return {
      ...stock,
      price,
      momentum,
      playerImpact: playerDecay,
      dayHigh: boundedHigh,
      dayLow: boundedLow,
      volume,
      priceHistory: history,
    };
  });

  const activeImpacts = state.activeImpacts
    .map((imp) => ({
      ...imp,
      remainingStrength: imp.remainingStrength * 0.995,
    }))
    .filter((imp) => imp.remainingStrength > 0.01 && minute - imp.startMinute < imp.halfLife * 5);

  let next: MarketState = {
    ...state,
    minutes: minute,
    stocks,
    activeImpacts,
    flashCrash: flashCrash || state.flashCrash,
  };

  next = runAiParticipants(next, rng);
  return next;
}

export function resetMarketForNewDay(
  state: MarketState,
  regime: MarketRegime,
  rng: Rng
): MarketState {
  const stocks = state.stocks.map((s) => {
    const base = getBasePrice(s.ticker);
    const jitter = 0.98 + rng.next() * 0.04;
    const blended = s.price * 0.35 * jitter + base * 0.65;
    const price = boundStockPrice(s.ticker, blended, blended);
    return {
      ...s,
      price,
      openPrice: price,
      dayHigh: price,
      dayLow: price,
      volume: 0,
      momentum: 0,
      playerImpact: 0,
      priceHistory: Array(HISTORY_LENGTH).fill(price),
      hiddenTrend: Math.max(-0.0008, Math.min(0.0008, (rng.next() - 0.5) * 0.0004)),
    };
  });
  return {
    stocks,
    regime,
    marketSentiment: regimeSentiment(regime),
    minutes: MARKET_OPEN,
    sectorSentiment: initSectorSentiment(),
    activeImpacts: [],
    whaleCooldown: 0,
    dayOpenAssets: state.dayOpenAssets,
    flashCrash: false,
  };
}

export function formatMarketTime(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
}

export function isMarketOpen(minutes: number): boolean {
  return minutes >= MARKET_OPEN && minutes < MARKET_CLOSE;
}

export function dayChangePercent(stock: Stock): number {
  if (stock.openPrice <= 0) return 0;
  const raw = ((stock.price - stock.openPrice) / stock.openPrice) * 100;
  if (!Number.isFinite(raw)) return 0;
  return Math.max(-65, Math.min(35, raw));
}
