const { utils } = require('ethers');

function addr(str) {
    return utils.getAddress(str);
}

const config = {
    networks: [{
        active: true,
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
    }],
};

module.exports = config;
