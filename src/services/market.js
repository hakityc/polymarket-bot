// src/services/market.js - 市场分析服务
const axios = require('axios');
const logger = require('../utils/logger');
const config = require('../config');

/**
 * 扫描并评分市场
 * @param {string[]} hotTopics - 热点话题关键词
 * @returns {object|null} 最佳交易标的
 */
async function findBestMarket(hotTopics = []) {
    logger.info('开始扫描市场...');
    
    try {
        const url = `${config.GAMMA_API}/events?limit=${config.scan.marketLimit}&active=true&closed=false&order=volume:desc`;
        const res = await axios.get(url);
        const events = res.data;

        let bestCandidate = null;
        let maxScore = -1;

        for (const ev of events) {
            if (!ev.markets) continue;

            let score = 0;
            const title = ev.title.toLowerCase();

            // 1. 热点匹配加分
            hotTopics.forEach(t => {
                if (title.includes(t.toLowerCase())) score += 5;
            });

            // 2. 交易量加分
            score += Math.log10(ev.volume || 1);

            // 3. 遍历市场寻找低价机会
            for (const m of ev.markets) {
                let prices = [];
                let tokenIds = [];
                
                try {
                    prices = JSON.parse(m.outcomePrices);
                    tokenIds = JSON.parse(m.clobTokenIds);
                } catch {
                    continue;
                }

                const pYes = parseFloat(prices[0]);

                // 筛选条件: 低价 + 有流动性
                if (pYes > 0.12 || pYes < 0.005) continue;
                if (!m.liquidity || parseFloat(m.liquidity) < 1000) continue;

                // 价格越低得分越高
                score += (0.15 - pYes) * 100;

                // Crypto 相关加分
                if (title.includes('bitcoin') || title.includes('crypto')) {
                    score += 10;
                }

                if (score > maxScore) {
                    maxScore = score;
                    bestCandidate = {
                        title: ev.title,
                        outcome: 'Yes',
                        price: pYes,
                        assetId: tokenIds[0],
                        conditionId: m.conditionId,
                        score: score,
                        volume: ev.volume,
                        liquidity: m.liquidity,
                    };
                }
            }
        }

        if (bestCandidate) {
            logger.success(`找到最佳标的: ${bestCandidate.title}`, { price: bestCandidate.price, score: bestCandidate.score });
        } else {
            logger.warn('未找到合适的交易标的');
        }

        return bestCandidate;
    } catch (e) {
        logger.error(`市场扫描失败: ${e.message}`);
        return null;
    }
}

/**
 * 获取市场列表 (用于调试)
 */
async function getMarkets(limit = 10) {
    const url = `${config.GAMMA_API}/events?limit=${limit}&active=true&closed=false&order=volume:desc`;
    const res = await axios.get(url);
    return res.data;
}

module.exports = {
    findBestMarket,
    getMarkets,
};
