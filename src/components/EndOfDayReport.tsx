import { DayReport } from '../types/game';
import { exportDayReportJson } from '../game/save';

interface EndOfDayReportProps {
  report: DayReport;
  onContinue: () => void;
  isFinal: boolean;
}

export function EndOfDayReport({ report, onContinue, isFinal }: EndOfDayReportProps) {
  return (
    <div className="modal-overlay">
      <div className="eod-report glass">
        <h2>收盘报告 · {report.dateLabel}</h2>
        <p className="boss-line">"{report.bossQuote}"</p>

        <div className="eod-grid">
          <div>
            <label>开盘资产</label>
            <span>${report.startAssets.toFixed(0)}</span>
          </div>
          <div>
            <label>收盘资产</label>
            <span>${report.endAssets.toFixed(0)}</span>
          </div>
          <div>
            <label>今日盈亏</label>
            <span className={report.dailyPnl >= 0 ? 'up' : 'down'}>
              {report.dailyPnl >= 0 ? '+' : ''}${report.dailyPnl.toFixed(0)}
            </span>
          </div>
          <div>
            <label>交易笔数</label>
            <span>{report.tradesCount}</span>
          </div>
          <div>
            <label>老板目标</label>
            <span className={report.bossObjectiveMet ? 'up' : 'down'}>
              {report.bossObjectiveMet ? '完成' : '未完成'}
            </span>
          </div>
        </div>

        <ul className="highlights">
          {report.highlights.map((h) => (
            <li key={h}>{h}</li>
          ))}
        </ul>

        <div className="eod-actions">
          <button type="button" onClick={() => exportDayReportJson(report, report.day)}>
            导出 JSON
          </button>
          <button type="button" className="primary" onClick={onContinue}>
            {isFinal ? '查看结局' : '进入下一交易日'}
          </button>
        </div>
      </div>
    </div>
  );
}
