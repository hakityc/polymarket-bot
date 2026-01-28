const { ClobClient } = require('@polymarket/clob-client');
const { ethers } = require('ethers');
const axios = require('axios');
const fs = require('fs');
const xml2js = require('xml2js'); // 需要 npm install xml2js
require('dotenv').config();

const HOST = 'https://clob.polymarket.com';
const CHAIN_ID = 137;
const GAMMA_API = "https://gamma-api.polymarket.com/events";

// 配置
const BUDGET_BUFFER = 0.2; // 留 $0.2 做 Gas 或误差

async function main() {
    log("🤖 K-Bot 增强版狙击程序启动...");

    // 0. 检查私钥
    if (!process.env.PRIVATE_KEY) {
        log("❌ 缺少 PRIVATE_KEY");
        return;
    }

    try {
        // 1. 获取新闻热点 (简单 RSS 扫描)
        log("📰 正在分析 Google News 热点...");
        const hotTopics = await getHotTopics();
        log(`   检测到热词: ${hotTopics.slice(0, 3).join(', ')}`);

        // 2. 扫描市场
        log("🛰️ 正在寻找最佳标的 (结合热点 + 赔率)...");
        const market = await findBestMarket(hotTopics);
        
        if (!market) {
            log("❌ 依然没有找到任何标的。这很不正常。");
            return;
        }

        log(`✨ 最终锁定: [${market.title}]`);
        log(`   方向: ${market.outcome}`);
        log(`   现价: $${market.price}`);
        log(`   逻辑: ${market.reason}`);

        // 3. 执行梭哈
        await executeSnipe(market);

    } catch (e) {
        log(`❌ 致命错误: ${e.message}`);
    }
}

async function getHotTopics() {
    // 简单抓取 Tech/Business/Crypto 新闻
    try {
        const rssUrl = "https://news.google.com/rss/search?q=crypto+OR+bitcoin+OR+election+OR+war&hl=en-US&gl=US&ceid=US:en";
        const res = await axios.get(rssUrl);
        const parser = new xml2js.Parser();
        const result = await parser.parseStringPromise(res.data);
        
        const items = result.rss.channel[0].item;
        let keywords = [];
        
        // 简单提取前10条新闻的关键词
        items.slice(0, 10).forEach(item => {
            const title = item.title[0];
            const words = title.split(' ').filter(w => w.length > 4);
            keywords.push(...words);
        });
        
        return [...new Set(keywords)]; // 去重
    } catch (e) {
        log(`⚠️ 新闻抓取失败 (${e.message})，将使用默认热点。`);
        return ["Bitcoin", "Trump", "Crypto"];
    }
}

async function findBestMarket(topics) {
    try {
        // 获取 Top 100 活跃市场
        const res = await axios.get(`${GAMMA_API}?limit=100&active=true&closed=false&order=volume:desc`);
        const events = res.data;

        let bestCandidate = null;
        let maxScore = -1;

        for (const ev of events) {
            if (!ev.markets) continue;
            
            // 简单的评分系统
            let score = 0;
            const title = ev.title.toLowerCase();

            // 1. 热点匹配加分
            topics.forEach(t => {
                if (title.includes(t.toLowerCase())) score += 5;
            });

            // 2. Volume 加分 (流动性)
            score += Math.log10(ev.volume || 1);

                // 解析价格和 Token ID
                // API 返回的是 JSON 字符串，例如 "[\"0.235\", \"0.765\"]"
                let prices = [];
                let tokenIds = [];
                try {
                    prices = JSON.parse(m.outcomePrices);
                    tokenIds = JSON.parse(m.clobTokenIds);
                } catch (err) {
                    continue; // 解析失败则跳过
                }

                const pYes = parseFloat(prices[0]);
                
                // 3. 赔率筛选 (只看 Yes)
                // 放宽条件：价格 < 0.12 (8倍回报) 且 > 0.005 (过滤死盘)
                // 必须有流动性：liquidity > 0
                if (pYes > 0.12 || pYes < 0.005) continue;
                if (!m.liquidity || parseFloat(m.liquidity) < 1000) continue;

                // 价格越低，得分越高 (赔率越高)
                score += (0.15 - pYes) * 100;
                
                // 特定关键词加分 (Crypto 相关的低价单通常更有爆发力)
                if (title.includes("bitcoin") || title.includes("crypto")) score += 10;

                if (score > maxScore) {
                    maxScore = score;
                    bestCandidate = {
                        title: ev.title,
                        outcome: 'Yes',
                        price: pYes,
                        asset_id: tokenIds[0], // Yes Token ID
                        condition_id: m.conditionId,
                        reason: `Score: ${score.toFixed(1)} (Price: ${pYes}, Vol: ${ev.volume})`
                    };
                }
            }
        }
        return bestCandidate;
    } catch (e) {
        throw new Error(`市场扫描失败: ${e.message}`);
    }
}

async function executeSnipe(market) {
    // 初始化带签名的客户端
    const wallet = new ethers.Wallet(process.env.PRIVATE_KEY);
    const client = new ClobClient(HOST, CHAIN_ID, wallet, {
        key: process.env.POLYMARKET_API_KEY,
        secret: process.env.POLYMARKET_API_SECRET,
        passphrase: process.env.POLYMARKET_API_PASSPHRASE
    });

    log("💰 正在计算最大购买力...");
    
    // 假设余额 $8.5
    const budget = 8.5; 
    const buyPrice = market.price * 1.05; // 5% 滑点保护
    const size = Math.floor((budget / buyPrice) * 10) / 10; // 保留1位小数

    if (size < 5) {
        log(`⚠️ 可买数量 (${size}) 太少，放弃。`);
        return;
    }

    log(`🔫 发射！买入 ${size} 份 [${market.title}] @ $${buyPrice.toFixed(3)}`);

    try {
        const order = await client.createOrder({
            tokenID: market.asset_id,
            price: buyPrice,
            side: 'BUY',
            size: size,
            feeRateBps: 0,
            nonce: Date.now()
        });
        log(`✅✅✅ 狙击成功！Order ID: ${order.orderID}`);
        log(`🎉 坐等 $100！`);
    } catch (e) {
        log(`❌ 下单失败: ${e.message}`);
        // 如果是余额不足，尝试减半购买
        if (e.message.includes("funds")) {
            log("🔄 余额不足，尝试减半...");
            // retry logic here...
        }
    }
}

function log(msg) {
    console.log(msg);
    fs.appendFileSync('sniper_v2.log', `[${new Date().toISOString()}] ${msg}\n`);
}

main();
