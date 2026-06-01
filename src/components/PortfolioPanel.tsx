import { GameSave } from '../types/game';
import {
  calcTotalAssets,
  calcUnrealizedPnL,
  refreshDailyPnL,
} from '../game/player';
import { evaluateBossObjective } from '../game/campaign';
import { getStock } from '../game/market';

interface PortfolioPanelProps {
  save: GameSave;
}

export function PortfolioPanel({ save }: PortfolioPanelProps) {
  const player = refreshDailyPnL(save.player, save.market);
  const assets = calcTotalAssets(player, save.market);
  const unrealized = calcUnrealizedPnL(player, save.market);
  const bossMet = evaluateBossObjective(save.bossObjective, player, save.market);

  return (
    <div className="portfolio-panel glass">
      <div className="portfolio-grid">
        <div className="stat">
          <label>现金</label>
          <span>${player.cash.toFixed(0)}</span>
        </div>
        <div className="stat">
          <label>总资产</label>
          <span className={assets >= player.dayStartAssets ? 'up' : 'down'}>
            ${assets.toFixed(0)}
          </span>
        </div>
        <div className="stat">
          <label>今日盈亏</label>
          <span className={player.dailyPnL >= 0 ? 'up' : 'down'}>
            {player.dailyPnL >= 0 ? '+' : ''}${player.dailyPnL.toFixed(0)}
          </span>
        </div>
        <div className="stat">
          <label>未实现</label>
          <span className={unrealized >= 0 ? 'up' : 'down'}>
            ${unrealized.toFixed(0)}
          </span>
        </div>
        <div className="stat">
          <label>已实现</label>
          <span>${player.realizedPnL.toFixed(0)}</span>
        </div>
        <div className="stat">
          <label>杠杆</label>
          <span>{player.leverage.toFixed(2)}x</span>
        </div>
        <div className="stat">
          <label>保证金</label>
          <span>${player.marginUsed.toFixed(0)}</span>
        </div>
        <div className="stat">
          <label>手续费</label>
          <span>${player.feesPaid.toFixed(0)}</span>
        </div>
      </div>

      <div className="objective-bar">
        <span className="objective-label">今日目标</span>
        <span className={bossMet ? 'up' : ''}>{save.bossObjective.description}</span>
        <span className={`objective-status ${bossMet ? 'met' : ''}`}>
          {bossMet ? '已达成' : '进行中'}
        </span>
      </div>

      <div className="positions-table">
        <div className="panel-header small">持仓</div>
        {player.positions.length === 0 ? (
          <p className="muted">空仓 — 资本市场在等待你的错误。</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>代码</th>
                <th>方向</th>
                <th>数量</th>
                <th>均价</th>
                <th>现价</th>
                <th>盈亏</th>
              </tr>
            </thead>
            <tbody>
              {player.positions.map((p) => {
                const s = getStock(save.market, p.ticker);
                const price = s?.price ?? p.avgCost;
                const pnl =
                  p.side === 'long'
                    ? (price - p.avgCost) * p.qty
                    : (p.avgCost - price) * p.qty;
                return (
                  <tr key={`${p.ticker}-${p.side}`}>
                    <td>{p.ticker}</td>
                    <td className={p.side === 'long' ? 'up' : 'down'}>
                      {p.side === 'long' ? '多' : '空'}
                    </td>
                    <td>{p.qty}</td>
                    <td>{p.avgCost.toFixed(2)}</td>
                    <td>{price.toFixed(2)}</td>
                    <td className={pnl >= 0 ? 'up' : 'down'}>${pnl.toFixed(0)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
