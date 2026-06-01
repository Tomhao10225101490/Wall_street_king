interface TutorialModalProps {
  onClose: (skipped: boolean) => void;
}

const STEPS = [
  '阅读右侧新闻流 — 消息会延迟影响股价，注意可信度标签。',
  '左侧选择股票，中间查看走势并下单。',
  '支持买入、卖出；第5天解锁做空与平仓。',
  '底部关注持仓、现金与今日老板目标。',
  '办公室面板显示合规、声誉与压力 — 爆表会出事。',
  '收盘后查看日报，完成 10 日 campaign 解锁结局。',
];

export function TutorialModal({ onClose }: TutorialModalProps) {
  return (
    <div className="modal-overlay">
      <div className="tutorial-modal glass">
        <h2>市场野兽 · 快速教程</h2>
        <p className="muted">纯属虚构模拟，不构成任何投资建议。</p>
        <ol>
          {STEPS.map((s) => (
            <li key={s}>{s}</li>
          ))}
        </ol>
        <div className="eod-actions">
          <button type="button" onClick={() => onClose(true)}>
            跳过
          </button>
          <button type="button" className="primary" onClick={() => onClose(false)}>
            开始交易
          </button>
        </div>
      </div>
    </div>
  );
}
