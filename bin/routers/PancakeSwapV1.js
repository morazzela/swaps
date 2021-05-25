const BN = require('decimal.js');
const Router = require('./Router');

class PancakeSwapV1 extends Router {
    static name = 'PancakeSwap V1';

    static address = '0x05fF2B0DB69458A0750badebc4f9e13aDd608C7F';

    static methods = {
        '0x38ed1739': {
            name: 'swapExactTokensForTokens',
            path: (params) => this.extractPath(params, 6),
            amounts: this.resolvePancakeSwapAmounts,
        },
        '0x8803dbee': {
            name: 'swapTokensForExactTokens',
            path: (params) => this.extractPath(params, 6),
            amounts: this.resolvePancakeSwapAmounts,
        },
        '0x4a25d94a': {
            name: 'swapTokensForExactETH',
            path: (params) => this.extractPath(params, 6),
            amounts: this.resolvePancakeSwapAmounts,
        },
        '0x18cbafe5': {
            name: 'swapExactTokensForETH',
            path: (params) => this.extractPath(params, 6),
            amounts: this.resolvePancakeSwapAmounts,
        },
        '0x7ff36ab5': {
            name: 'swapExactETHForTokens',
            path: (params) => this.extractPath(params, 5),
            amounts: this.resolvePancakeSwapAmounts,
        },
        '0xfb3bdb41': {
            name: 'swapETHForExactTokens',
            path: (params) => this.extractPath(params, 5),
            amounts: this.resolvePancakeSwapAmounts,
        },
        '0x5c11d795': {
            name: 'swapExactTokensForTokensSupportingFeeOnTransferTokens',
            path: (params) => this.extractPath(params, 6),
            amounts: this.resolvePancakeSwapAmounts,
        },
        '0xb6f9de95': {
            name: 'swapExactETHForTokensSupportingFeeOnTransferTokens',
            path: (params) => this.extractPath(params, 5),
            amounts: this.resolvePancakeSwapAmounts,
        },
        '0x791ac947': {
            name: 'swapExactTokensForETHSupportingFeeOnTransferTokens',
            path: (params) => this.extractPath(params, 6),
            amounts: this.resolvePancakeSwapAmounts,
        },
    };

    static resolvePancakeSwapAmounts (receipt) {
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
    };
}

module.exports = PancakeSwapV1;
