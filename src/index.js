// src/index.js - Polymarket Micro-Trading Bot (V2 Trend Follow)
const logger = require('./utils/logger');
const { getBalances, config } = require('./client');
const { findBestMarket } = require('./services/market');
const { executeOrder } = require('./services/trading');

async function main() {
    logger.info('🚀 Polymarket Bot (Trend Follow) 启动');
    logger.info(`目标: $${config.trading.targetBalance}`);

    try {
        // 1. 查询余额
        const balances = await getBalances();
        logger.info(`Cash: $${balances.proxyUsdc.toFixed(2)} | MATIC: ${balances.matic.toFixed(4)}`);

        if (balances.proxyUsdc >= config.trading.targetBalance) {
            logger.success('🎉 目标达成!');
            return;
        }

        if (balances.proxyUsdc < 1.0) {
            logger.error('余额过低 (< $1)，无法交易');
            return;
        }

        // 2. 扫描机会 (Trend Following)
        // 这一步现在包含了 Crypto Technical Analysis
        const target = await findBestMarket();

        if (!target) {
            logger.info('😴 暂时空仓，等待下一个周期');
            return;
        }

        // 3. 执行交易 (默认关闭，需手动开启)
        // const order = await executeOrder(target);
        // if (order) logger.success(`下单成功: ${order.orderID}`);

    } catch (error) {
        logger.error(`运行错误: ${error.message}`);
    }
}

// 循环模式
if (require.main === module) {
    const args = process.argv.slice(2);
    if (args.includes('--loop')) {
        logger.info(`循环模式启动，间隔 ${config.scan.interval / 60000} 分钟`);
        main();
        setInterval(main, config.scan.interval);
    } else {
        main();
    }
}

module.exports = { main };
