const path = require('path');
const dotenv = require('dotenv');
const waterfall = require('async/waterfall');
const BN = require('decimal.js');
const axios = require('axios');
const { ethers } = require('ethers');
const tokenAbi = require('../abis/token.json');
const routers = require('./routers');
const helpers = require('./helpers');
const memes = require('../memes.json');

dotenv.config({
    path: path.resolve(__dirname, '../.env'),
});

const debugMode = Boolean(process.env.DEBUG) || process.env.DEBUG === 'true';
const enableMemes = Boolean(process.env.ENABLE_MEMES) || process.env.ENABLE_MEMES === 'true';
const chadMinBuy = Number.parseInt(process.env.CHAD_MIN_BUY || -1);
const brainletMinSell = Number.parseInt(process.env.BRAINLET_MIN_SELL || -1);
const tokenAddress = process.env.TOKEN_ADDRESS;
const provider = helpers.resolveProvider(process.env.NODE_URL);
const baseUri = `https://api.telegram.org/bot${process.env.TELEGRAM_KEY}`;

// axios.get(`${baseUri}/getUpdates`).then((response) => {
//     console.log(response.data.result[response.data.result.length - 1].channel_post.sticker);
//     process.exit(0)
// })

// return;

provider.on('pending', (hash) => provider.getTransaction(hash).then((tx) => {
    if (tx === null || tx.to === null || routers[tx.to] === undefined) {
        return;
    }

    const router = routers[tx.to];
    const methodId = tx.data.substr(0, 10);

    if (router.methods[methodId] === undefined) {
        return;
    }

    const method = router.methods[methodId];
    const params = tx.data.substr(10).match(/.{64}/g);

    let tokenPath = method.path(params);

    try {
        tokenPath = tokenPath.map((token) => ethers.utils.getAddress(token));
    } catch {
        return;
    }

    if (tokenPath[0] !== tokenAddress && tokenPath[tokenPath.length - 1] !== tokenAddress) {
        return;
    }

    const tokenIn = new ethers.Contract(tokenPath[0], tokenAbi, provider);
    const tokenOut = new ethers.Contract(tokenPath[tokenPath.length - 1], tokenAbi, provider);

    waterfall([
        (cb) => {
            tx.wait()
                .then((receipt) => (receipt.status === 0 ? cb("receipt is 0") : cb(null, receipt)))
                .catch((err) => cb(err));
        },
        (receipt, cb) => {
            method.amounts(receipt).then((result) => cb(null, result));
        },
        ({ amountIn, amountOut }, cb) => {
            Promise.all([
                tokenIn.symbol(),
                tokenIn.decimals().then((decimals) => new BN(10).pow(decimals)),
                tokenOut.symbol(),
                tokenOut.decimals().then((decimals) => new BN(10).pow(decimals)),
            ]).then((data) => {
                cb(null, {
                    input: {
                        address: tokenIn.address,
                        symbol: data[0],
                        amount: new BN(amountIn).div(data[1]),
                    },
                    output: {
                        address: tokenOut.address,
                        symbol: data[2],
                        amount: new BN(amountOut).div(data[3]),
                    },
                });
            });
        },
        (data, cb) => {
            const { input, output } = data;
            const isBuy = output.address === tokenAddress;

            let nbDots = isBuy
                ? output.amount / process.env.DOT_AMOUNT
                : input.amount / process.env.DOT_AMOUNT;

            nbDots = Math.ceil(nbDots);

            let message = '';
            if (isBuy) {
                message += `🚀 Bought <strong>${output.amount.toFixed()} ${output.symbol}</strong> for <strong>${input.amount.toFixed()} ${input.symbol}</strong> on ${router.name}\n\n`;
            } else {
                message += `👹 Sold <strong>${input.amount.toFixed()} ${input.symbol}</strong> for <strong>${output.amount.toFixed()} ${output.symbol}</strong> on ${router.name}\n\n`;
            }

            for (let i = 0; i < nbDots; i += 1) {
                message += isBuy ? '🟢' : '🔴';
            }

            const inOutPrice = input.amount.div(output.amount);
            const outInPrice = output.amount.div(input.amount);

            if (isBuy) {
                message += `\n\n<strong>1 ${output.symbol} = ${inOutPrice} ${input.symbol}</strong>`;
                message += `\n<strong>1 ${input.symbol} = ${outInPrice} ${output.symbol}</strong>`;
            } else {
                message += `\n\n<strong>1 ${input.symbol} = ${inOutPrice} ${output.symbol}</strong>`;
                message += `\n<strong>1 ${output.symbol} = ${outInPrice} ${input.symbol}</strong>`;
            }

            if (debugMode) {
                message += `\n\nmethod : ${method.name}`;
            }

            message += `\n\n<a href="https://bscscan.com/tx/${hash}">View Tx</a>`;

            cb(null, { isBuy, input, output, message });
        },
        ({ isBuy, input, output, message }, cb) => {
            const onceCb = helpers.once(cb);

            axios.get(`${baseUri}/sendMessage`, {
                params: {
                    chat_id: process.env.TELEGRAM_CHAT_ID,
                    parse_mode: 'HTML',
                    text: message,
                    disable_web_page_preview: true,
                    disable_notification: true,
                },
            })
                .then((response) => onceCb(null, { isBuy, input, output, messageId: response.data.result.message_id }))
                .catch((err) => onceCb(err.response ? err.response.data : err));
        },
        ({ isBuy, input, output, messageId }, cb) => {
            if (enableMemes === false) {
                return cb();
            }

            let fileId = null;
            if (isBuy && output.amount > chadMinBuy) {
                fileId = memes['chad'][0];
            }

            if (!isBuy && input.amount > brainletMinSell) {
                fileId = memes['brainlet'][0];
            }

            if (fileId === null) {
                return cb();
            }

            axios.get(`${baseUri}/sendSticker`, {
                params: {
                    chat_id: process.env.TELEGRAM_CHAT_ID,
                    sticker: fileId,
                    reply_to_message_id: messageId
                }
            })
                .then(() => cb())
                .catch((err) => cb(err));
        },
    ], (err) => {
        if (err) {
            console.log('error1', err.response ? err.response : null)
            console.log('error2', err.message ? err.message : err);
        }
    });
}));
