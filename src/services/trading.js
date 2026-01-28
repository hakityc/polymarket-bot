// src/services/trading.js - 交易执行服务
const logger = require('../utils/logger');
const { getClient, getBalances, config } = require('../client');

/**
 * 执行交易
 * @param {object} market - 目标市场信息
 */
async function executeOrder(market) {
    logger.info(`准备交易: ${market.title}`);
    
    try {
        // 获取余额
        const balances = await getBalances();
        const availableBudget = balances.proxyUsdc - config.trading.budgetBuffer;
        
        if (availableBudget <= 0) {
            logger.error('余额不足');
            return null;
        }

        // 计算下单参数
        const buyPrice = market.price * (1 + config.trading.slippage);
        const maxBet = Math.min(config.trading.maxBet, availableBudget);
        const size = Math.floor((maxBet / buyPrice) * 10) / 10;

        if (size < 1) {
            logger.warn(`可买数量 (${size}) 太少，放弃交易`);
            return null;
        }

        logger.info(`下单: ${size} 份 @ $${buyPrice.toFixed(4)}`);

        // 获取客户端并下单
        const client = getClient();
        const order = await client.createOrder({
            tokenID: market.assetId,
            price: buyPrice,
            side: 'BUY',
            size: size,
            feeRateBps: 0,
            nonce: Date.now(),
        });

        logger.success(`交易成功! Order ID: ${order.orderID}`);
        return order;

    } catch (e) {
        logger.error(`交易失败: ${e.message}`);
        
        if (e.message.includes('funds')) {
            logger.info('余额不足，尝试减半下单...');
            // TODO: 实现重试逻辑
        }
        
        return null;
    }
}

/**
 * 获取持仓
 */
async function getPositions() {
    try {
        const { proxyAddress } = await getBalances();
        const res = await fetch(`${config.DATA_API}/positions?user=${proxyAddress.toLowerCase()}`);
        return await res.json();
    } catch (e) {
        logger.error(`获取持仓失败: ${e.message}`);
        return [];
    }
}

module.exports = {
    executeOrder,
    getPositions,
};
