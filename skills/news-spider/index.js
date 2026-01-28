/**
 * News Spider Skill
 * 轻量级新闻爬虫，为 Polymarket 交易提供信息输入
 */

const https = require('https');
const { parseStringPromise } = require('xml2js');

// 配置
const CONFIG = {
    timeout: parseInt(process.env.NEWS_TIMEOUT) || 5000,
    limit: parseInt(process.env.NEWS_LIMIT) || 10,
};

// 新闻源 (使用 RSS，轻量快速)
const SOURCES = [
    { id: 'google', name: 'Google News', url: 'https://news.google.com/rss/search?q=crypto+OR+bitcoin+OR+polymarket&hl=en-US&gl=US&ceid=US:en' },
    { id: 'coindesk', name: 'CoinDesk', url: 'https://www.coindesk.com/arc/outboundfeeds/rss/' },
    { id: 'cointelegraph', name: 'Cointelegraph', url: 'https://cointelegraph.com/rss' },
    { id: 'decrypt', name: 'Decrypt', url: 'https://decrypt.co/feed' },
    { id: 'reuters', name: 'Reuters', url: 'https://www.reutersagency.com/feed/?best-topics=business-finance&post_type=best' },
];

// 情绪词典
const SENTIMENT = {
    bullish: ['surge', 'soar', 'record', 'high', 'rally', 'approval', 'etf', 'bull', 'gain', 'breakthrough', 'win', 'victory', 'pump', 'moon'],
    bearish: ['drop', 'plunge', 'crash', 'low', 'dump', 'ban', 'crackdown', 'hack', 'loss', 'fail', 'defeat', 'sec', 'lawsuit', 'fraud'],
};

/**
 * 轻量 HTTP 请求 (不依赖 axios)
 */
function fetch(url) {
    return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error('Timeout')), CONFIG.timeout);
        
        https.get(url, { headers: { 'User-Agent': 'NewsSpider/1.0' } }, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                clearTimeout(timeout);
                resolve(data);
            });
        }).on('error', (e) => {
            clearTimeout(timeout);
            reject(e);
        });
    });
}

/**
 * 获取热点话题
 */
async function getHotTopics() {
    try {
        const xml = await fetch(SOURCES[0].url); // Google News
        const result = await parseStringPromise(xml);
        const items = result.rss.channel[0].item.slice(0, 15);
        
        const words = [];
        items.forEach(item => {
            const title = item.title[0];
            // 提取有意义的词 (>4字符，非常见词)
            const meaningful = title.split(/\s+/).filter(w => 
                w.length > 4 && !/^(about|their|would|could|should|after|before|during)$/i.test(w)
            );
            words.push(...meaningful);
        });
        
        // 统计词频并返回 Top 10
        const freq = {};
        words.forEach(w => freq[w] = (freq[w] || 0) + 1);
        return Object.entries(freq)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10)
            .map(e => e[0]);
    } catch (e) {
        return ['Bitcoin', 'Crypto', 'Trump', 'Market'];
    }
}

/**
 * 抓取所有新闻源
 */
async function fetchNews(sourceIds = null) {
    const sources = sourceIds 
        ? SOURCES.filter(s => sourceIds.includes(s.id))
        : SOURCES;
    
    const results = await Promise.allSettled(
        sources.map(async (source) => {
            try {
                const xml = await fetch(source.url);
                const result = await parseStringPromise(xml);
                const items = result.rss.channel[0].item.slice(0, CONFIG.limit);
                
                return items.map(item => ({
                    source: source.name,
                    title: item.title[0].replace(/<[^>]*>/g, ''), // 清理 HTML
                    link: item.link[0],
                    pubDate: item.pubDate?.[0] || new Date().toISOString(),
                }));
            } catch {
                return [];
            }
        })
    );
    
    return results.flatMap(r => r.status === 'fulfilled' ? r.value : []);
}

/**
 * 分析情绪
 */
function analyzeSentiment(newsList) {
    let totalScore = 0;
    const details = [];
    
    newsList.forEach(news => {
        const title = news.title.toLowerCase();
        let score = 0;
        
        SENTIMENT.bullish.forEach(w => { if (title.includes(w)) score++; });
        SENTIMENT.bearish.forEach(w => { if (title.includes(w)) score--; });
        
        if (score !== 0) {
            totalScore += score;
            details.push({ score, title: news.title, source: news.source });
        }
    });
    
    // 计算信号
    const signal = totalScore > 2 ? 'bullish' : totalScore < -2 ? 'bearish' : 'neutral';
    const confidence = Math.min(Math.abs(totalScore) / 10, 1);
    
    return { score: totalScore, signal, confidence, details, newsCount: newsList.length };
}

/**
 * 获取完整报告 (一键调用)
 */
async function getReport() {
    const [topics, news] = await Promise.all([
        getHotTopics(),
        fetchNews(),
    ]);
    
    const sentiment = analyzeSentiment(news);
    
    return {
        timestamp: new Date().toISOString(),
        topics,
        sentiment: {
            score: sentiment.score,
            signal: sentiment.signal,
            confidence: sentiment.confidence,
        },
        headlines: sentiment.details.slice(0, 10),
        newsCount: sentiment.newsCount,
    };
}

// 导出
module.exports = {
    getHotTopics,
    fetchNews,
    analyzeSentiment,
    getReport,
    CONFIG,
    SOURCES,
};

// 直接运行
if (require.main === module) {
    (async () => {
        console.log('🕷️ News Spider v1.0\n');
        
        const report = await getReport();
        
        console.log(`📰 热点: ${report.topics.slice(0, 5).join(', ')}`);
        console.log(`📊 情绪评分: ${report.sentiment.score > 0 ? '+' : ''}${report.sentiment.score} (${report.sentiment.signal})`);
        console.log(`📋 Top 新闻 (${report.newsCount} 条):`);
        
        report.headlines.forEach(h => {
            const sign = h.score > 0 ? '+' : '';
            console.log(`  [${sign}${h.score}] ${h.title.slice(0, 60)}... (${h.source})`);
        });
        
        // 输出 JSON (供 Clawdbot 读取)
        console.log('\n--- JSON Output ---');
        console.log(JSON.stringify(report, null, 2));
    })();
}
