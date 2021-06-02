const { ethers } = require('ethers');

module.exports = {
    debug: true,
    telegramKey: '',
    telegramChatId: '',
    dotCount: 500,
    chadMinBuy: 15000,
    brainletMinSell: 15000,
    bogMinBuy: 50000,
    networks: [
        {
            name: 'Binance Smart Chain',
            url: 'wss://bsc-ws-node.nariox.org:443',
            active: false,
            tokenAddress: ethers.utils.getAddress('0xAcD7B3D9c10e97d0efA418903C0c7669E702E4C0'),
            explorerTxUri: (hash) => `https://bscscan.com/tx/${hash}`,
            routers: [{
                name: 'PancakeSwap V2',
                address: '0x10ED43C718714eb63d5aA57B78B54704E256024E',
                pairTokens: [
                    '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c', // WBNB
                ],
            }],
        },
        {
            name: 'Polygon',
            url: 'wss://ws-matic-mainnet.chainstacklabs.com',
            active: true,
            tokenAddress: ethers.utils.getAddress('0xAcD7B3D9c10e97d0efA418903C0c7669E702E4C0'),
            explorerTxUri: (hash) => `https://explorer-mainnet.maticvigil.com/tx/${hash}/internal-transactions`,
            routers: [{
                name: 'SushiSwap',
                address: '0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506',
                pairTokens: [
                    '0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270', // WMatic
                ],
            }],
        },
    ],
};
