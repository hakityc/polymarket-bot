// src/utils/logger.js - 统一日志工具
const fs = require('fs');
const path = require('path');

const LOG_DIR = path.join(__dirname, '..', '..', 'logs');
const LOG_FILE = path.join(LOG_DIR, 'bot.log');

// 确保日志目录存在
if (!fs.existsSync(LOG_DIR)) {
    fs.mkdirSync(LOG_DIR, { recursive: true });
}

function formatTime() {
    return new Date().toISOString();
}

function log(level, message, data = null) {
    const timestamp = formatTime();
    const prefix = { info: '📋', warn: '⚠️', error: '❌', success: '✅' }[level] || '📋';
    
    const logLine = `[${timestamp}] [${level.toUpperCase()}] ${message}`;
    console.log(`${prefix} ${message}`);
    
    // 写入文件
    let fileLine = logLine;
    if (data) {
        fileLine += ` | ${JSON.stringify(data)}`;
    }
    fs.appendFileSync(LOG_FILE, fileLine + '\n');
}

module.exports = {
    info: (msg, data) => log('info', msg, data),
    warn: (msg, data) => log('warn', msg, data),
    error: (msg, data) => log('error', msg, data),
    success: (msg, data) => log('success', msg, data),
};
