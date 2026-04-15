const axios = require('axios');

const MOVIE_ID = '35267208';

async function test() {
  console.log('=== 测试移动版 m.douban.com 电影页面 ===');
  console.log('ID:', MOVIE_ID, '(流浪地球2)\n');

  const mobileHeaders = {
    'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1',
    'Accept': 'text/html',
    'Referer': 'https://m.douban.com/'
  };

  try {
    const r = await axios.get('https://m.douban.com/subject/' + MOVIE_ID + '/', {
      headers: mobileHeaders,
      timeout: 15000,
      validateStatus: () => true
    });
    console.log('status:', r.status, 'len:', r.data.length);
    const h = r.data;

    const keywords = ['summary', '简介', '剧情', 'abstract', 'description', 'v:summary', 'intro'];
    for (const kw of keywords) {
      let i = 0, found = 0;
      while ((i = h.indexOf(kw, i)) !== -1) {
        console.log('[' + kw + '] POS', i, JSON.stringify(h.substring(Math.max(0, i - 50), i + 80)));
        i++;
        found++;
      }
      if (found === 0) console.log('[' + kw + '] not found');
    }

    console.log('\n--- first 800 ---');
    console.log(h.substring(0, 800));
  } catch (e) {
    console.error('Error:', e.message);
  }

  console.log('\n\n=== 测试 rexxar API ===');
  const rexxarUrls = [
    'https://m.douban.com/rexxar/api/v2/movie/' + MOVIE_ID,
    'https://m.douban.com/rexxar/api/v2/tv/' + MOVIE_ID,
    'https://m.douban.com/rexxar/api/v2/subject/' + MOVIE_ID
  ];

  for (const url of rexxarUrls) {
    try {
      const r = await axios.get(url, {
        headers: { ...mobileHeaders, 'Accept': 'application/json' },
        timeout: 10000,
        validateStatus: () => true
      });
      console.log('\n' + url);
      console.log('status:', r.status);
      if (r.status === 200 && typeof r.data === 'object') {
        const keys = Object.keys(r.data);
        console.log('keys:', keys.join(', '));
        if (r.data.intro || r.data.summary || r.data.description || r.data.abstract) {
          console.log('FOUND summary/intro/description/abstract');
        }
        const preview = JSON.stringify(r.data).substring(0, 500);
        console.log('preview:', preview);
      }
    } catch (e) {
      console.log(url, '-> error:', e.message);
    }
  }
}

test();
