const { ethers } = require('ethers');

module.exports = {
    resolveProvider: (url) => {
        if (url.substr(-4) === '.ipc') {
            return new ethers.providers.IpcProvider(url);
        }

        if (url.match(/wss?:\/\//g)) {
            return new ethers.providers.WebSocketProvider(url);
        }

        if (url.match(/https?:\/\//g)) {
            return new ethers.providers.JsonRpcProvider(url);
        }

        throw new Error("Can't resolve provider");
    },
    once(func) {
        let done = false;
        /* eslint-disable func-names */
        return function () {
            if (done === false) {
                done = true;
                /* eslint-disable prefer-rest-params */
                func.apply(this, arguments);
            }
        };
    },
    formatNumber(number) {
        return new Intl.NumberFormat('en-US').format(number);
    },
};
