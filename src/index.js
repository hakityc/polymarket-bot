// src/index.js - Polymarket Micro-Trading Bot
// Target: $8 -> $100
// Strategy: 15m/1h Trend Following based on Sentiment & Tech

const logger = require('./utils/logger');
const { getBalances, config } = require('./client');
const { fetchNews, getHotTopics, analyzeSentiment } = require('./services/news');
const { findBestMarket } = require('./services/market');
const { executeOrder, getPositions } = require('./services/trading');

async function main() {
    logger.info('🚀 Polymarket Bot 启动');
    logger.info(`目标: $${config.trading.targetBalance}`);

    try {
        // 1. 查询余额
        logger.info('查询余额...');
        const balances = await getBalances();
        logger.info(`EOA: ${balances.eoaAddress}`);
        logger.info(`Proxy: ${balances.proxyAddress}`);
        logger.info(`Cash: $${balances.proxyUsdc.toFixed(2)} | MATIC: ${balances.matic.toFixed(4)}`);

        if (balances.proxyUsdc >= config.trading.targetBalance) {
            logger.success('🎉 目标达成!');
            return;
        }

        // 2. 获取新闻和热点
        logger.info('分析市场情绪...');
        const hotTopics = await getHotTopics();
        logger.info(`热点: ${hotTopics.slice(0, 5).join(', ')}`);

        const news = await fetchNews();
        const sentiment = analyzeSentiment(news);
        logger.info(`情绪评分: ${sentiment.score} (${sentiment.newsCount} 条新闻)`);

        // 3. 扫描最佳标的
        logger.info('扫描市场机会...');
        const target = await findBestMarket(hotTopics);

        if (!target) {
            logger.warn('暂无合适标的，稍后再试');
            return;
        }

        logger.info(`锁定: ${target.title}`);
        logger.info(`价格: $${target.price} | 方向: ${target.outcome}`);

        // 4. 执行交易 (如需自动交易，取消下面的注释)
        // const order = await executeOrder(target);
        // if (order) {
        //     logger.success(`交易完成: ${order.orderID}`);
        // }

        logger.success('扫描完成');

    } catch (error) {
        logger.error(`运行错误: ${error.message}`);
    }
}

// 单次运行或定时循环
if (require.main === module) {
    const args = process.argv.slice(2);
    
    if (args.includes('--loop')) {
        // 循环模式
        logger.info(`循环模式启动，间隔 ${config.scan.interval / 60000} 分钟`);
        main();
        setInterval(main, config.scan.interval);
    } else {
        // 单次运行
        main();
    }
}

module.exports = { main };
