const https = require('https');
const fs = require('fs');
const path = require('path');

const DATA_PATH = path.join(__dirname, '..', 'data.json');

function doubanGet(urlPath) {
  return new Promise((resolve, reject) => {
    const url = `https://movie.douban.com/j/${urlPath}`;
    https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0', 'Cookie': 'bid=tmdb_detail' } }, res => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => { try { resolve(JSON.parse(d)); } catch (e) { resolve({}); } });
    }).on('error', reject);
  });
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function main() {
  console.log('========================================');
  console.log('情色数据详情补充');
  console.log('========================================');

  const data = JSON.parse(fs.readFileSync(DATA_PATH, 'utf8'));
  const gi = data.genreIndex || {};
  const qs = gi['情色'] || {};
  const movies = qs.movie || [];

  let updated = 0;
  let failed = 0;

  for (let i = 0; i < movies.length; i++) {
    const item = movies[i];
    if (i > 0 && i % 20 === 0) {
      console.log(`  progress: ${i}/${movies.length} (updated:${updated})`);
    }

    if (item.abstract && item.directors && item.directors.length > 0) continue;

    const doubanId = item.doubanId;
    if (!doubanId || String(doubanId).startsWith('tmdb_')) continue;

    try {
      const abstract = await doubanGet(`subject_abstract?subject_id=${doubanId}`);
      if (abstract && abstract.subject) {
        const s = abstract.subject;
        if (s.abstract) item.abstract = s.abstract;
        if (s.directors && s.directors.length > 0) {
          item.directors = s.directors.map(d => typeof d === 'string' ? d : d.name || '').filter(Boolean);
        }
        if (s.actors && s.actors.length > 0) {
          item.casts = s.actors.slice(0, 5).map(a => typeof a === 'string' ? a : a.name || '').filter(Boolean);
        }
        if (s.types && s.types.length > 0) {
          item.genres = s.types;
        }
        if (s.region) item.region = s.region;
        updated++;
      }
    } catch (e) {
      failed++;
    }

    await sleep(400);
  }

  console.log(`  done: updated=${updated} failed=${failed}`);

  fs.writeFileSync(DATA_PATH, JSON.stringify(data, null, 2), 'utf8');
  console.log(`\nsaved! updated ${updated} items`);
  console.log('========================================');
}

main().catch(e => { console.error(e); process.exit(1); });
