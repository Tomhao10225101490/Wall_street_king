import { useCallback, useEffect, useRef, useState } from 'react';
import {
  GameSave,
  TradeAction,
  DayReport,
  MARKET_CLOSE,
} from './types/game';
import { TitleScreen } from './components/TitleScreen';
import { TutorialModal } from './components/TutorialModal';
import { StockList } from './components/StockList';
import { TradingDesk } from './components/TradingDesk';
import { NewsFeed } from './components/NewsFeed';
import { PortfolioPanel } from './components/PortfolioPanel';
import { OfficePanel } from './components/OfficePanel';
import { EndOfDayReport } from './components/EndOfDayReport';
import { BossToast } from './components/BossToast';
import { createNewGame, startTradingDay, prepareNextDay } from './game/state';
import { loadSave, persistSave, clearSave, hasSave } from './game/save';
import {
  tickMarket,
  createRng,
  resetMarketForNewDay,
  formatMarketTime,
  isMarketOpen,
} from './game/market';
import {
  executeTrade,
  applyStatDelta,
  refreshDailyPnL,
  calcTotalAssets,
} from './game/player';
import {
  processPendingNews,
  maybeIntradayEvent,
  createComplianceEmail,
} from './game/events';
import {
  evaluateBossObjective,
  buildDayReport,
  scoreEndOfDay,
  determineEnding,
  getRegimeLabel,
  getEndingTitle,
  CAMPAIGN_DAYS,
} from './game/campaign';
import {
  audioManager,
  initAudio,
  playTradeBuy,
  playTradeSell,
  playNews,
  playBell,
  playProfit,
  playLoss,
  playWarning,
  startBgm,
  stopBgm,
  setVolume,
} from './game/audio';

function unlockAchievement(save: GameSave, id: string): GameSave {
  const existing = save.achievements.find((a) => a.id === id);
  if (!existing || existing.unlocked) return save;
  const achievements = save.achievements.map((a) =>
    a.id === id ? { ...a, unlocked: true, unlockedAt: new Date().toISOString() } : a
  );
  return { ...save, achievements };
}

function checkAchievements(save: GameSave): GameSave {
  let s = save;
  const p = save.player;
  if (p.realizedPnL > 0) {
    s = unlockAchievement(s, 'first-profit');
  }
  if (p.dailyPnL > 8000) s = unlockAchievement(s, 'day-big-win');
  if (p.complianceHeat < 20) s = unlockAchievement(s, 'compliance-clean');
  if (p.bossSatisfaction >= 90) s = unlockAchievement(s, 'boss-favorite');
  if (p.tradeHistory.length >= 10) s = unlockAchievement(s, 'ten-trades');
  if (save.dayConfig.regime === 'crash' && evaluateBossObjective(save.bossObjective, p, save.market)) {
    s = unlockAchievement(s, 'survive-crash');
  }
  if (save.dayIndex >= 9) s = unlockAchievement(s, 'final-boss');
  return s;
}

export default function App() {
  const [save, setSave] = useState<GameSave | null>(null);
  const [showTutorial, setShowTutorial] = useState(false);
  const [eodReport, setEodReport] = useState<DayReport | null>(null);
  const [tradeMsg, setTradeMsg] = useState('');
  const saveRef = useRef<GameSave | null>(null);
  const prevAssetsRef = useRef(0);

  useEffect(() => {
    saveRef.current = save;
  }, [save]);

  useEffect(() => {
    if (save && save.phase !== 'title') {
      persistSave(save);
    }
  }, [save]);

  const handleNewGame = () => {
    const game = createNewGame();
    setSave(game);
    if (!game.campaignFlags.tutorialSeen) {
      setShowTutorial(true);
    }
  };

  const handleContinue = () => {
    const loaded = loadSave();
    if (loaded) setSave(loaded);
  };

  const handleReset = () => {
    clearSave();
    setSave(null);
  };

  const enableAudio = () => {
    initAudio();
    setSave((s) => {
      if (!s) return s;
      const next = { ...s, audioEnabled: true };
      setVolume(next.volume, false);
      startBgm();
      return next;
    });
  };

  const toggleMute = () => {
    setSave((s) => {
      if (!s) return s;
      const nextEnabled = !s.audioEnabled;
      if (nextEnabled) {
        initAudio();
        startBgm();
        setVolume(s.volume, false);
      } else {
        stopBgm();
        setVolume(s.volume, true);
      }
      return { ...s, audioEnabled: nextEnabled };
    });
  };

  const startDay = useCallback(() => {
    setSave((s) => {
      if (!s) return s;
      let next = startTradingDay(s);
      const regime = next.dayConfig.regime;
      next = {
        ...next,
        market: resetMarketForNewDay(
          { ...next.market, regime },
          regime,
          createRng(next.rngSeed + next.dayIndex)
        ),
      };
      if (next.dayConfig.unlockShort) {
        next = {
          ...next,
          player: { ...next.player, shortsUnlocked: true },
        };
      }
      prevAssetsRef.current = calcTotalAssets(next.player, next.market);
      return next;
    });
    setEodReport(null);
  }, []);

  const closeMarket = useCallback(() => {
    setSave((s) => {
      if (!s) return s;
      const bossMet = evaluateBossObjective(s.bossObjective, s.player, s.market);
      let player = scoreEndOfDay(s, bossMet);
      const report = buildDayReport({ ...s, player }, bossMet);
      setEodReport(report);
      let next: GameSave = {
        ...s,
        player,
        phase: 'report',
        lastReports: [...s.lastReports.slice(-9), report],
        campaignFlags: {
          ...s.campaignFlags,
          day1Complete: s.dayIndex === 0 || s.campaignFlags.day1Complete,
        },
      };
      next = checkAchievements(next);
      if (s.audioEnabled) {
        playBell();
        audioManager.playClosingJingle();
      }
      return next;
    });
  }, []);

  const handleEodContinue = () => {
    if (!save) return;
    if (save.dayIndex >= CAMPAIGN_DAYS.length - 1) {
      const { ending, narrative } = determineEnding(save);
      setSave({
        ...save,
        phase: 'ending',
        ending,
        endingNarrative: narrative,
      });
      setEodReport(null);
      return;
    }
    setSave((s) => {
      if (!s) return s;
      const next = prepareNextDay(s);
      return next;
    });
    setEodReport(null);
  };

  const handleTrade = (action: TradeAction, qty: number) => {
    setSave((s) => {
      if (!s || s.phase !== 'trading' || !isMarketOpen(s.market.minutes)) return s;
      const result = executeTrade(s.player, s.market, s.selectedTicker, action, qty);
      if (!result.success) {
        setTradeMsg(result.message);
        return s;
      }
      if (s.audioEnabled) {
        if (action === 'buy' || action === 'cover') playTradeBuy();
        else playTradeSell();
      }
      let player = result.player;
      if (action === 'short' && !s.campaignFlags.firstShort) {
        player = { ...player };
      }
      const assets = calcTotalAssets(player, result.market);
      if (assets > prevAssetsRef.current + 500 && s.audioEnabled) playProfit();
      if (assets < prevAssetsRef.current - 500 && s.audioEnabled) playLoss();
      prevAssetsRef.current = assets;

      let next: GameSave = {
        ...s,
        player,
        market: result.market,
        campaignFlags: {
          ...s.campaignFlags,
          firstShort: s.campaignFlags.firstShort || action === 'short',
        },
      };
      if (player.liquidation && s.audioEnabled) playWarning();
      setTradeMsg(result.message);
      return next;
    });
  };

  const resolveChoice = (choiceId: string, optionIndex: number) => {
    setSave((s) => {
      if (!s) return s;
      const choice = s.ethicalChoices.find((c) => c.id === choiceId);
      if (!choice || choice.resolved) return s;
      const opt = choice.options[optionIndex];
      if (!opt) return s;
      let player = applyStatDelta(s.player, opt.effects);
      if (opt.label.includes('相信') || opt.label.includes('照做') || opt.label.includes('答应')) {
        player = { ...player, unethicalActions: player.unethicalActions + 1 };
      }
      const ethicalChoices = s.ethicalChoices.map((c) =>
        c.id === choiceId ? { ...c, resolved: true } : c
      );
      return {
        ...s,
        player,
        ethicalChoices,
        eventLog: [...s.eventLog, `灰色选择：${opt.label}`],
      };
    });
  };

  const dismissToast = () => {
    setSave((s) => (s ? { ...s, pendingBossToast: null } : s));
    if (save?.audioEnabled) {
      initAudio();
      audioManager.playBoss();
    }
  };

  // Game tick loop
  useEffect(() => {
    if (!save || save.phase !== 'trading' || save.paused) return;

    const intervalMs = save.speed === 5 ? 200 : save.speed === 2 ? 500 : 1000;

    const id = setInterval(() => {
      const current = saveRef.current;
      if (!current || current.phase !== 'trading' || current.paused) return;

      setSave((s) => {
        if (!s || s.phase !== 'trading') return s;
        const rng = createRng(s.rngSeed + s.market.minutes * 31 + s.dayIndex * 1000);
        let market = tickMarket(s.market, rng);
        let newsFeed = s.newsFeed;

        const intraday = maybeIntradayEvent(newsFeed, s.rngSeed, market.minutes, market.regime);
        if (intraday) {
          newsFeed = [intraday, ...newsFeed].slice(0, 50);
          if (s.audioEnabled) playNews();
        }

        const processed = processPendingNews(market, newsFeed);
        market = processed.market;
        newsFeed = processed.newsFeed;

        let player = refreshDailyPnL(s.player, market);

        if (s.audioEnabled) {
          audioManager.setMood(player.stress, player.complianceHeat);
        }

        let complianceEmails = s.complianceEmails;
        if (
          player.complianceHeat > 55 &&
          rng.next() < 0.02 &&
          complianceEmails.length < 8
        ) {
          complianceEmails = [
            createComplianceEmail(market.minutes, player.complianceHeat),
            ...complianceEmails,
          ];
        }

        if (market.minutes >= MARKET_CLOSE) {
          setTimeout(() => closeMarket(), 100);
        }

        return {
          ...s,
          market,
          player,
          newsFeed,
          complianceEmails,
        };
      });
    }, intervalMs);

    return () => clearInterval(id);
  }, [save?.phase, save?.paused, save?.speed, closeMarket]);

  if (!save || save.phase === 'title') {
    return (
      <TitleScreen
        hasSave={hasSave()}
        onNew={handleNewGame}
        onContinue={handleContinue}
        onReset={handleReset}
      />
    );
  }

  if (showTutorial && !save.campaignFlags.tutorialSeen) {
    return (
      <TutorialModal
        onClose={() => {
          setShowTutorial(false);
          setSave((s) =>
            s
              ? {
                  ...s,
                  campaignFlags: { ...s.campaignFlags, tutorialSeen: true },
                  phase: 'preMarket',
                }
              : s
          );
        }}
      />
    );
  }

  if (save.phase === 'ending' && save.ending) {
    return (
      <div className="ending-screen">
        <div className="ending-content glass">
          <h1>{getEndingTitle(save.ending)}</h1>
          {save.endingNarrative.map((line) => (
            <p key={line}>{line}</p>
          ))}
          <div className="achievements-list">
            <h3>成就</h3>
            <ul>
              {save.achievements
                .filter((a) => a.unlocked)
                .map((a) => (
                  <li key={a.id}>
                    {a.title} — {a.description}
                  </li>
                ))}
            </ul>
          </div>
          <button
            type="button"
            className="primary"
            onClick={() => {
              clearSave();
              setSave(null);
            }}
          >
            返回标题
          </button>
        </div>
      </div>
    );
  }

  const stressClass = save.player.psychPressure ? 'psych-pressure' : '';
  const flashClass = save.market.flashCrash ? 'flash-crash' : '';
  const maniaClass = save.market.regime === 'mania' ? 'mania-mode' : '';

  return (
    <div className={`app ${stressClass} ${flashClass} ${maniaClass}`}>
      <header className="top-bar glass">
        <div className="top-left">
          <span className="logo">MB</span>
          <span>
            第 {save.dayIndex + 1} / {CAMPAIGN_DAYS.length} 日
          </span>
          <span className="regime-tag">{getRegimeLabel(save.market.regime)}</span>
        </div>
        <div className="top-center">
          <span className="market-clock">{formatMarketTime(save.market.minutes)}</span>
          <span className="phase-label">
            {save.phase === 'preMarket'
              ? '盘前'
              : save.phase === 'trading'
                ? '交易中'
                : '收盘'}
          </span>
        </div>
        <div className="top-right">
          {!save.audioEnabled ? (
            <button type="button" onClick={enableAudio}>
              启用声音
            </button>
          ) : (
            <button type="button" onClick={toggleMute}>
              {save.audioEnabled ? '🔊' : '🔇'}
            </button>
          )}
          <select
            value={save.speed}
            onChange={(e) =>
              setSave((s) => (s ? { ...s, speed: Number(e.target.value) as 1 | 2 | 5 } : s))
            }
          >
            <option value={1}>1x</option>
            <option value={2}>2x</option>
            <option value={5}>5x</option>
          </select>
          <button
            type="button"
            onClick={() => setSave((s) => (s ? { ...s, paused: !s.paused } : s))}
          >
            {save.paused ? '继续' : '暂停'}
          </button>
        </div>
      </header>

      {save.pendingBossToast && (
        <BossToast message={save.pendingBossToast} onDismiss={dismissToast} />
      )}

      {save.phase === 'preMarket' && (
        <div className="premarket-banner glass">
          <h3>盘前简报</h3>
          <p>{save.bossObjective.description}</p>
          <p className="muted">{save.bossObjective.sarcasticQuote}</p>
          <button type="button" className="primary" onClick={startDay}>
            开盘铃响 — 开始交易
          </button>
        </div>
      )}

      <main className="game-grid">
        <StockList
          stocks={save.market.stocks}
          selected={save.selectedTicker}
          onSelect={(t) => setSave((s) => (s ? { ...s, selectedTicker: t } : s))}
        />
        <TradingDesk
          save={save}
          onTrade={handleTrade}
          canTrade={save.phase === 'trading' && isMarketOpen(save.market.minutes) && !save.paused}
        />
        <div className="right-column">
          <NewsFeed
            items={save.newsFeed}
            flash={save.market.regime === 'mania'}
          />
          <OfficePanel
            save={save}
            onResolveChoice={resolveChoice}
            onMarkEmailRead={(id) =>
              setSave((s) =>
                s
                  ? {
                      ...s,
                      complianceEmails: s.complianceEmails.map((m) =>
                        m.id === id ? { ...m, read: true } : m
                      ),
                    }
                  : s
              )
            }
          />
        </div>
      </main>

      <PortfolioPanel save={save} />

      {tradeMsg && (
        <div className="trade-toast" onAnimationEnd={() => setTradeMsg('')}>
          {tradeMsg}
        </div>
      )}

      {eodReport && (
        <EndOfDayReport
          report={eodReport}
          onContinue={handleEodContinue}
          isFinal={save.dayIndex >= CAMPAIGN_DAYS.length - 1}
        />
      )}
    </div>
  );
}
