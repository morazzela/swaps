const BN = require('decimal.js');

const methods = {
    '0x7ff36ab5': {
        name: 'swapExactETHForTokens',
        path: (params) => {
            const path = [];
            for (let i = 5; i < params.length; i += 1) {
                path.push(params[i].substr(24));
            }
            return path;
        },
        amounts: (receipt) => {
            const logs = receipt.logs
                .filter((log) => log.topics.length && log.topics[0] === '0xd78ad95fa46c994b6551d0da85fc275fe613ce37657fb8d5e3d130840159d822')
                .map((log) => log.data.substr(2).match(/.{64}/g).map((amount) => new BN(`0x${amount}`)));

            let amountIn = new BN(logs[0][0]);
            if (amountIn.isZero()) {
                amountIn = new BN(logs[0][1]);
            }

            let amountOut = new BN(logs[logs.length - 1][2]);
            if (amountOut.isZero()) {
                amountOut = new BN(logs[logs.length - 1][3]);
            }

            return Promise.resolve({ amountIn, amountOut });
        },
    },
};

// swapETHForExactTokens
methods['0xfb3bdb41'] = methods['0x7ff36ab5'];
methods['0xfb3bdb41'].name = 'swapETHForExactTokens';

class PancakeSwapV1 {
    static address = '';

    static methods = methods;
}

module.exports = PancakeSwapV1;
