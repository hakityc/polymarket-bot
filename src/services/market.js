// src/services/market.js - Diversified Market Analysis Service (V3)
const axios = require('axios');
const logger = require('../utils/logger');
const config = require('../config');
const { getTechnicalAnalysis } = require('./crypto');
const { fetchNews, analyzeSentiment, getHotTopics } = require('./news');

/**
 * Scan for best trading opportunities (Diversified: Crypto Tech + News Sentiment + Hot Topics)
 * @returns {object|null} Best market to trade
 */
async function findBestMarket() {
    logger.info('🔍 启动多元化策略扫描...');

    // --- 1. 获取基础数据 ---
    
    // A. Crypto 技术面
    const btcTech = await getTechnicalAnalysis('BTC', '15m');
    const ethTech = await getTechnicalAnalysis('ETH', '15m');
    let cryptoTrend = 'NEUTRAL';
    if (btcTech && ethTech) {
        if (btcTech.trend === 'BULLISH' && ethTech.trend === 'BULLISH') cryptoTrend = 'BULLISH';
        if (btcTech.trend === 'BEARISH' && ethTech.trend === 'BEARISH') cryptoTrend = 'BEARISH';
        logger.info(`📈 技术面: BTC[${btcTech.trend}] ETH[${ethTech.trend}] -> 综合[${cryptoTrend}]`);
    }

    // B. 新闻情绪面
    const news = await fetchNews();
    const sentiment = analyzeSentiment(news);
    logger.info(`📰 消息面: 评分 ${sentiment.score} (基于 ${sentiment.newsCount} 条新闻)`);
    
    let sentimentTrend = 'NEUTRAL';
    if (sentiment.score >= 5) sentimentTrend = 'BULLISH';
    if (sentiment.score <= -5) sentimentTrend = 'BEARISH';

    // C. 热点话题
    const hotTopics = await getHotTopics();
    logger.info(`🔥 热点话题: ${hotTopics.slice(0, 5).join(', ')}`);

    // --- 2. 制定扫描策略 ---
    
    // 策略合并: 技术面 + 消息面共振?
    let cryptoConfidence = 0;
    if (cryptoTrend === sentimentTrend && cryptoTrend !== 'NEUTRAL') {
        cryptoConfidence = 2; // 强信号
        logger.success(`✅ 信号共振: 技术面与消息面一致看${cryptoTrend === 'BULLISH' ? '多' : '空'}!`);
    } else if (cryptoTrend !== 'NEUTRAL') {
        cryptoConfidence = 1; // 仅技术面
    }

    // 搜索关键词构造
    let searchKeywords = [];
    
    // 添加 Crypto 关键词
    if (cryptoConfidence > 0) {
        searchKeywords.push('Bitcoin', 'Ethereum', 'Price');
    }

    // 添加热点关键词 (限制数量，防止请求过多)
    hotTopics.slice(0, 3).forEach(t => searchKeywords.push(t));
    
    // 去重
    searchKeywords = [...new Set(searchKeywords)];
    logger.info(`🎯 扫描关键词: ${searchKeywords.join(', ')}`);

    // --- 3. 扫描 Polymarket ---
    
    try {
        let bestCandidate = null;
        let maxScore = -100;

        // 针对每个关键词搜索
        for (const keyword of searchKeywords) {
            const url = `${config.GAMMA_API}/events?limit=10&active=true&closed=false&order=volume:desc&slug_icontains=${keyword}`;
            const res = await axios.get(url);
            const events = res.data;

            for (const ev of events) {
                // 跳过低流动性
                if (ev.volume < 1000) continue;

                for (const m of ev.markets) {
                    let prices;
                    try { prices = JSON.parse(m.outcomePrices); } catch { continue; }
                    
                    const pYes = parseFloat(prices[0]);
                    const pNo = parseFloat(prices[1]); // Assuming binary YES/NO

                    // 评分逻辑
                    let score = 0;
                    let outcome = null;

                    // 逻辑分支 A: Crypto 价格类
                    if (ev.title.includes('Bitcoin') || ev.title.includes('Ethereum')) {
                        if (cryptoConfidence === 0) continue; // 没信号就不做 Crypto

                        // 简单的方向匹配 (需根据实际 Question 文本优化)
                        // 假设 Question 是 "Will BTC be > $X?"
                        // BULLISH -> 买 Yes
                        // BEARISH -> 买 No (或买 "Will BTC be < $Y" 的 Yes)
                        
                        // 这里简化处理：假设都是 "Will X happen?"
                        // 如果 Bullish，倾向于买 Yes (价格 0.4-0.6)
                        if (cryptoTrend === 'BULLISH') {
                            if (pYes >= 0.4 && pYes <= 0.65) {
                                score += 50 + (cryptoConfidence * 10);
                                outcome = 'Yes';
                            }
                        } else if (cryptoTrend === 'BEARISH') {
                            // 如果看跌，买 No (相当于卖 Yes) 或者买 "No" 的 shares (Polymarket UI 是买 No)
                            // SDK 通常买 "No" 对应的 tokenID
                            if (pNo >= 0.4 && pNo <= 0.65) {
                                score += 50 + (cryptoConfidence * 10);
                                outcome = 'No';
                            }
                        }
                    } 
                    // 逻辑分支 B: 热点事件 (跟着大钱走)
                    else {
                        // 简单的动量策略: 哪个方向钱多且价格在上升趋势? (这里很难获取历史K线，只能看当前价格)
                        // 替代策略: 寻找极高赔率的黑马? 或者稳健的 >0.8?
                        // 这里我们尝试寻找 "分歧巨大" 的热点 (价格接近 0.5)
                        if (Math.abs(pYes - 0.5) < 0.1 && m.liquidity > 10000) {
                            score += 20; // 这是一个活跃的博弈市场
                            // 随机? 不，我们根据 Google Trends 热度定方向
                            // 暂时保守，只记录，不下单，除非 score 极高
                            outcome = pYes > pNo ? 'Yes' : 'No'; // 顺势
                        }
                    }

                    if (score > maxScore && outcome) {
                        maxScore = score;
                        bestCandidate = {
                            title: ev.title,
                            question: m.question,
                            outcome: outcome,
                            price: outcome === 'Yes' ? pYes : pNo,
                            assetId: outcome === 'Yes' ? JSON.parse(m.clobTokenIds)[0] : JSON.parse(m.clobTokenIds)[1],
                            score: score
                        };
                    }
                }
            }
        }

        if (bestCandidate && bestCandidate.score > 40) {
            logger.success(`✨ 发现最佳机会: ${bestCandidate.title}`);
            logger.info(`   问题: ${bestCandidate.question}`);
            logger.info(`   策略: 买入 ${bestCandidate.outcome} @ $${bestCandidate.price} (得分: ${bestCandidate.score})`);
            return bestCandidate;
        } else {
            logger.info('📉 未找到高分交易机会，继续观望...');
            return null;
        }

    } catch (e) {
        logger.error(`市场扫描异常: ${e.message}`);
        return null;
    }
}

module.exports = { findBestMarket };
