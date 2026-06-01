import { EthicalChoice, GameSave } from '../types/game';

interface OfficePanelProps {
  save: GameSave;
  onResolveChoice: (choiceId: string, optionIndex: number) => void;
  onMarkEmailRead: (id: string) => void;
}

export function OfficePanel({
  save,
  onResolveChoice,
  onMarkEmailRead,
}: OfficePanelProps) {
  const bars = [
    { label: '老板', value: save.player.bossSatisfaction, color: '#f59e0b' },
    { label: '合规', value: save.player.complianceHeat, color: '#ef4444' },
    { label: '声誉', value: save.player.reputation, color: '#3b82f6' },
    { label: '压力', value: save.player.stress, color: '#a855f7' },
    { label: '客户', value: save.player.clientTrust, color: '#22c55e' },
  ];

  return (
    <div className="office-panel glass">
      <div className="panel-header">办公室</div>

      <div className="boss-card">
        <div className="avatar boss">VK</div>
        <div>
          <strong>Victor K. · 你的老板</strong>
          <p className="boss-quote">"{save.bossObjective.sarcasticQuote}"</p>
        </div>
      </div>

      <div className="stat-bars">
        {bars.map((b) => (
          <div key={b.label} className="bar-row">
            <span>{b.label}</span>
            <div className="bar-track">
              <div
                className="bar-fill"
                style={{ width: `${b.value}%`, background: b.color }}
              />
            </div>
            <span className="bar-val">{b.value.toFixed(0)}</span>
          </div>
        ))}
      </div>

      <div className="career-score">
        职业分 <strong>{save.player.careerScore}</strong>
      </div>

      {save.ethicalChoices
        .filter((c) => !c.resolved)
        .map((c) => (
          <EthicalChoiceCard
            key={c.id}
            choice={c}
            onSelect={(i) => onResolveChoice(c.id, i)}
          />
        ))}

      <div className="compliance-mails">
        <div className="panel-header small">合规邮件</div>
        {save.complianceEmails.length === 0 ? (
          <p className="muted">暂无新邮件。保持低调。</p>
        ) : (
          save.complianceEmails.slice(0, 5).map((m) => (
            <button
              key={m.id}
              type="button"
              className={`mail-item ${m.read ? 'read' : ''}`}
              onClick={() => onMarkEmailRead(m.id)}
            >
              <strong>{m.subject}</strong>
              <span>{m.body}</span>
            </button>
          ))
        )}
      </div>

      <div className="leaderboard">
        <div className="panel-header small">今日排行榜（模拟）</div>
        <ol>
          {save.fakeLeaderboard.slice(0, 5).map((e, i) => (
            <li key={e.name}>
              {i + 1}. {e.name} — ${e.score.toLocaleString()}
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}

function EthicalChoiceCard({
  choice,
  onSelect,
}: {
  choice: EthicalChoice;
  onSelect: (i: number) => void;
}) {
  return (
    <div className="ethical-choice">
      <p>{choice.prompt}</p>
      <div className="choice-btns">
        {choice.options.map((opt, i) => (
          <button key={opt.label} type="button" onClick={() => onSelect(i)}>
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}
