import {
  INITIAL_CASH,
  MarketState,
  PlayerState,
  Position,
  Sector,
  TradeAction,
  TradeOrder,
} from '../types/game';
import { applyTradeImpact, getStock } from './market';

const FEE_RATE = 0.001;
const BASE_SLIPPAGE = 0.0003;
const MARGIN_REQUIREMENT = 0.25;
const LIQUIDATION_THRESHOLD = 0.15;

export function createPlayer(): PlayerState {
  return {
    cash: INITIAL_CASH,
    positions: [],
    realizedPnL: 0,
    marginUsed: 0,
    leverage: 1,
    feesPaid: 0,
    bossSatisfaction: 55,
    complianceHeat: 10,
    reputation: 50,
    stress: 20,
    careerScore: 0,
    clientTrust: 60,
    dailyPnL: 0,
    dayStartAssets: INITIAL_CASH,
    tradeHistory: [],
    liquidation: false,
    psychPressure: false,
    consecutiveLossDays: 0,
    sectorExposure: {
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
    },
    unethicalActions: 0,
    shortsUnlocked: false,
  };
}

export function getPosition(player: PlayerState, ticker: string): Position | undefined {
  return player.positions.find((p) => p.ticker === ticker);
}

export function calcSlippage(price: number, qty: number, liquidity: number): number {
  const notional = price * qty;
  return BASE_SLIPPAGE + notional / (liquidity * 2_000_000);
}

export function calcFee(notional: number): number {
  return notional * FEE_RATE;
}

export function positionMarketValue(pos: Position, price: number): number {
  if (pos.side === 'long') return pos.qty * price;
  return -pos.qty * price;
}

export function calcUnrealizedPnL(player: PlayerState, market: MarketState): number {
  let total = 0;
  for (const pos of player.positions) {
    const stock = getStock(market, pos.ticker);
    if (!stock) continue;
    if (pos.side === 'long') {
      total += (stock.price - pos.avgCost) * pos.qty;
    } else {
      total += (pos.avgCost - stock.price) * pos.qty;
    }
  }
  return total;
}

export function calcTotalAssets(player: PlayerState, market: MarketState): number {
  let assets = player.cash;
  for (const pos of player.positions) {
    const stock = getStock(market, pos.ticker);
    if (!stock) continue;
    if (pos.side === 'long') {
      assets += stock.price * pos.qty;
    } else {
      assets -= stock.price * pos.qty;
      assets += pos.avgCost * pos.qty;
    }
  }
  return assets;
}

export function calcMarginUsed(player: PlayerState, market: MarketState): number {
  let margin = 0;
  for (const pos of player.positions) {
    const stock = getStock(market, pos.ticker);
    if (!stock) continue;
    if (pos.side === 'short') {
      margin += stock.price * pos.qty * MARGIN_REQUIREMENT;
    }
  }
  return margin;
}

export function calcLeverage(player: PlayerState, market: MarketState): number {
  const assets = calcTotalAssets(player, market);
  if (assets <= 0) return 99;
  const exposure = player.positions.reduce((sum, p) => {
    const s = getStock(market, p.ticker);
    return sum + (s ? s.price * p.qty : 0);
  }, 0);
  return exposure / assets;
}

export function updateSectorExposure(player: PlayerState, market: MarketState): PlayerState {
  const sectorExposure = { ...player.sectorExposure };
  for (const key of Object.keys(sectorExposure) as Sector[]) {
    sectorExposure[key] = 0;
  }
  for (const pos of player.positions) {
    const stock = getStock(market, pos.ticker);
    if (!stock) continue;
    const val = Math.abs(positionMarketValue(pos, stock.price));
    sectorExposure[stock.sector] += val;
  }
  return { ...player, sectorExposure };
}

export interface TradeResult {
  player: PlayerState;
  market: MarketState;
  success: boolean;
  message: string;
  order?: TradeOrder;
}

function addOrder(
  player: PlayerState,
  ticker: string,
  action: TradeAction,
  qty: number,
  price: number,
  fee: number,
  slippage: number,
  minute: number
): PlayerState {
  const order: TradeOrder = {
    id: `t-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    ticker,
    action,
    qty,
    price,
    fee,
    slippage,
    timestamp: new Date().toISOString(),
    gameMinute: minute,
  };
  return {
    ...player,
    tradeHistory: [...player.tradeHistory.slice(-99), order],
    feesPaid: player.feesPaid + fee,
  };
}

function upsertPosition(
  positions: Position[],
  ticker: string,
  side: 'long' | 'short',
  qtyDelta: number,
  price: number,
  minute: number
): Position[] {
  const existing = positions.find((p) => p.ticker === ticker && p.side === side);
  if (!existing && qtyDelta > 0) {
    return [...positions, { ticker, qty: qtyDelta, side, avgCost: price, openedAt: minute }];
  }
  if (!existing) return positions;

  if (qtyDelta > 0) {
    const newQty = existing.qty + qtyDelta;
    const avgCost = (existing.avgCost * existing.qty + price * qtyDelta) / newQty;
    return positions.map((p) =>
      p.ticker === ticker && p.side === side ? { ...p, qty: newQty, avgCost } : p
    );
  }

  const newQty = existing.qty - qtyDelta;
  if (newQty <= 0) {
    return positions.filter((p) => !(p.ticker === ticker && p.side === side));
  }
  return positions.map((p) =>
    p.ticker === ticker && p.side === side ? { ...p, qty: newQty } : p
  );
}

export function executeTrade(
  player: PlayerState,
  market: MarketState,
  ticker: string,
  action: TradeAction,
  qty: number
): TradeResult {
  if (player.liquidation) {
    return { player, market, success: false, message: '账户已强平，无法交易。' };
  }
  if (qty <= 0 || !Number.isFinite(qty)) {
    return { player, market, success: false, message: '数量无效。' };
  }

  const stock = getStock(market, ticker);
  if (!stock) {
    return { player, market, success: false, message: '股票不存在。' };
  }

  const slippagePct = calcSlippage(stock.price, qty, stock.liquidity);
  let execPrice = stock.price;
  if (action === 'buy' || action === 'cover') {
    execPrice *= 1 + slippagePct;
  } else {
    execPrice *= 1 - slippagePct;
  }

  const notional = execPrice * qty;
  const fee = calcFee(notional);
  let nextPlayer = { ...player };
  let nextMarket = market;

  switch (action) {
    case 'buy': {
      const cost = notional + fee;
      if (nextPlayer.cash < cost) {
        return { player, market, success: false, message: '现金不足。' };
      }
      nextPlayer.cash -= cost;
      nextPlayer.positions = upsertPosition(
        nextPlayer.positions,
        ticker,
        'long',
        qty,
        execPrice,
        market.minutes
      );
      nextMarket = applyTradeImpact(nextMarket, ticker, notional, 'buy');
      nextPlayer = addOrder(nextPlayer, ticker, action, qty, execPrice, fee, slippagePct, market.minutes);
      nextPlayer.stress = Math.min(100, nextPlayer.stress + 0.5);
      break;
    }
    case 'sell': {
      const longPos = nextPlayer.positions.find((p) => p.ticker === ticker && p.side === 'long');
      if (!longPos || longPos.qty < qty) {
        return { player, market, success: false, message: '多头持仓不足。' };
      }
      const proceeds = notional - fee;
      const pnl = (execPrice - longPos.avgCost) * qty - fee;
      nextPlayer.cash += proceeds;
      nextPlayer.realizedPnL += pnl;
      nextPlayer.positions = upsertPosition(nextPlayer.positions, ticker, 'long', -qty, execPrice, market.minutes);
      nextMarket = applyTradeImpact(nextMarket, ticker, notional, 'sell');
      nextPlayer = addOrder(nextPlayer, ticker, action, qty, execPrice, fee, slippagePct, market.minutes);
      break;
    }
    case 'short': {
      if (!nextPlayer.shortsUnlocked) {
        return { player, market, success: false, message: '做空尚未解锁（第5个交易日）。' };
      }
      const marginNeeded = notional * MARGIN_REQUIREMENT;
      if (nextPlayer.cash < fee + marginNeeded * 0.1) {
        return { player, market, success: false, message: '保证金不足。' };
      }
      nextPlayer.cash -= fee;
      nextPlayer.positions = upsertPosition(
        nextPlayer.positions,
        ticker,
        'short',
        qty,
        execPrice,
        market.minutes
      );
      nextMarket = applyTradeImpact(nextMarket, ticker, notional, 'short');
      nextPlayer = addOrder(nextPlayer, ticker, action, qty, execPrice, fee, slippagePct, market.minutes);
      nextPlayer.complianceHeat = Math.min(100, nextPlayer.complianceHeat + 1.5);
      nextPlayer.stress = Math.min(100, nextPlayer.stress + 1);
      break;
    }
    case 'cover': {
      const shortPos = nextPlayer.positions.find((p) => p.ticker === ticker && p.side === 'short');
      if (!shortPos || shortPos.qty < qty) {
        return { player, market, success: false, message: '空头持仓不足。' };
      }
      const cost = notional + fee;
      if (nextPlayer.cash < cost) {
        return { player, market, success: false, message: '现金不足以平仓。' };
      }
      const pnl = (shortPos.avgCost - execPrice) * qty - fee;
      nextPlayer.cash -= cost;
      nextPlayer.cash += shortPos.avgCost * qty;
      nextPlayer.realizedPnL += pnl;
      nextPlayer.positions = upsertPosition(nextPlayer.positions, ticker, 'short', -qty, execPrice, market.minutes);
      nextMarket = applyTradeImpact(nextMarket, ticker, notional, 'cover');
      nextPlayer = addOrder(nextPlayer, ticker, action, qty, execPrice, fee, slippagePct, market.minutes);
      break;
    }
  }

  nextPlayer.marginUsed = calcMarginUsed(nextPlayer, nextMarket);
  nextPlayer.leverage = calcLeverage(nextPlayer, nextMarket);
  nextPlayer = updateSectorExposure(nextPlayer, nextMarket);

  const assets = calcTotalAssets(nextPlayer, nextMarket);
  const equity = assets - nextPlayer.marginUsed;
  const marginRatio = assets > 0 ? equity / assets : 0;

  if (marginRatio < LIQUIDATION_THRESHOLD && nextPlayer.positions.length > 0) {
    nextPlayer = forceLiquidate(nextPlayer, nextMarket).player;
    nextPlayer.liquidation = true;
    return {
      player: nextPlayer,
      market: nextMarket,
      success: true,
      message: '保证金不足，强制平仓！',
    };
  }

  if (assets < 5000) {
    nextPlayer.liquidation = true;
  }

  return {
    player: nextPlayer,
    market: nextMarket,
    success: true,
    message: `${action} ${qty} ${ticker} @ ${execPrice.toFixed(2)}`,
    order: nextPlayer.tradeHistory[nextPlayer.tradeHistory.length - 1],
  };
}

function forceLiquidate(player: PlayerState, market: MarketState): TradeResult {
  let p = { ...player, positions: [] };
  p.cash = calcTotalAssets(player, market) * 0.7;
  p.stress = 100;
  p.reputation = Math.max(0, p.reputation - 20);
  p.complianceHeat = Math.min(100, p.complianceHeat + 15);
  return { player: p, market, success: true, message: '强平完成' };
}

export function refreshDailyPnL(player: PlayerState, market: MarketState): PlayerState {
  const assets = calcTotalAssets(player, market);
  return {
    ...player,
    dailyPnL: assets - player.dayStartAssets,
    marginUsed: calcMarginUsed(player, market),
    leverage: calcLeverage(player, market),
    psychPressure: player.stress > 75 || player.consecutiveLossDays >= 2,
  };
}

export function applyStatDelta(
  player: PlayerState,
  delta: Partial<
    Pick<
      PlayerState,
      | 'bossSatisfaction'
      | 'complianceHeat'
      | 'reputation'
      | 'stress'
      | 'careerScore'
      | 'clientTrust'
      | 'cash'
    >
  >
): PlayerState {
  const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));
  return {
    ...player,
    bossSatisfaction:
      delta.bossSatisfaction !== undefined
        ? clamp(player.bossSatisfaction + delta.bossSatisfaction, 0, 100)
        : player.bossSatisfaction,
    complianceHeat:
      delta.complianceHeat !== undefined
        ? clamp(player.complianceHeat + delta.complianceHeat, 0, 100)
        : player.complianceHeat,
    reputation:
      delta.reputation !== undefined ? clamp(player.reputation + delta.reputation, 0, 100) : player.reputation,
    stress: delta.stress !== undefined ? clamp(player.stress + delta.stress, 0, 100) : player.stress,
    careerScore:
      delta.careerScore !== undefined ? player.careerScore + delta.careerScore : player.careerScore,
    clientTrust:
      delta.clientTrust !== undefined
        ? clamp(player.clientTrust + delta.clientTrust, 0, 100)
        : player.clientTrust,
    cash: delta.cash !== undefined ? player.cash + delta.cash : player.cash,
  };
}

export function getMaxBuyQty(player: PlayerState, market: MarketState, ticker: string): number {
  const stock = getStock(market, ticker);
  if (!stock) return 0;
  const price = stock.price * 1.002;
  return Math.floor(player.cash / (price * (1 + FEE_RATE)));
}

export function getLongQty(player: PlayerState, ticker: string): number {
  const p = player.positions.find((x) => x.ticker === ticker && x.side === 'long');
  return p?.qty ?? 0;
}

export function getShortQty(player: PlayerState, ticker: string): number {
  const p = player.positions.find((x) => x.ticker === ticker && x.side === 'short');
  return p?.qty ?? 0;
}
