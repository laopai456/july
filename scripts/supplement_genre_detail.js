const https = require('https');
const fs = require('fs');
const path = require('path');

const DATA_PATH = path.join(__dirname, '..', 'data.json');
const FALLBACK_GENRE = '情色';

function doubanGet(urlPath) {
  return new Promise((resolve, reject) => {
    const url = `https://movie.douban.com/j/${urlPath}`;
    https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0', 'Cookie': 'bid=genre_detail' } }, res => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => { try { resolve(JSON.parse(d)); } catch (e) { resolve({}); } });
    }).on('error', reject);
  });
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function applyDetail(item, subject) {
  let changed = false;
  if (subject.abstract && (!item.abstract || item.abstract.length < subject.abstract.length)) {
    item.abstract = subject.abstract;
    changed = true;
  }
  if (subject.directors && subject.directors.length > 0 && (!item.directors || item.directors.length === 0)) {
    item.directors = subject.directors.map(d => typeof d === 'string' ? d : d.name || '').filter(Boolean);
    changed = true;
  }
  if (subject.actors && subject.actors.length > 0 && (!item.casts || item.casts.length === 0)) {
    item.casts = subject.actors.slice(0, 5).map(a => typeof a === 'string' ? a : a.name || '').filter(Boolean);
    changed = true;
  }
  if (subject.types && subject.types.length > 0 && (!item.genres || item.genres.length === 0)) {
    item.genres = subject.types;
    changed = true;
  }
  if (subject.region && !item.region) {
    item.region = subject.region;
    changed = true;
  }
  return changed;
}

async function main() {
  console.log('========================================');
  console.log('情色数据详情补充（含TMDB来源）');
  console.log('========================================');

  const data = JSON.parse(fs.readFileSync(DATA_PATH, 'utf8'));
  const gi = data.genreIndex || {};
  const qs = gi['情色'] || {};
  const movies = qs.movie || [];

  let updated = 0;
  let fallback = 0;
  let skipped = 0;
  let failed = 0;

  for (let i = 0; i < movies.length; i++) {
    const item = movies[i];
    if (i > 0 && i % 20 === 0) {
      console.log(`  progress: ${i}/${movies.length} (updated:${updated} fallback:${fallback} failed:${failed})`);
    }

    const hasDetail = item.abstract && item.directors && item.directors.length > 0;
    const hasGenre = item.genres && item.genres.length > 0;
    if (hasDetail && hasGenre) {
      skipped++;
      continue;
    }

    const doubanId = String(item.doubanId || '');
    let matched = false;

    if (doubanId && !doubanId.startsWith('tmdb_')) {
      try {
        const abstract = await doubanGet('subject_abstract?subject_id=' + doubanId);
        if (abstract && abstract.subject) {
          if (applyDetail(item, abstract.subject)) {
            updated++;
            matched = true;
          }
        }
      } catch (e) {
        failed++;
      }
      await sleep(400);
    } else if (doubanId.startsWith('tmdb_')) {
      try {
        const title = item.title || '';
        const suggest = await doubanGet('subject_suggest?q=' + encodeURIComponent(title));
        if (suggest && suggest.length > 0) {
          const found = suggest.find(s => s.type === 'movie' || s.type === 'tv');
          if (found) {
            item.doubanId = found.id;
            item.cover = found.img || item.cover;
            item.rate = found.rate || item.rate;
            await sleep(400);

            const abstract = await doubanGet('subject_abstract?subject_id=' + found.id);
            if (abstract && abstract.subject) {
              if (applyDetail(item, abstract.subject)) {
                updated++;
                matched = true;
              }
            }
          }
        }
      } catch (e) {
        failed++;
      }
      await sleep(400);
    }

    if (!matched && (!item.genres || item.genres.length === 0)) {
      item.genres = [FALLBACK_GENRE];
      fallback++;
    }
  }

  console.log(`\n  done: updated=${updated} fallback=${fallback} skipped=${skipped} failed=${failed}`);

  fs.writeFileSync(DATA_PATH, JSON.stringify(data, null, 2), 'utf8');
  console.log(`\nsaved! total ${movies.length} items processed`);
  console.log('========================================');
}

main().catch(e => { console.error(e); process.exit(1); });
