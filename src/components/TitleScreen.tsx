interface TitleScreenProps {
  hasSave: boolean;
  onNew: () => void;
  onContinue: () => void;
  onReset: () => void;
}

export function TitleScreen({ hasSave, onNew, onContinue, onReset }: TitleScreenProps) {
  return (
    <div className="title-screen">
      <div className="title-content glass">
        <h1 className="game-title">
          <span className="en">MARKET BEAST</span>
          <span className="zh">市场野兽</span>
        </h1>
        <p className="tagline">交易员讽刺模拟器 · 虚构市场 · 原创剧情</p>
        <p className="disclaimer">
          本游戏所有公司、人物与事件均为虚构。不提供真实投资建议。灰色剧情仅为游戏机制。
        </p>
        <div className="title-actions">
          <button type="button" className="primary" onClick={onNew}>
            新游戏
          </button>
          {hasSave && (
            <button type="button" onClick={onContinue}>
              继续游戏
            </button>
          )}
          {hasSave && (
            <button type="button" className="danger" onClick={onReset}>
              重置存档
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
