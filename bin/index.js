const { ethers } = require('ethers');
const BN = require('decimal.js');
const axios = require('axios');
const config = require('../config.json');
const helpers = require('./helpers');
const pairAbi = require('../abis/pair.json');
const tokenAbi = require('../abis/token.json');
const memes = require('../memes.json');

const telegramBaseUri = `https://api.telegram.org/bot${config.telegramKey}`;

const { routers } = config;
const provider = helpers.resolveProvider(config.nodeUrl);
const tokenAddress = ethers.utils.getAddress(config.tokenAddress);
const wbnbUsdPair = new ethers.Contract('0x58F876857a02D6762E0101bb5C46A8c1ED44Dc16', pairAbi, provider);
const { donationAddress } = config;

function triggerDonation() {
    axios.get(`${telegramBaseUri}/sendMessage`, {
        params: {
            chat_id: config.telegramChatId,
            disable_notification: true,
            text: `Donation : ${donationAddress} (BSC / MATIC / ETH)`,
        },
    });
}

triggerDonation();
setInterval(() => {
    triggerDonation();
}, 60 * 60 * 24); // each day

routers.forEach((router) => {
    router.pairs.forEach((pair) => {
        const pairContract = new ethers.Contract(pair, pairAbi, provider);

        Promise.all([
            pairContract.token0(),
            pairContract.token1(),
        ]).then((tokens) => {
            pairContract.on('Swap', (sender, amount0In, amount1In, amount0Out, amount1Out, to, receipt) => {
                const amountIn = amount0In.isZero() ? amount1In : amount0In;
                const amountOut = amount0Out.isZero() ? amount1Out : amount0Out;

                let tokenIn = amount0In.isZero() ? tokens[1] : tokens[0];
                let tokenOut = amount0Out.isZero() ? tokens[1] : tokens[0];

                tokenIn = new ethers.Contract(tokenIn, tokenAbi, provider);
                tokenOut = new ethers.Contract(tokenOut, tokenAbi, provider);

                Promise.all([
                    tokenIn.symbol(),
                    tokenIn.decimals(),
                    tokenOut.symbol(),
                    tokenOut.decimals(),
                ]).then((data) => {
                    tokenIn = {
                        contract: tokenIn,
                        address: tokenIn.address,
                        symbol: data[0],
                        amount: helpers.formatNumber(new BN(amountIn.toString()).div(new BN(10).pow(data[1])).toNumber(), 6),
                        amountBN: new BN(amountIn.toString()).div(new BN(10).pow(data[1])),
                    };

                    tokenOut = {
                        contract: tokenOut,
                        address: tokenOut.address,
                        symbol: data[2],
                        amount: helpers.formatNumber(new BN(amountOut.toString()).div(new BN(10).pow(data[3])).toNumber(), 6),
                        amountBN: new BN(amountOut.toString()).div(new BN(10).pow(data[3])),
                    };

                    const isBuy = tokenOut.address === tokenAddress;

                    wbnbUsdPair.getReserves().then((reserves) => {
                        const wbnbPrice = new BN(reserves[1].toString()).div(reserves[0].toString());
                        const swapUsdPrice = (isBuy ? tokenIn.amountBN : tokenOut.amountBN).times(wbnbPrice);

                        const swapUsdPriceFormat = helpers.formatNumber(swapUsdPrice.toNumber());

                        let message = null;
                        if (isBuy) {
                            message = `🚀 Bought <strong>${tokenOut.amount} ${tokenOut.symbol}</strong> for <strong>${tokenIn.amount} ${tokenIn.symbol} ($${swapUsdPriceFormat})</strong>`;
                        } else {
                            message = `👹 Sold <strong>${tokenIn.amount} ${tokenIn.symbol}</strong> for <strong>${tokenOut.amount} ${tokenOut.symbol} ($${swapUsdPriceFormat})</strong>`;
                        }

                        message += ` on <em>${router.name}</em>\n\n`;

                        let nbDots = Math.round(swapUsdPrice.toNumber() / config.dotCount);

                        if (nbDots < 1) {
                            nbDots = 1;
                        }

                        for (let i = 0; i < nbDots; i += 1) {
                            message += isBuy ? '🟢' : '🔴';
                        }

                        let tokenUsdPrice = 0;
                        let bnbTokenPrice = 0;
                        message += '<strong>';
                        if (isBuy) {
                            tokenUsdPrice = helpers.formatNumber(tokenIn.amountBN.times(wbnbPrice).div(tokenOut.amountBN).toNumber(), 3);
                            bnbTokenPrice = helpers.formatNumber(tokenOut.amountBN.div(tokenIn.amountBN).toNumber(), 6);

                            message += `\n\n1 ${tokenOut.symbol} = $${tokenUsdPrice}\n`;
                            message += `1 ${tokenIn.symbol} = ${bnbTokenPrice} ${tokenOut.symbol}`;
                        } else {
                            tokenUsdPrice = helpers.formatNumber(tokenOut.amountBN.times(wbnbPrice).div(tokenIn.amountBN).toNumber(), 3);
                            bnbTokenPrice = helpers.formatNumber(tokenIn.amountBN.div(tokenOut.amountBN).toNumber(), 6);

                            message += `\n\n1 ${tokenIn.symbol} = $${tokenUsdPrice}\n`;
                            message += `1 ${tokenOut.symbol} = ${bnbTokenPrice} ${tokenIn.symbol}`;
                        }

                        message += `</strong>\n\n<a href="https://bscscan.com/tx/${receipt.transactionHash}">View Transaction</a>`;

                        axios.get(`${telegramBaseUri}/sendMessage`, {
                            params: {
                                chat_id: config.telegramChatId,
                                parse_mode: 'HTML',
                                disable_web_page_preview: true,
                                disable_notification: true,
                                text: message,
                            },
                        })
                            .then((response) => {
                                const messageId = response.data.result.message_id;

                                const rand = Math.random();

                                let sticker = null;
                                if (isBuy && swapUsdPrice.toNumber() >= 25000) {
                                    sticker = memes.bog[Math.ceil(rand * memes.bog.length) - 1];
                                } else if (isBuy && swapUsdPrice.toNumber() >= 10000) {
                                    sticker = memes.chad[Math.ceil(rand * memes.chad.length) - 1];
                                } else if (!isBuy && swapUsdPrice.toNumber() >= 10000) {
                                    sticker = memes.brainlet[Math.ceil(rand * memes.brainlet.length) - 1];
                                }

                                if (!sticker) {
                                    return;
                                }

                                axios.get(`${telegramBaseUri}/sendSticker`, {
                                    params: {
                                        chat_id: config.telegramChatId,
                                        sticker,
                                        reply_to_message_id: messageId,
                                    },
                                })
                                    .catch((err) => {
                                        console.log('second request error');
                                        console.log(err.message);
                                        console.log(err.response ? err.response.data : '');
                                    });
                            })
                            .catch((err) => {
                                console.log('first request error');
                                console.log(err.message);
                                console.log(err.response ? err.response.data : '');
                            });
                    });
                });
            });
        });
    });
});
