# Market Beast / 市场野兽

原创交易员讽刺模拟网页游戏。你是一名刚入职 **Beast Capital** 的交易员，在虚构市场中应对老板 KPI、新闻冲击、合规压力与客户赎回——一切纯属娱乐，**不构成任何真实投资建议**。

## 快速开始

```bash
npm install
npm run dev
```

浏览器打开终端提示的本地地址（通常为 `http://localhost:5173`）。

生产构建：

```bash
npm run build
npm run preview
```

## 玩法概要

- **交易日**：盘前简报 → 09:00–16:00 交易（可 1x / 2x / 5x 加速）→ 收盘报告
- **12 支虚构股票**：NOVA、GLUM、ZENX、COIL、FIZZ、DUST、OMNI、CRAB、HALO、BYTE、LUXE、MUD
- **交易**：买入、卖出、做空（第 5 日解锁）、平仓；含手续费、滑点、保证金与强平
- **新闻**：右侧滚动终端，消息延迟影响价格；注意可信度与合规标签
- **职场**：老板满意度、合规压力、声誉、压力、客户信任、职业分
- **Campaign**：10 个工作日，每日不同市场 regime 与老板目标
- **结局**：6 种终局演出（华尔街新王、疯狂赌徒、合规模范、替罪羊、破产、神秘天才等）

## 操作

| 区域 | 功能 |
|------|------|
| 左侧 | 股票列表与涨跌幅 |
| 中间 | 走势 SVG、数量输入、快捷下单 |
| 右侧 | 新闻流、老板/合规、灰色剧情选择 |
| 底部 | 组合、现金、总资产、今日目标 |
| 顶部 | 时钟、市场状态、暂停、速度、声音 |

存档键：`localStorage` → `market-beast-save-v1`。标题屏支持新游戏 / 继续 / 重置。收盘报告可 **导出 JSON**。

## 音频

使用 **Web Audio API 程序化生成** BGM 与音效（无外部音频文件）。首次需点击 **「启用声音」** 以符合浏览器自动播放策略。

## 美术

默认 **CSS / SVG 程序化终端风**（扫描线、玻璃拟态、霓虹涨跌色）。可选 AI 美术提示词见 [`docs/asset_prompts.md`](docs/asset_prompts.md)。

## 项目结构

```
src/
  main.tsx
  App.tsx                 # 游戏循环、存档、阶段
  styles.css
  types/game.ts           # TypeScript 类型
  game/
    market.ts             # 市场模拟
    events.ts               # 新闻与事件
    player.ts               # 交易与组合
    audio.ts                # 音频
    campaign.ts             # 10 日 campaign 与结局
    save.ts                 # localStorage
    state.ts                # 新局/换日
  components/
    TradingDesk.tsx
    NewsFeed.tsx
    PortfolioPanel.tsx
    OfficePanel.tsx
    EndOfDayReport.tsx
    ...
```

## 免责声明

- 所有公司、指数、人物与新闻均为 **虚构**
- 未使用真实股票代码、行情 API 或真实金融数据
- 灰色剧情选项仅为 **游戏讽刺机制**，不提供现实违法操作指南
- 与《The Invisible Hand》及任何商业游戏 **无关联**，未复制其名称、剧情、UI、美术或音频

## 许可证

见仓库根目录 [LICENSE](LICENSE)。
