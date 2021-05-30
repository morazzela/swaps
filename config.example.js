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
            tokenAddress: ethers.utils.getAddress('0x0e09fabb73bd3ade0a17ecc321fd13a19e81ce82'),
            explorerTxUri: (hash) => `https://bscscan.com/tx/${hash}`,
            routers: [{
                name: 'PancakeSwap V2',
                address: '',
                pairs: [
                    '0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619',
                ],
            }],
        },
        {
            name: 'Polygon',
            url: 'wss://ws-matic-mainnet.chainstacklabs.com',
            active: true,
            tokenAddress: ethers.utils.getAddress('0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619'),
            explorerTxUri: (hash) => `https://explorer-mainnet.maticvigil.com/tx/${hash}/internal-transactions`,
            routers: [{
                name: 'SushiSwap',
                address: '0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506',
                pairTokens: [
                    '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174',
                ],
            }],
        },
    ],
};
