// src/services/crypto.js - Crypto Price Data Service
const axios = require('axios');
const logger = require('../utils/logger');
const { calculateRSI, calculateEMA } = require('../utils/ta');

// Binance API (No Auth required for public data)
const API_URL = 'https://api.binance.com/api/v3';

/**
 * Fetch OHLCV data and calculate indicators
 * @param {string} symbol - 'BTC' or 'ETH'
 * @param {string} interval - '15m', '1h'
 * @returns {Promise<object>} Technical analysis result
 */
async function getTechnicalAnalysis(symbol = 'BTC', interval = '15m') {
    const pair = `${symbol.toUpperCase()}USDT`;
    
    try {
        // Fetch 50 candles (enough for EMA/RSI)
        const url = `${API_URL}/klines?symbol=${pair}&interval=${interval}&limit=50`;
        const res = await axios.get(url);
        
        // Binance response: [ [time, open, high, low, close, volume, ...], ... ]
        const closes = res.data.map(k => parseFloat(k[4]));
        const currentPrice = closes[closes.length - 1];

        // Calculate Indicators
        const rsi = calculateRSI(closes, 14);
        const emaFast = calculateEMA(closes, 9);  // Short trend
        const emaSlow = calculateEMA(closes, 21); // Long trend

        // Determine Signal
        // Bullish: Price > EMA21 && RSI < 70 && EMA9 > EMA21
        // Bearish: Price < EMA21 && RSI > 30 && EMA9 < EMA21
        
        let trend = 'NEUTRAL';
        if (currentPrice > emaSlow && emaFast > emaSlow) trend = 'BULLISH';
        if (currentPrice < emaSlow && emaFast < emaSlow) trend = 'BEARISH';

        return {
            symbol,
            price: currentPrice,
            rsi: parseFloat(rsi.toFixed(2)),
            ema9: parseFloat(emaFast.toFixed(2)),
            ema21: parseFloat(emaSlow.toFixed(2)),
            trend,
            timestamp: Date.now()
        };

    } catch (e) {
        logger.error(`Crypto Data Error (${symbol}): ${e.message}`);
        return null;
    }
}

module.exports = { getTechnicalAnalysis };
