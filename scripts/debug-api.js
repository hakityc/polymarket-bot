// scripts/debug-api.js - API 调试工具
const axios = require('axios');

async function debug() {
    console.log('🔍 Polymarket API 调试\n');
    
    try {
        const url = 'https://gamma-api.polymarket.com/events?limit=3&active=true&closed=false&order=volume:desc';
        console.log(`请求: ${url}\n`);
        
        const res = await axios.get(url);
        
        res.data.forEach((event, i) => {
            console.log(`--- 市场 ${i + 1} ---`);
            console.log(`标题: ${event.title}`);
            console.log(`交易量: $${event.volume}`);
            console.log(`市场数: ${event.markets?.length || 0}`);
            
            if (event.markets && event.markets[0]) {
                const m = event.markets[0];
                console.log(`首个市场 ID: ${m.conditionId}`);
                console.log(`流动性: $${m.liquidity}`);
            }
            console.log();
        });
    } catch (e) {
        console.error('请求失败:', e.message);
    }
}

debug();
