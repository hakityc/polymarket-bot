// src/client.js - Polymarket API 客户端封装
const { ClobClient } = require('@polymarket/clob-client');
const { ethers } = require('ethers');
const config = require('./config');

let _client = null;
let _wallet = null;
let _provider = null;
let _proxyAddress = null;

/**
 * 获取 Provider
 */
function getProvider() {
    if (!_provider) {
        _provider = new ethers.JsonRpcProvider(config.RPC_URL);
    }
    return _provider;
}

/**
 * 获取钱包 (带 V5/V6 兼容层)
 */
function getWallet() {
    if (!_wallet) {
        if (!config.credentials.privateKey) {
            throw new Error('缺少 PRIVATE_KEY 配置');
        }
        const wallet = new ethers.Wallet(config.credentials.privateKey, getProvider());
        
        // Ethers v5/v6 兼容层
        _wallet = {
            ...wallet,
            address: wallet.address,
            getAddress: () => wallet.getAddress(),
            signMessage: (message) => wallet.signMessage(message),
            _signTypedData: (domain, types, value) => wallet.signTypedData(domain, types, value),
            _original: wallet,
        };
    }
    return _wallet;
}

/**
 * 获取 CLOB 客户端
 */
function getClient() {
    if (!_client) {
        const wallet = getWallet();
        const creds = config.credentials;
        
        _client = new ClobClient(
            config.HOST,
            config.CHAIN_ID,
            wallet,
            creds.apiKey ? {
                key: creds.apiKey,
                secret: creds.apiSecret,
                passphrase: creds.apiPassphrase,
            } : undefined
        );
    }
    return _client;
}

/**
 * 获取 Proxy 地址
 */
async function getProxyAddress() {
    if (!_proxyAddress) {
        const provider = getProvider();
        const wallet = getWallet();
        const abi = ['function getPolyProxyWalletAddress(address) view returns (address)'];
        const factory = new ethers.Contract(config.PROXY_FACTORY_ADDRESS, abi, provider);
        _proxyAddress = await factory.getPolyProxyWalletAddress(wallet.address);
    }
    return _proxyAddress;
}

/**
 * 获取余额
 */
async function getBalances() {
    const provider = getProvider();
    const wallet = getWallet();
    const proxyAddr = await getProxyAddress();
    
    const usdcAbi = ['function balanceOf(address) view returns (uint256)'];
    const usdc = new ethers.Contract(config.USDC_ADDRESS, usdcAbi, provider);
    
    const [eoaUsdc, proxyUsdc, matic] = await Promise.all([
        usdc.balanceOf(wallet.address),
        usdc.balanceOf(proxyAddr),
        provider.getBalance(wallet.address),
    ]);
    
    return {
        eoaAddress: wallet.address,
        proxyAddress: proxyAddr,
        eoaUsdc: parseFloat(ethers.formatUnits(eoaUsdc, 6)),
        proxyUsdc: parseFloat(ethers.formatUnits(proxyUsdc, 6)),
        matic: parseFloat(ethers.formatEther(matic)),
    };
}

module.exports = {
    getProvider,
    getWallet,
    getClient,
    getProxyAddress,
    getBalances,
    config,
};
