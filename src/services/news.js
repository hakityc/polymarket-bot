// src/services/news.js - 新闻爬虫服务
const axios = require('axios');
const { parseStringPromise } = require('xml2js');
const logger = require('../utils/logger');
const config = require('../config');

// 新闻源
const SOURCES = [
    { name: 'CoinDesk', url: 'https://www.coindesk.com/arc/outboundfeeds/rss/', type: 'rss' },
    { name: 'Cointelegraph', url: 'https://cointelegraph.com/rss', type: 'rss' },
    { name: 'TheBlock', url: 'https://www.theblock.co/rss.xml', type: 'rss' },
];

// 情绪关键词
const SENTIMENT = {
    bullish: ['surge', 'soar', 'record', 'high', 'jump', 'gain', 'rally', 'approval', 'etf', 'buy', 'bull', 'breakthrough'],
    bearish: ['drop', 'plunge', 'crash', 'low', 'loss', 'dump', 'ban', 'crackdown', 'suit', 'sec', 'bear', 'fall', 'hack'],
};

/**
 * 从 Google News 获取特定关键词的新闻
 */
async function fetchGoogleNews(query) {
    try {
        const encodedQuery = encodeURIComponent(query);
        const rssUrl = `https://news.google.com/rss/search?q=${encodedQuery}&hl=en-US&gl=US&ceid=US:en`;
        const res = await axios.get(rssUrl, { timeout: 5000 });
        const result = await parseStringPromise(res.data);
        const items = result.rss.channel[0].item || [];

        return items.slice(0, 5).map(item => ({
            source: 'Google News',
            title: item.title[0],
            link: item.link[0],
            pubDate: item.pubDate ? item.pubDate[0] : new Date().toISOString(),
        }));
    } catch (e) {
        logger.warn(`获取 Google News (${query}) 失败: ${e.message}`);
        return [];
    }
}

/**
 * 抓取所有新闻源 (RSS + 关键词搜索)
 */
async function fetchNews() {
    logger.info('开始抓取全方位新闻...');
    const allNews = [];

    // 1. 抓取固定 RSS 源
    for (const source of SOURCES) {
        try {
            const response = await axios.get(source.url, { timeout: 5000 });
            const result = await parseStringPromise(response.data);
            const items = result.rss.channel[0].item.slice(0, config.scan.newsLimit);

            items.forEach(item => {
                allNews.push({
                    source: source.name,
                    title: item.title[0],
                    link: item.link[0],
                    pubDate: item.pubDate ? item.pubDate[0] : new Date().toISOString(),
                });
            });
        } catch (error) {
            logger.warn(`抓取 ${source.name} 失败: ${error.message}`);
        }
    }

    // 2. 抓取关注关键词的新闻 (Google News)
    for (const keyword of config.scan.keywords) {
        const keywordNews = await fetchGoogleNews(keyword);
        allNews.push(...keywordNews);
    }

    logger.info(`共抓取 ${allNews.length} 条多维新闻`);
    return allNews;
}

/**
 * 从 Google News 获取当前最热话题
 */
async function getHotTopics() {
    try {
        // 使用我们的核心关键词作为基准搜索
        const query = config.scan.keywords.join(' OR ');
        const news = await fetchGoogleNews(query);
        
        const keywords = [];
        news.forEach(item => {
            const title = item.title;
            const words = title.split(' ').filter(w => w.length > 4 && !config.scan.keywords.includes(w));
            keywords.push(...words);
        });

        return [...new Set(keywords)];
    } catch (e) {
        logger.warn(`获取热点话题失败: ${e.message}`);
        return config.scan.keywords;
    }
}

/**
 * 分析新闻情绪
 */
function analyzeSentiment(newsList) {
    let score = 0;
    const details = [];

    newsList.forEach(news => {
        const title = news.title.toLowerCase();
        let itemScore = 0;

        SENTIMENT.bullish.forEach(word => {
            if (title.includes(word)) itemScore += 1;
        });
        SENTIMENT.bearish.forEach(word => {
            if (title.includes(word)) itemScore -= 1;
        });

        if (itemScore !== 0) {
            score += itemScore;
            details.push({ score: itemScore, title: news.title, source: news.source });
        }
    });

    return { score, details, newsCount: newsList.length };
}

module.exports = {
    fetchNews,
    getHotTopics,
    analyzeSentiment,
};
