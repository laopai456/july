const axios = require('axios');
const { getHeaders } = require('./lib/douban');

async function test() {
  const url = 'https://movie.douban.com/subject/35267232/';
  console.log('Testing:', url);

  try {
    const response = await axios.get(url, {
      headers: { ...getHeaders(), 'Accept': 'text/html' },
      timeout: 15000,
      validateStatus: () => true
    });

    console.log('status:', response.status, 'len:', response.data.length);
    const h = response.data;

    let i = 0;
    let found = 0;
    while ((i = h.indexOf('summary', i)) !== -1) {
      console.log('POS', i, JSON.stringify(h.substring(Math.max(0, i - 40), i + 60)));
      i++;
      found++;
    }
    if (found === 0) console.log('no "summary" found');

    console.log('\nfirst 500:', h.substring(0, 500));
    console.log('\nlast 500:', h.substring(h.length - 500));
  } catch (e) {
    console.error('Error:', e.message);
  }
}

test();
