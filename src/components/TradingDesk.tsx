import { useState } from 'react';
import { GameSave, TradeAction } from '../types/game';
import { getStock, dayChangePercent } from '../game/market';
import {
  getLongQty,
  getShortQty,
  getMaxBuyQty,
  calcTotalAssets,
} from '../game/player';
import { PriceChart } from './PriceChart';

interface TradingDeskProps {
  save: GameSave;
  onTrade: (action: TradeAction, qty: number) => void;
  canTrade: boolean;
}

export function TradingDesk({ save, onTrade, canTrade }: TradingDeskProps) {
  const [qtyInput, setQtyInput] = useState('100');
  const stock = getStock(save.market, save.selectedTicker);
  if (!stock) return <div className="trading-desk glass">选择股票</div>;

  const qty = parseInt(qtyInput, 10) || 0;
  const longQty = getLongQty(save.player, stock.ticker);
  const shortQty = getShortQty(save.player, stock.ticker);
  const maxBuy = getMaxBuyQty(save.player, save.market, stock.ticker);
  const change = dayChangePercent(stock);
  const assets = calcTotalAssets(save.player, save.market);

  const run = (action: TradeAction, q: number) => {
    if (!canTrade || q <= 0) return;
    onTrade(action, q);
  };

  return (
    <div className="trading-desk glass">
      <div className="desk-header">
        <div>
          <h2>
            {stock.ticker} · {stock.name}
          </h2>
          <span className="sector-tag">{stock.sector}</span>
        </div>
        <div className="desk-price">
          <span className={`big-price ${change >= 0 ? 'up' : 'down'}`}>
            ${stock.price.toFixed(2)}
          </span>
          <span className={`chg ${change >= 0 ? 'up' : 'down'}`}>
            {change >= 0 ? '+' : ''}
            {change.toFixed(2)}%
          </span>
        </div>
      </div>

      <PriceChart stock={stock} />

      <div className="trade-controls">
        <label>
          数量
          <input
            type="number"
            min={1}
            value={qtyInput}
            onChange={(e) => setQtyInput(e.target.value)}
            disabled={!canTrade}
          />
        </label>
        <div className="trade-buttons">
          <button type="button" disabled={!canTrade} onClick={() => run('buy', 10)}>
            买10
          </button>
          <button type="button" disabled={!canTrade} onClick={() => run('buy', 100)}>
            买100
          </button>
          <button
            type="button"
            disabled={!canTrade || maxBuy <= 0}
            onClick={() => run('buy', maxBuy)}
          >
            全仓买
          </button>
          <button
            type="button"
            disabled={!canTrade || longQty <= 0}
            onClick={() => run('sell', Math.floor(longQty / 2))}
          >
            卖50%
          </button>
          <button
            type="button"
            disabled={!canTrade || longQty <= 0}
            onClick={() => run('sell', longQty)}
          >
            全卖
          </button>
          <button
            type="button"
            disabled={!canTrade || !save.player.shortsUnlocked}
            onClick={() => run('short', 100)}
          >
            空100
          </button>
          <button
            type="button"
            disabled={!canTrade || shortQty <= 0}
            onClick={() => run('cover', shortQty)}
          >
            平空
          </button>
          <button type="button" disabled={!canTrade} onClick={() => run('buy', qty)}>
            买入
          </button>
          <button type="button" disabled={!canTrade} onClick={() => run('sell', qty)}>
            卖出
          </button>
        </div>
        <div className="position-hint">
          多头 {longQty} · 空头 {shortQty} · 现金 ${save.player.cash.toFixed(0)} · 总资产 $
          {assets.toFixed(0)}
        </div>
      </div>
    </div>
  );
}
