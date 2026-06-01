import { Stock } from '../types/game';
import { dayChangePercent } from '../game/market';

interface PriceChartProps {
  stock: Stock;
}

export function PriceChart({ stock }: PriceChartProps) {
  const history = stock.priceHistory;
  const min = Math.min(...history) * 0.998;
  const max = Math.max(...history) * 1.002;
  const range = max - min || 1;
  const w = 400;
  const h = 120;
  const points = history
    .map((p, i) => {
      const x = (i / (history.length - 1)) * w;
      const y = h - ((p - min) / range) * h;
      return `${x},${y}`;
    })
    .join(' ');

  const change = dayChangePercent(stock);
  const color = change >= 0 ? 'var(--green)' : 'var(--red)';

  return (
    <div className="price-chart">
      <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" className="chart-svg">
        <defs>
          <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.35" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>
        <polyline points={points} fill="none" stroke={color} strokeWidth="2" />
        <polygon
          points={`0,${h} ${points} ${w},${h}`}
          fill="url(#chartGrad)"
          opacity="0.5"
        />
      </svg>
      <div className="chart-stats">
        <span>高 {stock.dayHigh.toFixed(2)}</span>
        <span>低 {stock.dayLow.toFixed(2)}</span>
        <span>量 {(stock.volume / 1000).toFixed(1)}K</span>
        <span>情绪 {(stock.sentiment * 100).toFixed(0)}%</span>
      </div>
    </div>
  );
}
