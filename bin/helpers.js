const { ethers } = require('ethers');

module.exports = {
    resolveProvider: (url) => {
        if (url.substr(-4) === '.ipc') {
            return new ethers.providers.IpcProvider(url);
        }

        if (url.match(/^wss?:\/\//)) {
            return new ethers.providers.WebSocketProvider(url);
        }

        if (url.match(/^https?:\/\//)) {
            return new ethers.providers.JsonRpcProvider(url);
        }

        throw new Error("Can't resolve provider");
    },
    formatNumber(number, precision = 2) {
        return new Intl.NumberFormat('en-US', {
            maximumFractionDigits: precision,
        }).format(number);
    },
};
