import {
  DayConfig,
  EthicalChoice,
  ImpactDirection,
  MarketState,
  NewsEvent,
  ScheduledImpact,
  Sector,
} from '../types/game';
import { createRng, Rng, scheduleImpact, applySectorSentiment } from './market';

let eventIdCounter = 0;
function nextId(): string {
  eventIdCounter += 1;
  return `evt-${eventIdCounter}-${Date.now()}`;
}

interface EventTemplate {
  id: string;
  title: string;
  body: string;
  affectedTickers: string[];
  affectedSectors: Sector[];
  impactDirection: ImpactDirection;
  impactStrength: number;
  delayMinutes: number;
  credibility: number;
  ethicalRisk: number;
  legalRisk: number;
  duration: number;
  source: string;
}

const EVENT_POOL: EventTemplate[] = [
  {
    id: 'earnings-rumor',
    title: 'NovaDyne 财报传闻：机器人终于会道歉了',
    body: '匿名分析师声称季度营收将超预期，但拒绝解释“道歉功能”如何 monetize。',
    affectedTickers: ['NOVA'],
    affectedSectors: ['robotics'],
    impactDirection: 'up',
    impactStrength: 0.35,
    delayMinutes: 8,
    credibility: 0.55,
    ethicalRisk: 5,
    legalRisk: 8,
    duration: 45,
    source: 'BeastWire',
  },
  {
    id: 'reg-probe',
    title: '监管机构表示市场一切正常，市场因此开始恐慌',
    body: 'Kestrel 监管局发布通稿称“未发现系统性风险”，交易员集体解读为“大的要来了”。',
    affectedTickers: [],
    affectedSectors: [],
    impactDirection: 'down',
    impactStrength: 0.4,
    delayMinutes: 3,
    credibility: 0.7,
    ethicalRisk: 0,
    legalRisk: 25,
    duration: 60,
    source: '合规快讯',
  },
  {
    id: 'ceo-scandal',
    title: 'GlumMart CEO 被拍到在奢侈品店使用员工折扣',
    body: '公司发言人称这是“极限廉价战略的田野调查”，股东不买账。',
    affectedTickers: ['GLUM', 'LUXE'],
    affectedSectors: ['retail', 'fashion'],
    impactDirection: 'down',
    impactStrength: 0.3,
    delayMinutes: 5,
    credibility: 0.65,
    ethicalRisk: 10,
    legalRisk: 12,
    duration: 40,
    source: '八卦终端',
  },
  {
    id: 'product-launch',
    title: 'Zenith BioLabs 宣布新药“让你更焦虑但更专注”',
    body: '临床试验显示受试者交易频率提升 300%，副作用包括对着 K 线自言自语。',
    affectedTickers: ['ZENX'],
    affectedSectors: ['biotech'],
    impactDirection: 'up',
    impactStrength: 0.45,
    delayMinutes: 6,
    credibility: 0.6,
    ethicalRisk: 15,
    legalRisk: 5,
    duration: 50,
    source: '医药观察',
  },
  {
    id: 'supply-chain',
    title: 'CoilGrid 供应链断裂：电缆被仓鼠啃了',
    body: '公司承诺引入“无仓鼠认证”供应商，预计下个季度，或者下下个季度。',
    affectedTickers: ['COIL'],
    affectedSectors: ['energy'],
    impactDirection: 'down',
    impactStrength: 0.38,
    delayMinutes: 10,
    credibility: 0.72,
    ethicalRisk: 0,
    legalRisk: 3,
    duration: 55,
    source: '产业脉动',
  },
  {
    id: 'war-geo',
    title: '虚构岛国宣布对虚拟海峡实施“数字封锁”',
    body: '物流与能源板块承压，分析师建议 calm down，但没人 listen。',
    affectedTickers: ['CRAB', 'COIL', 'DUST'],
    affectedSectors: ['logistics', 'energy', 'mining'],
    impactDirection: 'down',
    impactStrength: 0.42,
    delayMinutes: 4,
    credibility: 0.5,
    ethicalRisk: 0,
    legalRisk: 5,
    duration: 70,
    source: '地缘雷达',
  },
  {
    id: 'rate-hike',
    title: '央行暗示利率“可能也许大概会升一点点”',
    body: '市场瞬间 pricing in 十次加息，然后又 pricing out，反复横跳。',
    affectedTickers: [],
    affectedSectors: [],
    impactDirection: 'mixed',
    impactStrength: 0.25,
    delayMinutes: 2,
    credibility: 0.8,
    ethicalRisk: 0,
    legalRisk: 0,
    duration: 35,
    source: '宏观钟',
  },
  {
    id: 'social-mania',
    title: '#买入NOVA 登上虚构社交平台热搜',
    body: 'Retail Swarm 正在涌入，公司官方账号只发了一条：“？”',
    affectedTickers: ['NOVA', 'BYTE'],
    affectedSectors: ['robotics', 'security'],
    impactDirection: 'up',
    impactStrength: 0.5,
    delayMinutes: 1,
    credibility: 0.35,
    ethicalRisk: 8,
    legalRisk: 10,
    duration: 30,
    source: 'TrendBeast',
  },
  {
    id: 'short-report',
    title: 'Short Vulture 发布报告：OmniCloud 是“云朵形状的 PPT”',
    body: '报告长达 400 页，其中 399 页是字体样本，结论：目标价 $1。',
    affectedTickers: ['OMNI'],
    affectedSectors: ['cloud'],
    impactDirection: 'down',
    impactStrength: 0.48,
    delayMinutes: 7,
    credibility: 0.45,
    ethicalRisk: 5,
    legalRisk: 15,
    duration: 65,
    source: 'Vulture Research',
  },
  {
    id: 'big-order',
    title: '神秘大客户据称下单 10 万台 MudFoods 代餐',
    body: '公司拒绝透露客户身份，业界猜测可能是某对冲基金老板的午餐计划。',
    affectedTickers: ['MUD'],
    affectedSectors: ['food'],
    impactDirection: 'up',
    impactStrength: 0.4,
    delayMinutes: 12,
    credibility: 0.4,
    ethicalRisk: 12,
    legalRisk: 8,
    duration: 40,
    source: '订单流言',
  },
  {
    id: 'leak',
    title: '员工泄密：FizzPop 下一季综艺叫《亏损大逃脱》',
    body: '节目组澄清这不是财报预告，但股价已经动了。',
    affectedTickers: ['FIZZ'],
    affectedSectors: ['media'],
    impactDirection: 'up',
    impactStrength: 0.28,
    delayMinutes: 9,
    credibility: 0.5,
    ethicalRisk: 20,
    legalRisk: 22,
    duration: 45,
    source: '内部小道',
  },
  {
    id: 'manipulation-hint',
    title: '灰色机会：有人暗示你可以在论坛上“表达乐观情绪”',
    body: '【纯属虚构】匿名账号私信你，称“懂的都懂”。这明显是陷阱还是陷阱的陷阱？',
    affectedTickers: [],
    affectedSectors: [],
    impactDirection: 'mixed',
    impactStrength: 0.1,
    delayMinutes: 0,
    credibility: 0.2,
    ethicalRisk: 40,
    legalRisk: 35,
    duration: 20,
    source: '???',
  },
  {
    id: 'boss-hint',
    title: '老板暗示：客户很喜欢某只“低调”的股票',
    body: 'Victor 总发来语音：“别问我买哪只，问我客户喜欢哪只。”',
    affectedTickers: ['HALO'],
    affectedSectors: ['medical'],
    impactDirection: 'up',
    impactStrength: 0.2,
    delayMinutes: 0,
    credibility: 0.55,
    ethicalRisk: 18,
    legalRisk: 12,
    duration: 90,
    source: 'Victor K.',
  },
  {
    id: 'client-redeem',
    title: '客户威胁赎回：除非今天账户回到水上',
    body: '大客户 “Silent Zhang” 表示耐心只剩收盘前 47 分钟。',
    affectedTickers: [],
    affectedSectors: [],
    impactDirection: 'down',
    impactStrength: 0.15,
    delayMinutes: 0,
    credibility: 0.85,
    ethicalRisk: 5,
    legalRisk: 5,
    duration: 120,
    source: '客户部',
  },
  {
    id: 'rival-blowup',
    title: '竞争对手基金爆仓，市场短暂狂欢',
    body: 'RivalPeak Capital 的清盘拍卖让流动性突然泛滥，然后又突然消失。',
    affectedTickers: [],
    affectedSectors: [],
    impactDirection: 'mixed',
    impactStrength: 0.3,
    delayMinutes: 3,
    credibility: 0.75,
    ethicalRisk: 0,
    legalRisk: 0,
    duration: 25,
    source: '机构八卦',
  },
  {
    id: 'nova-coffee',
    title: 'NovaDyne 机器人在发布会上成功倒咖啡，随后辞退了咖啡机',
    body: 'HR 称咖啡机“未能适应敏捷文化”，股价因“效率”上涨。',
    affectedTickers: ['NOVA'],
    affectedSectors: ['robotics'],
    impactDirection: 'up',
    impactStrength: 0.32,
    delayMinutes: 5,
    credibility: 0.68,
    ethicalRisk: 0,
    legalRisk: 0,
    duration: 35,
    source: 'BeastWire',
  },
  {
    id: 'glum-cheap',
    title: 'GlumMart 宣布“极限廉价战略”，供应商集体沉默',
    body: '据称标价将低于成本，股东称之为“颠覆”，供应商称之为“抢劫”。',
    affectedTickers: ['GLUM', 'MUD'],
    affectedSectors: ['retail', 'food'],
    impactDirection: 'mixed',
    impactStrength: 0.35,
    delayMinutes: 6,
    credibility: 0.62,
    ethicalRisk: 5,
    legalRisk: 4,
    duration: 50,
    source: '零售观察',
  },
  {
    id: 'byte-breach',
    title: 'ByteBunker 阻止了 99 次黑客攻击，第 100 次正在直播',
    body: '公司股价先跌后涨，因为分析师认为“曝光度也是增长”。',
    affectedTickers: ['BYTE'],
    affectedSectors: ['security'],
    impactDirection: 'mixed',
    impactStrength: 0.38,
    delayMinutes: 4,
    credibility: 0.58,
    ethicalRisk: 0,
    legalRisk: 8,
    duration: 40,
    source: '安全邮报',
  },
  {
    id: 'dust-strike',
    title: 'DustBridge 矿区罢工，工人要求“分一点空头利润”',
    body: '管理层提议用期权代替工资，工人提议用管理层代替矿镐。',
    affectedTickers: ['DUST'],
    affectedSectors: ['mining'],
    impactDirection: 'down',
    impactStrength: 0.36,
    delayMinutes: 8,
    credibility: 0.7,
    ethicalRisk: 0,
    legalRisk: 2,
    duration: 55,
    source: '矿业电报',
  },
  {
    id: 'luxe-collab',
    title: 'LuxeLoop 与 GlumMart 推出联名款“廉价奢华”',
    body: '时尚评论家称这是 oxymoron，股民称这是 momentum。',
    affectedTickers: ['LUXE', 'GLUM'],
    affectedSectors: ['fashion', 'retail'],
    impactDirection: 'up',
    impactStrength: 0.25,
    delayMinutes: 7,
    credibility: 0.55,
    ethicalRisk: 0,
    legalRisk: 0,
    duration: 35,
    source: '潮流终端',
  },
  {
    id: 'crab-delay',
    title: 'CrabPort 港口拥堵：螃蟹物流不是开玩笑',
    body: '全球供应链再次证明，当你以为已经够糟时，它还能更糟。',
    affectedTickers: ['CRAB'],
    affectedSectors: ['logistics'],
    impactDirection: 'down',
    impactStrength: 0.3,
    delayMinutes: 6,
    credibility: 0.78,
    ethicalRisk: 0,
    legalRisk: 0,
    duration: 45,
    source: '物流广播',
  },
  {
    id: 'halo-recall',
    title: 'HaloMed 召回一批血压计，原因是读数总显示“买入”',
    body: '公司称这是 firmware bug，交易员称这是 feature。',
    affectedTickers: ['HALO'],
    affectedSectors: ['medical'],
    impactDirection: 'down',
    impactStrength: 0.33,
    delayMinutes: 5,
    credibility: 0.8,
    ethicalRisk: 5,
    legalRisk: 10,
    duration: 50,
    source: '医疗快讯',
  },
  {
    id: 'whale-rumor',
    title: 'The Whale 据称建仓某云股，消息来源是它自己',
    body: '超大单影子掠过盘口，OmniCloud 一分钟内上下 4%。',
    affectedTickers: ['OMNI'],
    affectedSectors: ['cloud'],
    impactDirection: 'up',
    impactStrength: 0.42,
    delayMinutes: 2,
    credibility: 0.38,
    ethicalRisk: 0,
    legalRisk: 0,
    duration: 20,
    source: '盘口传说',
  },
  {
    id: 'analyst-tip',
    title: '灰色机会：分析师私信你一份“还没公开”的报告摘要',
    body: '【纯属虚构剧情】你可以选择相信、忽略或举报。现实里请遵守法律。',
    affectedTickers: ['ZENX'],
    affectedSectors: ['biotech'],
    impactDirection: 'up',
    impactStrength: 0.15,
    delayMinutes: 0,
    credibility: 0.3,
    ethicalRisk: 45,
    legalRisk: 40,
    duration: 60,
    source: '匿名分析师',
  },
  {
    id: 'compliance-watch',
    title: '合规部邮件：我们注意到你的交易“很有性格”',
    body: '请说明今日异常波动的原因，模板回复已附在 Office 面板。',
    affectedTickers: [],
    affectedSectors: [],
    impactDirection: 'down',
    impactStrength: 0.1,
    delayMinutes: 0,
    credibility: 0.95,
    ethicalRisk: 0,
    legalRisk: 30,
    duration: 100,
    source: '合规部',
  },
  {
    id: 'fizz-viral',
    title: 'FizzPop 综艺 clip 病毒传播，广告商排队退订又排队订购',
    body: '舆论两极化，但流量是真实的——大概吧。',
    affectedTickers: ['FIZZ'],
    affectedSectors: ['media'],
    impactDirection: 'up',
    impactStrength: 0.44,
    delayMinutes: 3,
    credibility: 0.52,
    ethicalRisk: 3,
    legalRisk: 2,
    duration: 35,
    source: '娱乐Buzz',
  },
  {
    id: 'omni-ai',
    title: 'OmniCloud 发布 AI 产品 CloudGPT-∞',
    body: '演示环节 AI 自己买了公司股票，合规部正在写新的免责声明。',
    affectedTickers: ['OMNI', 'BYTE'],
    affectedSectors: ['cloud', 'security'],
    impactDirection: 'up',
    impactStrength: 0.46,
    delayMinutes: 5,
    credibility: 0.6,
    ethicalRisk: 8,
    legalRisk: 6,
    duration: 55,
    source: '科技前哨',
  },
  {
    id: 'mud-expansion',
    title: 'MudFoods 进军高端市场：推出“泥土风味”限量版',
    body: '品鉴会评价：难忘。至于难忘的是好还是坏，没有共识。',
    affectedTickers: ['MUD'],
    affectedSectors: ['food'],
    impactDirection: 'up',
    impactStrength: 0.22,
    delayMinutes: 9,
    credibility: 0.48,
    ethicalRisk: 0,
    legalRisk: 0,
    duration: 30,
    source: '食品周刊',
  },
  {
    id: 'market-mania',
    title: '市场进入狂热模式：一切看起来都像会涨',
    body: 'Retail Swarm 正在扫货，理性暂时休假。',
    affectedTickers: [],
    affectedSectors: [],
    impactDirection: 'up',
    impactStrength: 0.35,
    delayMinutes: 1,
    credibility: 0.5,
    ethicalRisk: 5,
    legalRisk: 5,
    duration: 40,
    source: '市场情绪',
  },
  {
    id: 'crash-warning',
    title: '闪崩预警：算法检测到“太多人同时乐观”',
    body: '系统提示：当每个人都觉得自己聪明时，通常意味着相反。',
    affectedTickers: [],
    affectedSectors: [],
    impactDirection: 'down',
    impactStrength: 0.55,
    delayMinutes: 2,
    credibility: 0.55,
    ethicalRisk: 0,
    legalRisk: 0,
    duration: 25,
    source: '风险雷达',
  },
];

const SPECIAL_EVENTS: Record<string, EventTemplate> = {
  day1_welcome: {
    id: 'day1_welcome',
    title: '入职第一天：欢迎来到资本市场',
    body: '这里没有对错，只有季度报表。你的工位在第 47 排，风景是隔壁同事的显示器。',
    affectedTickers: [],
    affectedSectors: [],
    impactDirection: 'mixed',
    impactStrength: 0.05,
    delayMinutes: 0,
    credibility: 1,
    ethicalRisk: 0,
    legalRisk: 0,
    duration: 120,
    source: 'Victor K.',
  },
  day4_crisis: {
    id: 'day4_crisis',
    title: '市场危机：指数期货闪跌',
    body: '别慌，慌的是客户。你的任务是别成为下一个头条。',
    affectedTickers: [],
    affectedSectors: [],
    impactDirection: 'down',
    impactStrength: 0.6,
    delayMinutes: 1,
    credibility: 0.9,
    ethicalRisk: 0,
    legalRisk: 5,
    duration: 80,
    source: '交易大厅',
  },
  day5_short_unlock: {
    id: 'day5_short_unlock',
    title: '系统通知：做空功能已解锁',
    body: '恭喜，你现在可以押注下跌了。老板说你“终于像交易员了”。',
    affectedTickers: [],
    affectedSectors: [],
    impactDirection: 'mixed',
    impactStrength: 0,
    delayMinutes: 0,
    credibility: 1,
    ethicalRisk: 10,
    legalRisk: 5,
    duration: 60,
    source: '系统',
  },
  day7_mania: {
    id: 'day7_mania',
    title: '市场狂热日：新闻刷屏模式',
    body: 'Retail Swarm 正在涌入，保持冷静——或者假装冷静。',
    affectedTickers: [],
    affectedSectors: [],
    impactDirection: 'up',
    impactStrength: 0.5,
    delayMinutes: 0,
    credibility: 0.7,
    ethicalRisk: 5,
    legalRisk: 5,
    duration: 90,
    source: '市场钟',
  },
  day8_redemption: {
    id: 'day8_redemption',
    title: '客户赎回危机',
    body: 'Silent Zhang Threatens 赎回 unless portfolio recovers. 老板看着你。',
    affectedTickers: [],
    affectedSectors: [],
    impactDirection: 'down',
    impactStrength: 0.2,
    delayMinutes: 0,
    credibility: 0.9,
    ethicalRisk: 5,
    legalRisk: 8,
    duration: 120,
    source: '客户部',
  },
  day9_investigation: {
    id: 'day9_investigation',
    title: '监管调查：异常交易模式',
    body: 'Regulator 影子笼罩办公室，合规热表正在上升。',
    affectedTickers: [],
    affectedSectors: [],
    impactDirection: 'down',
    impactStrength: 0.25,
    delayMinutes: 0,
    credibility: 0.95,
    ethicalRisk: 0,
    legalRisk: 50,
    duration: 120,
    source: 'Kestrel 监管局',
  },
  day10_final: {
    id: 'day10_final',
    title: '最终考核日',
    body: '10 天的煎熬 culminates today. Victor 总： “让我看看你是不是野兽，还是猎物。”',
    affectedTickers: [],
    affectedSectors: [],
    impactDirection: 'mixed',
    impactStrength: 0.15,
    delayMinutes: 0,
    credibility: 1,
    ethicalRisk: 0,
    legalRisk: 10,
    duration: 120,
    source: 'Victor K.',
  },
};

export function templateToNews(
  tpl: EventTemplate,
  gameMinute: number,
  applied = false
): NewsEvent {
  return {
    id: nextId(),
    title: tpl.title,
    body: tpl.body,
    affectedTickers: tpl.affectedTickers,
    affectedSectors: tpl.affectedSectors,
    impactDirection: tpl.impactDirection,
    impactStrength: tpl.impactStrength,
    delayMinutes: tpl.delayMinutes,
    credibility: tpl.credibility,
    ethicalRisk: tpl.ethicalRisk,
    legalRisk: tpl.legalRisk,
    duration: tpl.duration,
    timestamp: formatTimestamp(gameMinute),
    gameMinute,
    source: tpl.source,
    applied,
  };
}

function formatTimestamp(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
}

function pickRandom<T>(arr: T[], rng: Rng, count: number): T[] {
  const copy = [...arr];
  const result: T[] = [];
  for (let i = 0; i < count && copy.length > 0; i++) {
    const idx = Math.floor(rng.next() * copy.length);
    result.push(copy.splice(idx, 1)[0]);
  }
  return result;
}

export function generateDayEvents(dayConfig: DayConfig, seed: number, startMinute: number): NewsEvent[] {
  const rng = createRng(seed + dayConfig.day * 997);
  const count = dayConfig.newsCount;
  const picked = pickRandom(EVENT_POOL, rng, count);
  const events = picked.map((tpl, i) =>
    templateToNews(tpl, startMinute + i * 2, false)
  );
  const special = SPECIAL_EVENTS[dayConfig.specialEventId];
  if (special) {
    events.unshift(templateToNews(special, startMinute, false));
  }
  return events;
}

export function maybeIntradayEvent(
  existing: NewsEvent[],
  seed: number,
  minute: number,
  regime: string
): NewsEvent | null {
  const rng = createRng(seed + minute);
  const chance = regime === 'mania' ? 0.08 : 0.025;
  if (rng.next() > chance) return null;
  const tpl = EVENT_POOL[Math.floor(rng.next() * EVENT_POOL.length)];
  if (existing.some((e) => e.title === tpl.title)) return null;
  return templateToNews(tpl, minute, false);
}

export function applyNewsToMarket(
  market: MarketState,
  news: NewsEvent
): MarketState {
  const impact: ScheduledImpact = {
    id: news.id,
    tickers: news.affectedTickers,
    sectors: news.affectedSectors,
    strength: news.impactStrength * news.credibility,
    direction: news.impactDirection,
    startMinute: market.minutes + news.delayMinutes,
    halfLife: Math.max(news.duration / 3, 8),
    remainingStrength: news.impactStrength * news.credibility,
  };
  let state = scheduleImpact(market, impact);
  for (const sector of news.affectedSectors) {
    const delta =
      news.impactDirection === 'up'
        ? 0.08 * news.impactStrength
        : news.impactDirection === 'down'
          ? -0.08 * news.impactStrength
          : 0;
    state = applySectorSentiment(state, sector, delta);
  }
  return state;
}

export function processPendingNews(
  market: MarketState,
  newsFeed: NewsEvent[]
): { market: MarketState; newsFeed: NewsEvent[] } {
  let nextMarket = market;
  const nextFeed = newsFeed.map((n) => {
    if (n.applied) return n;
    if (market.minutes >= n.gameMinute + n.delayMinutes) {
      nextMarket = applyNewsToMarket(nextMarket, n);
      return { ...n, applied: true };
    }
    return n;
  });
  return { market: nextMarket, newsFeed: nextFeed };
}

export const ETHICAL_CHOICE_POOL: EthicalChoice[] = [
  {
    id: 'analyst-leak',
    prompt:
      '【虚构剧情】某分析师私信你一份“还没公开”的报告摘要。现实里请遵守证券法规。你怎么做？',
    resolved: false,
    options: [
      {
        label: '相信并加仓相关股票',
        effects: { complianceHeat: 15, reputation: -8, bossSatisfaction: 8 },
      },
      {
        label: '忽略，靠自己判断',
        effects: { reputation: 3, stress: -2 },
      },
      {
        label: '向合规部举报',
        effects: { complianceHeat: -10, reputation: 10, bossSatisfaction: -5, careerScore: 5 },
      },
    ],
  },
  {
    id: 'boss-media',
    prompt: '【虚构剧情】老板暗示你可以在社交媒体上“表达模糊乐观”。',
    resolved: false,
    options: [
      {
        label: '照做，发一条暧昧的帖子',
        effects: { bossSatisfaction: 12, complianceHeat: 18, reputation: -5, clientTrust: 5 },
      },
      {
        label: '拒绝，专注交易',
        effects: { bossSatisfaction: -8, reputation: 8, complianceHeat: -5, careerScore: 3 },
      },
      {
        label: '发一条讽刺段子糊弄过去',
        effects: { bossSatisfaction: 2, reputation: 5, stress: 5 },
      },
    ],
  },
  {
    id: 'hide-risk',
    prompt: '【虚构剧情】客户要求你把高风险头寸“藏”在组合角落里汇报。',
    resolved: false,
    options: [
      {
        label: '答应客户',
        effects: { clientTrust: 15, complianceHeat: 20, bossSatisfaction: 5 },
      },
      {
        label: '如实汇报',
        effects: { clientTrust: -10, reputation: 12, complianceHeat: -8, careerScore: 8 },
      },
      {
        label: '告诉老板让客户滚',
        effects: { bossSatisfaction: 10, clientTrust: -20, reputation: -3, stress: 10 },
      },
    ],
  },
];

export function getDailyEthicalChoice(day: number, seed: number): EthicalChoice | null {
  const rng = createRng(seed + day);
  if (day < 3 || rng.next() > 0.55) return null;
  const pick = ETHICAL_CHOICE_POOL[Math.floor(rng.next() * ETHICAL_CHOICE_POOL.length)];
  return { ...pick, id: `${pick.id}-d${day}`, resolved: false };
}

export function createComplianceEmail(minute: number, heat: number): import('../types/game').ComplianceEmail {
  const subjects =
    heat > 60
      ? ['紧急：请解释今日异常交易', '关于你的账户：我们需要谈谈']
      : ['例行合规提醒', '交易员行为准则（再次）'];
  return {
    id: nextId(),
    from: '合规部 <compliance@beastcapital.fake>',
    subject: subjects[Math.floor(Math.random() * subjects.length)],
    body:
      heat > 60
        ? '我们注意到您的交易频率与规模异常。请于今日收盘前提交说明。'
        : '请继续遵守公司交易政策。记住：没有“只是试试”的交易。',
    minute,
    read: false,
  };
}
