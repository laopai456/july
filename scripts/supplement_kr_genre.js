const https = require('https');
const fs = require('fs');
const path = require('path');

const DATA_PATH = path.join(__dirname, '..', 'data.json');

function doubanGet(urlPath) {
  return new Promise((resolve, reject) => {
    https.get(`https://movie.douban.com/j/${urlPath}`, { headers: { 'User-Agent': 'Mozilla/5.0', 'Cookie': 'bid=kr_sup2' } }, res => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => { try { resolve(JSON.parse(d)); } catch (e) { resolve([]); } });
    }).on('error', reject);
  });
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

const SUPPLEMENT = [
  { title: '\u971c\u82b1\u5e97', year: 2008 },
  { title: '\u5973\u4ec6', year: 2010 },
  { title: '\u6f02\u6d41\u6b32\u5ba4', year: 2000 },
  { title: '\u91d1\u94b1\u7684\u5473\u9053', year: 2012 },
  { title: '\u4eba\u95f4\u4e2d\u6bd2', year: 2014 },
  { title: '\u7ea2\u5b57', year: 2004 },
  { title: '\u7f8e\u4eba\u56fe', year: 2008 },
  { title: '\u65b9\u5b50\u4f20', year: 2010 },
  { title: '\u4e11\u95fb', year: 2003 },
  { title: '\u7537\u4e0e\u5973', year: 2016 },
  { title: '\u5feb\u4e50\u5230\u6b7b', year: 1999 },
  { title: 'B.E.D', year: 2012 },
  { title: '\u8c0e\u8a00', year: 2000 },
  { title: '\u597d\u5f8b\u5e08\u7684\u592a\u592a\u4eec', year: 2000 },
  { title: '\u7eaf\u60c5', year: 2015 },
  { title: '\u90a3\u5e74\u590f\u5929', year: 2006 },
  { title: '\u6734\u70c8', year: 2017 },
  { title: '\u6b32\u671b', year: 2010 },
  { title: '\u6df1\u591c\u7684\u53f0\u98ce', year: 2011 },
  { title: '\u4e0d\u4f26\u4e4b\u604b', year: 2010 },
];

async function main() {
  console.log('========================================');
  console.log('Korean erotic supplement via Douban search');
  console.log('========================================');

  const data = JSON.parse(fs.readFileSync(DATA_PATH, 'utf8'));
  const gi = data.genreIndex || {};
  const qs = gi['情色'] || { movie: [], drama: [] };
  const existingIds = new Set();
  for (const item of [...(qs.movie || []), ...(qs.drama || [])]) {
    if (item.doubanId) existingIds.add(String(item.doubanId));
  }

  let added = 0;
  for (const s of SUPPLEMENT) {
    try {
      const suggest = await doubanGet(`subject_suggest?q=${encodeURIComponent(s.title)}`);
      let found = null;
      if (suggest && suggest.length > 0) {
        for (const item of suggest) {
          if (item.type === 'movie' || item.type === 'tv') {
            const y = parseInt(item.year) || 0;
            if (Math.abs(y - s.year) <= 2) { found = item; break; }
          }
        }
        if (!found) {
          for (const item of suggest) {
            if (item.type === 'movie' || item.type === 'tv') { found = item; break; }
          }
        }
      }

      if (!found) {
        console.log(`  [MISS] ${s.title}`);
        await sleep(500);
        continue;
      }

      if (existingIds.has(String(found.id))) {
        console.log(`  [EXISTS] ${s.title} -> ${found.title}`);
        await sleep(300);
        continue;
      }

      let region = '';
      let abstract = '';
      let types = [];
      try {
        const ab = await doubanGet(`subject_abstract?subject_id=${found.id}`);
        if (ab && ab.subject) {
          region = ab.subject.region || '';
          abstract = ab.subject.abstract || '';
          types = ab.subject.types || [];
        }
      } catch (e) { }

      if (['中国大陆', '中国香港', '中国台湾'].some(r => region.includes(r))) {
        console.log(`  [BLOCKED] ${s.title} -> ${region}`);
        await sleep(300);
        continue;
      }

      const rate = parseFloat(found.rate) || 0;
      const hotScore = Math.round(rate * 10 + 150);

      qs.movie.push({
        doubanId: found.id,
        title: found.title,
        rate: found.rate || '0',
        year: found.year || '',
        cover: found.img || '',
        directors: [],
        casts: [],
        genres: types,
        abstract,
        region,
        hotScore,
        supplement: true,
      });
      existingIds.add(String(found.id));
      added++;
      console.log(`  [ADD] ${s.title} -> ${found.title} (${found.year}) ${rate} ${region}`);
    } catch (e) {
      console.log(`  [ERR] ${s.title}: ${e.message}`);
    }
    await sleep(500);
  }

  qs.movie.sort((a, b) => (b.hotScore || 0) - (a.hotScore || 0));
  gi['情色'] = qs;
  data.genreIndex = gi;
  fs.writeFileSync(DATA_PATH, JSON.stringify(data, null, 2), 'utf8');

  const krTotal = qs.movie.filter(i => (i.region && i.region.includes('韩国')) || i.supplement).length;
  console.log(`\nAdded ${added}, total ${qs.movie.length} movies, KR-related: ${krTotal}`);
  console.log('========================================');
}

main().catch(e => { console.error(e); process.exit(1); });
