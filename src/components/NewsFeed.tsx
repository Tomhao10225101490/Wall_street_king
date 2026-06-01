import { NewsEvent } from '../types/game';

interface NewsFeedProps {
  items: NewsEvent[];
  flash?: boolean;
}

export function NewsFeed({ items, flash }: NewsFeedProps) {
  const sorted = [...items].sort((a, b) => b.gameMinute - a.gameMinute).slice(0, 40);

  return (
    <div className={`news-feed glass ${flash ? 'mania-flash' : ''}`}>
      <div className="panel-header">新闻终端</div>
      <div className="news-scroll">
        {sorted.length === 0 && <p className="muted">等待新闻推送…</p>}
        {sorted.map((n) => (
          <article key={n.id} className={`news-item ${n.applied ? 'applied' : 'pending'}`}>
            <header>
              <span className="news-time">{n.timestamp}</span>
              <span className="news-source">{n.source}</span>
            </header>
            <h4>{n.title}</h4>
            <p>{n.body}</p>
            <footer>
              <span
                className={`tag dir-${n.impactDirection}`}
                title="影响方向"
              >
                {n.impactDirection === 'up'
                  ? '利多'
                  : n.impactDirection === 'down'
                    ? '利空'
                    : '混合'}
              </span>
              <span className="tag">强度 {(n.impactStrength * 100).toFixed(0)}%</span>
              <span className="tag">可信 {(n.credibility * 100).toFixed(0)}%</span>
              {n.ethicalRisk > 15 && (
                <span className="tag risk">伦理风险</span>
              )}
              {n.legalRisk > 20 && (
                <span className="tag risk">法律风险</span>
              )}
              {(n.affectedTickers.length > 0 || n.affectedSectors.length > 0) && (
                <span className="tag">
                  {n.affectedTickers.join(', ') || n.affectedSectors.join(', ')}
                </span>
              )}
            </footer>
          </article>
        ))}
      </div>
    </div>
  );
}
