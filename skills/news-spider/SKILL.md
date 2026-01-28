---
name: news-spider
description: 轻量级新闻爬虫，抓取 Crypto/政治/经济热点，为 Clawdbot 提供 Polymarket 交易信号输入源
---

# News Spider Skill

轻量快速的新闻爬虫，通过 RSS 抓取热门资讯，分析情绪，为 Polymarket 交易决策提供信息输入。

## 功能

1. **热点话题抓取** - 从 Google News RSS 获取实时热词
2. **新闻聚合** - 抓取 Crypto/财经/政治多源新闻
3. **情绪分析** - 基于关键词的简单情绪评分

## 使用方式

### 作为模块导入

```javascript
const spider = require("./skills/news-spider");

// 获取热点话题
const topics = await spider.getHotTopics();
// => ['Bitcoin', 'Trump', 'ETF', ...]

// 抓取新闻
const news = await spider.fetchNews();
// => [{ source, title, link, pubDate }, ...]

// 分析情绪
const sentiment = spider.analyzeSentiment(news);
// => { score: 5, details: [...], newsCount: 30 }

// 一键获取完整报告
const report = await spider.getReport();
// => { topics, news, sentiment, timestamp }
```

### 直接运行

```bash
node skills/news-spider/index.js
```

输出示例:

```
🕷️ News Spider v1.0
📰 热点: Bitcoin, Trump, ETF, Crypto, Market
📊 情绪评分: +3 (看涨)
📋 Top 新闻:
  [+2] Bitcoin ETF approval sparks rally (CoinDesk)
  [-1] SEC crackdown on exchanges (Cointelegraph)
```

## 新闻源

| 来源             | 类型 | 更新频率 |
| ---------------- | ---- | -------- |
| Google News      | RSS  | 实时     |
| CoinDesk         | RSS  | ~10分钟  |
| Cointelegraph    | RSS  | ~10分钟  |
| Decrypt          | RSS  | ~15分钟  |
| Reuters Business | RSS  | ~5分钟   |

## 情绪词典

### 看涨关键词 (+1)

`surge`, `soar`, `record`, `high`, `rally`, `approval`, `etf`, `bull`, `gain`, `breakthrough`, `win`, `victory`

### 看跌关键词 (-1)

`drop`, `plunge`, `crash`, `low`, `dump`, `ban`, `crackdown`, `hack`, `loss`, `fail`, `defeat`

## 配置

在 `.env` 中可配置:

```env
NEWS_TIMEOUT=5000        # 请求超时 (毫秒)
NEWS_LIMIT=10            # 每个源抓取数量
NEWS_SOURCES=google,coindesk,cointelegraph,decrypt,reuters
```

## 输出格式

返回给 Clawdbot 的标准格式:

```json
{
  "timestamp": "2026-01-28T19:20:00Z",
  "topics": ["Bitcoin", "Trump", "ETF"],
  "sentiment": {
    "score": 3,
    "signal": "bullish",
    "confidence": 0.7
  },
  "headlines": [{ "score": 2, "title": "...", "source": "CoinDesk" }]
}
```
