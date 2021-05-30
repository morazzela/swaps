const ethers = require('ethers');
const waterfall = require('async/waterfall');
const BN = require('decimal.js');

const helpers = require('./helpers');
const config = require('../config');

const routerAbi = require('../abis/router.json');
const pairAbi = require('../abis/pair.json');
const factoryAbi = require('../abis/factory.json');
const tokenAbi = require('../abis/token.json');

function onSwapEvent(network, router, pair, sender, amount0In, amount1In, amount0Out, amount1Out, to, receipt) {
    const tokenIn = amount0In.isZero() ? pair.token1 : pair.token0;
    const tokenOut = amount0Out.isZero() ? pair.token1 : pair.token0;

    const amountIn = new BN((amount0In.isZero() ? amount1In : amount0In).toString()).div(tokenIn.pow);
    const amountOut = new BN((amount0Out.isZero() ? amount1Out : amount0Out).toString()).div(tokenOut.pow);

    const isBuy = tokenOut.address === network.tokenAddress;

    let message = `${isBuy ? 'Bought' : 'Sold'} ${amountIn} ${tokenIn.symbol} for ${amountOut} ${tokenOut.symbol} on ${router.name}`;
    message += `\n${network.explorerTxUri(receipt.transactionHash)}`;

    console.log(message);
}

config.networks.forEach((network) => {
    if (network.active !== true) {
        return;
    }

    const provider = helpers.resolveProvider(network.url);

    network.routers.forEach((router) => {
        const routerContract = new ethers.Contract(router.address, routerAbi, provider);

        waterfall([
            (cb) => {
                routerContract.factory().then((factoryAddress) => {
                    cb(null, new ethers.Contract(factoryAddress, factoryAbi, provider));
                });
            },
            (factory, cb) => {
                const promises = [];
                router.pairTokens.forEach((pairToken) => {
                    promises.push(factory.getPair(network.tokenAddress, pairToken));
                });
                Promise.all(promises).then((pairAddresses) => {
                    cb(null, pairAddresses.map((pairAddress) => new ethers.Contract(pairAddress, pairAbi, provider)));
                });
            },
            (pairs, cb) => {
                const promises = [];

                pairs.forEach((pair) => {
                    const promise = new Promise((resolve) => {
                        Promise.all([
                            pair.token0(),
                            pair.token1(),
                        ]).then((tokens) => {
                            const token0 = new ethers.Contract(tokens[0], tokenAbi, provider);
                            const token1 = new ethers.Contract(tokens[1], tokenAbi, provider);

                            Promise.all([
                                token0.symbol(),
                                token0.decimals(),
                                token1.symbol(),
                                token1.decimals(),
                            ]).then((tokensData) => {
                                resolve({
                                    contract: pair,
                                    token0: {
                                        contract: token0,
                                        symbol: tokensData[0],
                                        pow: new BN(10).pow(tokensData[1]),
                                    },
                                    token1: {
                                        contract: token1,
                                        symbol: tokensData[2],
                                        pow: new BN(10).pow(tokensData[3]),
                                    },
                                });
                            });
                        });
                    });

                    promises.push(promise);
                });

                Promise.all(promises).then((result) => cb(null, result));
            },
            (pairs, cb) => {
                pairs.forEach((pair) => {
                    pair.contract.on('Swap', (...args) => {
                        onSwapEvent(network, router, pair, ...args);
                    });
                });
            },
        ], (err) => {
            throw err;
        });
    });
});
