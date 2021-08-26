const config = require('../config');
const axios = require('axios');

axios.get(`https://api.telegram.org/bot${config.telegramKey}/getUpdates`).then((response) => {
    console.log(response.data)
    console.log(response.data.result[response.data.result.length - 1].channel_post.sticker.file_id);
});
