const axios = require('axios');
const ID = process.argv[2] || '36611019';

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept': 'application/json, text/plain, */*',
  'Accept-Language': 'zh-CN,zh;q=0.9',
  'Origin': 'https://m.douban.com',
  'Referer': 'https://m.douban.com/'
};

const MOBILE_UA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1';

const endpoints = [
  { name: 'rexxar tv', url: `https://m.douban.com/rexxar/api/v2/tv/${ID}`, headers: { ...HEADERS, 'User-Agent': MOBILE_UA } },
  { name: 'rexxar movie', url: `https://m.douban.com/rexxar/api/v2/movie/${ID}`, headers: { ...HEADERS, 'User-Agent': MOBILE_UA } },
  { name: 'rexxar subject', url: `https://m.douban.com/rexxar/api/v2/subject/${ID}`, headers: { ...HEADERS, 'User-Agent': MOBILE_UA } },
  { name: 'j/subject_detail', url: `https://movie.douban.com/j/subject_detail`, headers: HEADERS, params: { subject_id: ID } },
  { name: 'subject page', url: `https://movie.douban.com/subject/${ID}/`, headers: { ...HEADERS, Accept: 'text/html' } },
  { name: 'm.douban subject', url: `https://m.douban.com/subject/${ID}/`, headers: { ...HEADERS, Accept: 'text/html', 'User-Agent': MOBILE_UA } },
];

async function test() {
  console.log('测试豆瓣 ID: ' + ID + '\n');

  for (const ep of endpoints) {
    try {
      const res = await axios.get(ep.url, {
        headers: ep.headers,
        params: ep.params,
        timeout: 10000,
        validateStatus: () => true
      });

      const status = res.status;
      const type = typeof res.data;
      let preview = '';

      if (typeof res.data === 'string') {
        const s = res.data;
        preview = s.substring(0, 200);
        const hasSummary = s.includes('summary') || s.includes('v:summary');
        console.log(`[${ep.name}] status=${status} type=html len=${s.length} hasSummary=${hasSummary}`);
        if (hasSummary) {
          const m1 = s.match(/<span\s+property="v:summary"[^>]*>([\s\S]*?)<\/span>/);
          const m2 = s.match(/"summary"\s*:\s*"([^"]{10,})"/);
          if (m1) console.log('  => v:summary: ' + m1[1].replace(/<[^>]+>/g, '').trim().substring(0, 100));
          if (m2) console.log('  => json summary: ' + m2[1].substring(0, 100));
        }
      } else if (typeof res.data === 'object') {
        const keys = Object.keys(res.data);
        preview = JSON.stringify(res.data).substring(0, 200);
        console.log(`[${ep.name}] status=${status} type=json keys=[${keys.join(',')}]`);

        if (res.data.summary) {
          console.log('  => summary: ' + res.data.summary.substring(0, 100));
        }
        if (res.data.subject) {
          const subj = res.data.subject;
          console.log('  => subject keys: ' + Object.keys(subj).join(', '));
          if (subj.summary) console.log('  => subject.summary: ' + subj.summary.substring(0, 100));
          if (subj.abstract) console.log('  => subject.abstract: ' + subj.abstract.substring(0, 100));
          if (subj.desc) console.log('  => subject.desc: ' + subj.desc.substring(0, 100));
          if (subj.intro) console.log('  => subject.intro: ' + subj.intro.substring(0, 100));
        }
        if (res.data.data) {
          const d = res.data.data;
          console.log('  => data keys: ' + Object.keys(d).join(', '));
          if (d.summary) console.log('  => data.summary: ' + d.summary.substring(0, 100));
        }
      }

      if (status === 404) console.log('  => 404, endpoint does not exist');
      if (status === 403) console.log('  => 403, forbidden');
      if (status === 302) console.log('  => 302 redirect');

    } catch (e) {
      console.log(`[${ep.name}] ERROR: ${e.message}`);
    }
    console.log('');
  }
}

test();
