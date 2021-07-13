const { utils } = require('ethers');

function addr(str) {
    return utils.getAddress(str);
}

const config = {
    telegramKey: '',
    telegramChatId: '',
    dotCount: 100,
    networks: [{
        active: false,
        name: 'BSC',
        url: 'wss://bsc-ws-node.nariox.org:443',
        tokenAddress: addr('0xacd7b3d9c10e97d0efa418903c0c7669e702e4c0'),
        explorerTxUri: (hash) => `https://bscscan.com/tx/${hash}`,
        routers: [{
            name: 'PancakeSwap V2',
            address: addr('0x10ED43C718714eb63d5aA57B78B54704E256024E'),
            pairTokens: [
                addr('0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c'),
            ],
        }],
    }, {
        active: true,
        name: 'Polygon',
        url: 'wss://matic-mainnet-archive-ws.bwarelabs.com',
        // tokenAddress: addr('0xacd7b3d9c10e97d0efa418903c0c7669e702e4c0'),
        tokenAddress: addr('0x2791bca1f2de4661ed88a30c99a7a9449aa84174'),
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
