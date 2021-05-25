const PancakeSwapV1 = require('./PancakeSwapV1');
const PancakeSwapV2 = require('./PancakeSwapV2');

module.exports = {
    [PancakeSwapV1.address]: PancakeSwapV1,
    [PancakeSwapV2.address]: PancakeSwapV2,
};
