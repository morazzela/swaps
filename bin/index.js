const path = require('path');
const dotenv = require('dotenv');
const { ethers } = require('ethers');
const BN = require('decimal.js');
const axios = require('axios');
const helpers = require('./helpers');
const routers = require('./routers');
const pairAbi = require('../abis/pair.json');
const tokenAbi = require('../abis/token.json');
const memes = require('../memes.json');

dotenv.config({
    path: path.resolve(__dirname, '../.env'),
});

const telegramBaseUri = `https://api.telegram.org/bot${process.env.TELEGRAM_KEY}`;

const provider = helpers.resolveProvider(process.env.NODE_URL);
const tokenAddress = ethers.utils.getAddress('0xacd7b3d9c10e97d0efa418903c0c7669e702e4c0');
// const tokenAddress = ethers.utils.getAddress('0x0e09fabb73bd3ade0a17ecc321fd13a19e81ce82');
const usdPair = new ethers.Contract('0x58F876857a02D6762E0101bb5C46A8c1ED44Dc16', pairAbi, provider);

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
                        amount: new BN(amountIn.toString()).div(new BN(10).pow(data[1])).toFixed(4),
                    };

                    tokenOut = {
                        contract: tokenOut,
                        address: tokenOut.address,
                        symbol: data[2],
                        amount: new BN(amountOut.toString()).div(new BN(10).pow(data[3])).toFixed(4),
                    };

                    const isBuy = tokenOut.address === tokenAddress;

                    let message = null;
                    if (isBuy) {
                        message = `🚀 Bought <strong>${tokenOut.amount} ${tokenOut.symbol}</strong> for <strong>${tokenIn.amount} ${tokenIn.symbol}</strong>`;
                    } else {
                        message = `👹 Sold <strong>${tokenIn.amount} ${tokenIn.symbol}</strong> for <strong>${tokenOut.amount} ${tokenOut.symbol}</strong>`;
                    }

                    message += ` on ${router.name}\n\n`;

                    const nbDots = Math.ceil((isBuy ? tokenOut.amount : tokenIn.amount) / 200);
                    for (let i = 0; i < nbDots; i += 1) {
                        message += isBuy ? '🟢' : '🔴';
                    }

                    usdPair.getReserves().then((reserves) => {
                        const wbnbPrice = reserves[1] / reserves[0];

                        let tokenUsdPrice = 0;
                        let tokenBnbPrice = 0;
                        message += '<strong>';
                        if (isBuy) {
                            tokenUsdPrice = new BN((tokenIn.amount * wbnbPrice) / tokenOut.amount).toFixed(3);
                            tokenBnbPrice = new BN(tokenIn.amount / tokenOut.amount).toFixed(6);

                            message += `\n\n1 ${tokenOut.symbol} = ${tokenUsdPrice} USD\n`;
                            message += `1 ${tokenOut.symbol} = ${tokenBnbPrice} ${tokenIn.symbol}`;
                        } else {
                            tokenUsdPrice = new BN((tokenOut.amount * wbnbPrice) / tokenIn.amount).toFixed(3);
                            tokenBnbPrice = new BN(tokenOut.amount / tokenIn.amount).toFixed(6);

                            message += `\n\n1 ${tokenIn.symbol} = ${tokenUsdPrice} USD\n`;
                            message += `1 ${tokenIn.symbol} = ${tokenBnbPrice} ${tokenOut.symbol}`;
                        }

                        message += `</strong>\n\n<a href="https://bscscan.com/tx/${receipt.transactionHash}">View Transaction</a>`;

                        axios.get(`${telegramBaseUri}/sendMessage`, {
                            params: {
                                chat_id: process.env.TELEGRAM_CHAT_ID,
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
                                if (isBuy && tokenOut.amount >= 5000) {
                                    sticker = memes.chad[Math.ceil(rand * memes.chad.length) - 1];
                                } else if (!isBuy && tokenIn.amount >= 5000) {
                                    sticker = memes.brainlet[Math.ceil(rand * memes.brainlet.length) - 1];
                                }

                                if (sticker === null) {
                                    return;
                                }

                                axios.get(`${telegramBaseUri}/sendSticker`, {
                                    params: {
                                        chat_id: process.env.TELEGRAM_CHAT_ID,
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
