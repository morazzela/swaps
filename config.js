const { utils } = require('ethers');

function addr(str) {
    return utils.getAddress(str);
}

const config = {
    telegramKey: '1864997198:AAHXWVNmLW19zRVUyaJdOOy1t4pUqHeDp4w',
    telegramChatId: '@tx_tracker_ele_dev',
    dotCount: 100,
    donationAddress: '0x2B585727281257ba886d79D726f04233e70Ee983',
    chadMinBuy: 10000,
    brainletMinSell: 10000,
    bogMinBuy: 25000,
    networks: [{
        active: true,
        name: 'BSC',
        url: 'wss://bsc-ws-node.nariox.org:443',
        tokenAddress: addr('0x0e09fabb73bd3ade0a17ecc321fd13a19e81ce82'),
        explorerTxUri: (hash) => `https://bscscan.com/tx/${hash}`,
        weth: addr('0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c'),
        usd: addr('0x8ac76a51cc950d9822d68b83fe1ad97b32cd580d'),
        routers: [{
            name: 'PancakeSwap V2',
            address: addr('0x10ED43C718714eb63d5aA57B78B54704E256024E'),
            pairTokens: [
                addr('0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c'),
            ],
        }, {
            name: 'PancakeSwap V1',
            address: addr('0x05fF2B0DB69458A0750badebc4f9e13aDd608C7F'),
            pairTokens: [
                addr('0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c'),
            ],
        }, {
            name: 'WaultSwap',
            address: addr('0xD48745E39BbED146eEC15b79cBF964884F9877c2'),
            pairTokens: [
                addr('0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c'),
            ],
        }],
    }, {
        active: false,
        name: 'Polygon',
        url: 'wss://matic-mainnet-archive-ws.bwarelabs.com',
        tokenAddress: addr('0xacd7b3d9c10e97d0efa418903c0c7669e702e4c0'),
        explorerTxUri: (hash) => `https://polygonscan.com/tx/${hash}`,
        weth: addr('0x0d500b1d8e8ef31e21c99d1db9a6444d3adf1270'),
        usd: addr('0x2791bca1f2de4661ed88a30c99a7a9449aa84174'),
        routers: [{
            name: 'QuickSwap',
            address: addr('0xa5E0829CaCEd8fFDD4De3c43696c57F7D7A678ff'),
            pairTokens: [
                addr('0x0d500b1d8e8ef31e21c99d1db9a6444d3adf1270'),
            ],
        }],
    }],
};

module.exports = config;
