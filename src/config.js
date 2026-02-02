// src/config.js - 统一配置管理
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

module.exports = {
    // Polymarket API
    HOST: 'https://clob.polymarket.com',
    GAMMA_API: 'https://gamma-api.polymarket.com',
    DATA_API: 'https://data-api.polymarket.com',
    CHAIN_ID: 137,
    RPC_URL: 'https://polygon-bor-rpc.publicnode.com',

    // 合约地址
    USDC_ADDRESS: '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174',
    PROXY_FACTORY_ADDRESS: '0x4bFb41d5B3570DeFd03C39a9A4D8dE6Bd8B8982E',

    // 交易配置
    trading: {
        maxBet: 1.5,           // 单次最大下注 USD
        targetBalance: 100,    // 目标余额
        budgetBuffer: 0.2,     // 预留 Gas 费用
        slippage: 0.05,        // 滑点百分比
    },

    // 扫描配置
    scan: {
        interval: 15 * 60 * 1000,  // 15 分钟
        newsLimit: 10,
        marketLimit: 100,
        // 关注的核心关键词
        keywords: ['Bitcoin', 'Ethereum', 'Trump', 'Kraken', 'Macron', 'MicroStrategy', 'NVIDIA'],
    },

    // 凭据 (从环境变量读取)
    credentials: {
        privateKey: process.env.PRIVATE_KEY,
        apiKey: process.env.POLYMARKET_API_KEY,
        apiSecret: process.env.POLYMARKET_API_SECRET,
        apiPassphrase: process.env.POLYMARKET_API_PASSPHRASE,
    },
};
