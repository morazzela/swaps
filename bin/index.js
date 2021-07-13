const ethers = require('ethers');
const waterfall = require('async/waterfall');
const BN = require('decimal.js');
const axios = require('axios');

const helpers = require('./helpers');
const config = require('../config');

const routerAbi = require('../abis/router.json');
const pairAbi = require('../abis/pair.json');
const factoryAbi = require('../abis/factory.json');
const tokenAbi = require('../abis/token.json');

const telegramBaseUri = `https://api.telegram.org/bot${config.telegramKey}`;

function onSwapEvent(network, stablePair, usd, router, pair, sender, amount0In, amount1In, amount0Out, amount1Out, to, receipt) {
    const tokenIn = amount0In.isZero() ? pair.token1 : pair.token0;
    const tokenOut = amount0Out.isZero() ? pair.token1 : pair.token0;

    const amountIn = new BN((amount0In.isZero() ? amount1In : amount0In).toString()).div(tokenIn.pow);
    const amountOut = new BN((amount0Out.isZero() ? amount1Out : amount0Out).toString()).div(tokenOut.pow);

    const isBuy = tokenOut.contract.address === network.tokenAddress;

    const amountInStr = helpers.formatNumber(amountIn.toNumber(), 6);
    const amountOutStr = helpers.formatNumber(amountOut.toNumber(), 6);

    const weth = isBuy ? tokenIn : tokenOut;
    const wethPrice = isBuy
        ? amountOut.div(amountIn)
        : amountIn.div(amountOut);

    stablePair.token0().then((stableToken0Addr) => {
        const isUsdToken0 = stableToken0Addr === usd.address;

        stablePair.getReserves().then((reserves) => {
            let wethReserve = isUsdToken0 ? reserves[1] : reserves[0];
            let usdReserve = isUsdToken0 ? reserves[0] : reserves[1];

            wethReserve = new BN(wethReserve.toString()).div(weth.pow);
            usdReserve = new BN(usdReserve.toString()).div(usd.pow);

            const wethUsdPrice = usdReserve.div(wethReserve);

            const swapUsdValue = isBuy
                ? amountIn.times(wethUsdPrice)
                : amountOut.times(wethUsdPrice);
            const swapUsdValueStr = helpers.formatNumber(swapUsdValue.toNumber(), 2);

            let message = null;

            if (isBuy) {
                message = `🚀 Bought <strong>${amountOutStr} ${tokenOut.symbol}</strong> for <strong>${amountInStr} ${tokenIn.symbol} ($${swapUsdValueStr})</strong> on <em>${router.name} (${network.name})</em>\n\n`;
            } else {
                message = `👹 Sold <strong>${amountInStr} ${tokenIn.symbol}</strong> for <strong>${amountOutStr} ${tokenOut.symbol} ($${swapUsdValueStr})</strong> on <em>${router.name} (${network.name})</em>\n\n`;
            }

            const token = pair.token0.isToken ? pair.token0 : pair.token1;

            let nbDots = isBuy
                ? amountOut.toNumber() / config.dotCount
                : amountIn.toNumber() / config.dotCount;

            if (nbDots < 1) {
                nbDots = 1;
            }

            nbDots = Math.round(nbDots);

            for (let i = 0; i < nbDots; i += 1) {
                message += isBuy ? '🟢' : '🔴';
            }

            message += `\n\n<strong>1 ${weth.symbol} = ${helpers.formatNumber(wethPrice, 2)} ${token.symbol}</strong>`;
            message += `\n\n<a href="${network.explorerTxUri(receipt.transactionHash)}">View Transaction</a>`;

            console.log(message);

            // axios.get(`${telegramBaseUri}/sendMessage`, {
            //     params: {
            //         chat_id: config.telegramChatId,
            //         parse_mode: 'HTML',
            //         disable_web_page_preview: true,
            //         disable_notification: true,
            //         text: message,
            //     },
            // })
            //     .then((response) => {
            //         console.log(response);
            //     })
            //     .catch((err) => {
            //         console.log('first request error');
            //         console.log(err.message);
            //         console.log(err.response ? err.response.data : '');
            //     });
        });
    });
}

config.networks.forEach((network) => {
    if (network.active !== true) {
        return;
    }

    const provider = helpers.resolveProvider(network.url);
    const usdContract = new ethers.Contract(network.usd, tokenAbi, provider);
    let usd = null;

    let factory = null;

    network.routers.forEach((router) => {
        const routerContract = new ethers.Contract(router.address, routerAbi, provider);

        waterfall([
            (cb) => {
                usdContract.decimals().then((decimals) => {
                    usd = {
                        contract: usdContract,
                        pow: new BN(10).pow(new BN(decimals)),
                    };

                    cb();
                });
            },
            (cb) => {
                routerContract.factory().then((factoryAddress) => {
                    factory = new ethers.Contract(factoryAddress, factoryAbi, provider);
                    cb();
                });
            },
            (cb) => {
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
                                        isToken: token0.address === network.tokenAddress,
                                    },
                                    token1: {
                                        contract: token1,
                                        symbol: tokensData[2],
                                        pow: new BN(10).pow(tokensData[3]),
                                        isToken: token1.address === network.tokenAddress,
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
                factory.getPair(network.weth, network.usd).then((stablePairAddress) => {
                    cb(null, pairs, new ethers.Contract(stablePairAddress, pairAbi, provider));
                });
            },
            (pairs, stablePair) => {
                pairs.forEach((pair) => {
                    pair.contract.on('Swap', (...args) => {
                        onSwapEvent(network, stablePair, usd, router, pair, ...args);
                    });
                });
            },
        ], (err) => {
            console.log(err.message);
        });
    });
});
