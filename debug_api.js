const axios = require('axios');

async function debug() {
    try {
        const url = "https://gamma-api.polymarket.com/events?limit=1&active=true&closed=false&order=volume:desc";
        const res = await axios.get(url);
        console.log(JSON.stringify(res.data[0], null, 2));
    } catch (e) {
        console.error(e);
    }
}
debug();
