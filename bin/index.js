const path = require('path');
const dotenv = require('dotenv');
const waterfall = require('async/waterfall');
const BN = require('decimal.js');
const axios = require('axios');
const { ethers } = require('ethers');
const tokenAbi = require('../abis/token.json');
const routers = require('./routers');
const helpers = require('./helpers');

dotenv.config({
    path: path.resolve(__dirname, '../.env'),
});

const tokenAddress = process.env.TOKEN_ADDRESS;
const provider = helpers.resolveProvider(process.env.NODE_URL);

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
                .then((receipt) => (receipt.status === 0 ? cb(true) : cb(null, receipt)))
                .catch(() => cb(true));
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

            message += `\n\nmethod : ${method.name}`;

            message += `\n\n<a href="https://bscscan.com/tx/${hash}">View Tx : ${hash.substr(0, 12)}...</a>`;

            cb(null, message);
        },
        (message, cb) => {
            axios.get(`https://api.telegram.org/bot${process.env.TELEGRAM_KEY}/sendMessage`, {
                params: {
                    chat_id: process.env.TELEGRAM_CHAT_ID,
                    parse_mode: 'HTML',
                    text: message,
                    disable_web_page_preview: true,
                    disable_notification: true,
                },
            })
                .then(() => cb())
                .catch((err) => cb(err.response.data));
        },
    ], (err) => {
        if (err) {
            console.log(err.message);
            process.exit(1);
        }
    });
}));
