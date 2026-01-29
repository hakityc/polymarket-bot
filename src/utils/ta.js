// src/utils/ta.js - Technical Analysis Utilities

/**
 * Calculate RSI (Relative Strength Index)
 * @param {number[]} closes - Array of closing prices (newest last)
 * @param {number} period - RSI period (default 14)
 * @returns {number} RSI value (0-100)
 */
function calculateRSI(closes, period = 14) {
    if (closes.length < period + 1) return 50; // Not enough data

    let gains = 0;
    let losses = 0;

    // First period
    for (let i = closes.length - period - 1; i < closes.length - 1; i++) {
        const diff = closes[i + 1] - closes[i];
        if (diff >= 0) gains += diff;
        else losses -= diff;
    }

    let avgGain = gains / period;
    let avgLoss = losses / period;

    // Smoothed averages (Wilder's Smoothing) not strictly necessary for simple bot,
    // but we can use simple SMA for the first step for simplicity or stick to standard.
    // Let's use standard SMA for simplicity if dataset is small, but standard RSI uses EMA logic.
    // For this bot, standard SMA RSI is often sufficient, but let's do it right.
    
    // Recalculate properly with full series if possible, but for short history:
    const diff = closes[closes.length - 1] - closes[closes.length - 2];
    const currentGain = diff > 0 ? diff : 0;
    const currentLoss = diff < 0 ? -diff : 0;

    // Simple approximation for the latest point based on previous avg
    // To be precise we need loop. Let's do simple RS based on last N candles changes.
    gains = 0;
    losses = 0;
    // Look at last 14 changes
    for (let i = closes.length - period; i < closes.length; i++) {
        const change = closes[i] - closes[i - 1];
        if (change > 0) gains += change;
        else losses -= change;
    }
    
    avgGain = gains / period;
    avgLoss = losses / period;

    if (avgLoss === 0) return 100;
    const rs = avgGain / avgLoss;
    return 100 - (100 / (1 + rs));
}

/**
 * Calculate EMA (Exponential Moving Average)
 * @param {number[]} closes 
 * @param {number} period 
 * @returns {number} EMA value
 */
function calculateEMA(closes, period) {
    if (closes.length < period) return null;
    
    const k = 2 / (period + 1);
    let ema = closes[0]; // Start with first price (or SMA of first N)

    // Simple iterative calculation
    for (let i = 1; i < closes.length; i++) {
        ema = closes[i] * k + ema * (1 - k);
    }
    return ema;
}

module.exports = { calculateRSI, calculateEMA };
