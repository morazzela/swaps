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

const tokenAddress = ethers.utils.getAddress('0x0e09fabb73bd3ade0a17ecc321fd13a19e81ce82');
const provider = helpers.resolveProvider(process.env.NODE_URL);

routers.forEach((router) => {
    router.pairs.forEach((pair) => {
        const pairContract = new ethers.Contract(pair, pairAbi, provider);

        Promise.all([
            pairContract.token0(),
            pairContract.token1(),
        ]).then((tokens) => {
            pairContract.on('Swap', (sender, amount0In, amount1In, amount0Out, amount1Out, to, receipt) => {
                let amountIn = amount0In;
                if (amountIn.isZero()) {
                    amountIn = amount1In;
                }

                let amountOut = amount0Out;
                if (amountOut.isZero()) {
                    amountOut = amount1Out;
                }

                let tokenIn = !amount0In.isZero() && tokens[0] === tokenAddress
                    ? tokens[0]
                    : tokens[1];

                let tokenOut = !amount0Out.isZero() && tokens[0] === tokenAddress
                    ? tokens[0]
                    : tokens[1];

                tokenIn = new ethers.Contract(tokenIn, tokenAbi, provider);
                tokenOut = new ethers.Contract(tokenOut, tokenAbi, provider);

                Promise.all([
                    tokenIn.symbol(),
                    tokenIn.decimals(),
                    tokenOut.symbol(),
                    tokenOut.decimals(),
                ]).then((data) => {
                    tokenIn = {
                        address: tokenIn.address,
                        symbol: data[0],
                        amount: new BN(amountIn.toString()).div(new BN(10).pow(data[1])).toFixed(4),
                    };

                    tokenOut = {
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

                    message += `\n\n<a href="https://bscscan.com/tx/${receipt.transactionHash}">View Transaction</a>`;

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

                            let sticker = null;
                            if (isBuy && tokenOut.amount >= 5000) {
                                [sticker] = memes.chad;
                            } else if (!isBuy && tokenIn.amount >= 5000) {
                                [sticker] = memes.brainlet;
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
                            });
                        });
                });
            });
        });
    });
});
