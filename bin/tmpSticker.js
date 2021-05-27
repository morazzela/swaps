const path = require('path');
const dotenv = require('dotenv');
const axios = require('axios');

dotenv.config({
    path: path.resolve(__dirname, '../.env'),
});

axios.get(`https://api.telegram.org/bot${process.env.TELEGRAM_KEY}/getUpdates`).then((response) => {
    console.log(response.data.result[response.data.result.length - 1].channel_post.sticker.file_id);
});
