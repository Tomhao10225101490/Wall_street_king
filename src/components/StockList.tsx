import { Stock } from '../types/game';
import { dayChangePercent } from '../game/market';

const SECTOR_ICON: Record<string, string> = {
  robotics: '🤖',
  retail: '🛒',
  biotech: '🧬',
  energy: '⚡',
  media: '📺',
  mining: '⛏',
  cloud: '☁',
  logistics: '🦀',
  medical: '🏥',
  security: '🔒',
  fashion: '👗',
  food: '🍜',
};

interface StockListProps {
  stocks: Stock[];
  selected: string;
  onSelect: (ticker: string) => void;
}

export function StockList({ stocks, selected, onSelect }: StockListProps) {
  return (
    <div className="stock-list glass">
      <div className="panel-header">行情列表</div>
      <div className="stock-list-scroll">
        {stocks.map((s) => {
          const chg = dayChangePercent(s);
          const up = chg >= 0;
          return (
            <button
              key={s.ticker}
              type="button"
              className={`stock-row ${selected === s.ticker ? 'selected' : ''}`}
              onClick={() => onSelect(s.ticker)}
            >
              <span className="stock-icon">{SECTOR_ICON[s.sector] ?? '◆'}</span>
              <span className="stock-ticker">{s.ticker}</span>
              <span className="stock-price">{s.price.toFixed(2)}</span>
              <span className={`stock-chg ${up ? 'up' : 'down'}`}>
                {up ? '+' : ''}
                {chg.toFixed(2)}%
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
