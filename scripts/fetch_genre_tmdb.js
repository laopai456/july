const https = require('https');
const fs = require('fs');
const path = require('path');

const DATA_PATH = path.join(__dirname, '..', 'data.json');
const TMDB_RAW_PATH = path.join(__dirname, '..', 'tmdb_raw.json');
const BLOCKED_REGIONS = ['中国大陆', '中国香港', '中国台湾'];

function doubanGet(urlPath) {
  return new Promise((resolve, reject) => {
    const url = `https://movie.douban.com/j/${urlPath}`;
    https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0', 'Cookie': 'bid=tmdb_supplement' } }, res => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => { try { resolve(JSON.parse(d)); } catch (e) { resolve([]); } });
    }).on('error', reject);
  });
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function matchDouban(tmdbMovies) {
  console.log(`[douban] matching ${tmdbMovies.length} movies`);
  const results = [];
  let matched = 0;
  let blocked = 0;

  for (let i = 0; i < tmdbMovies.length; i++) {
    const m = tmdbMovies[i];
    const searchTerm = m.originalTitle || m.title;

    if (i > 0 && i % 20 === 0) {
      console.log(`  progress: ${i}/${tmdbMovies.length} (matched:${matched} blocked:${blocked})`);
    }

    try {
      let found = null;
      const suggest = await doubanGet(`subject_suggest?q=${encodeURIComponent(searchTerm)}`);
      if (suggest && suggest.length > 0) {
        for (const s of suggest) {
          if (s.type === 'movie' || s.type === 'tv') { found = s; break; }
        }
      }

      if (!found && m.title !== m.originalTitle) {
        await sleep(500);
        const suggest2 = await doubanGet(`subject_suggest?q=${encodeURIComponent(m.title)}`);
        if (suggest2 && suggest2.length > 0) {
          for (const s of suggest2) {
            if (s.type === 'movie' || s.type === 'tv') { found = s; break; }
          }
        }
      }

      if (found) {
        let region = '';
        try {
          const abstract = await doubanGet(`subject_abstract?subject_id=${found.id}`);
          region = abstract?.subject?.region || '';
        } catch (e) { }

        if (BLOCKED_REGIONS.some(r => region.includes(r))) {
          blocked++;
          await sleep(300);
          continue;
        }

        results.push({
          doubanId: found.id,
          title: found.title,
          rate: found.rate || '0',
          year: found.year || String(m.year),
          cover: found.img || m.poster,
          directors: [],
          casts: [],
          genres: [],
          abstract: '',
          region,
          hotScore: m.voteCount,
          tmdbSource: m.source,
        });
        matched++;
      } else {
        results.push({
          doubanId: `tmdb_${m.tmdbId}`,
          title: m.title,
          rate: m.rating,
          year: String(m.year),
          cover: m.poster,
          directors: [],
          casts: [],
          genres: [],
          abstract: '',
          region: '',
          hotScore: m.voteCount,
          tmdbSource: m.source,
        });
        matched++;
      }
    } catch (e) {
      console.log(`  fail: ${searchTerm} - ${e.message}`);
    }

    await sleep(500);
  }

  console.log(`  done: matched=${matched} blocked=${blocked} total=${results.length}`);
  return results;
}

function mergeToDataJson(newItems) {
  const data = JSON.parse(fs.readFileSync(DATA_PATH, 'utf8'));
  const gi = data.genreIndex || {};
  const existing = gi['情色'] || { movie: [], drama: [] };

  const existingIds = new Set();
  for (const item of [...(existing.movie || []), ...(existing.drama || [])]) {
    if (item.doubanId) existingIds.add(String(item.doubanId));
  }

  let added = 0;
  for (const item of newItems) {
    if (existingIds.has(String(item.doubanId))) continue;
    existingIds.add(String(item.doubanId));
    (existing.movie = existing.movie || []).push(item);
    added++;
  }

  existing.movie.sort((a, b) => (b.hotScore || 0) - (a.hotScore || 0));
  gi['情色'] = existing;
  data.genreIndex = gi;

  fs.writeFileSync(DATA_PATH, JSON.stringify(data, null, 2), 'utf8');
  console.log(`\nmerged: +${added}, total movie=${existing.movie.length}`);
  return { added, total: existing.movie.length };
}

async function main() {
  console.log('========================================');
  console.log('TMDB -> Douban match + merge');
  console.log('========================================');

  if (!fs.existsSync(TMDB_RAW_PATH)) {
    console.error('tmdb_raw.json not found. Run fetch_tmdb.ps1 first.');
    process.exit(1);
  }

  const raw = fs.readFileSync(TMDB_RAW_PATH, 'utf8').replace(/^\uFEFF/, '');
  const tmdbMovies = JSON.parse(raw);
  console.log(`loaded ${tmdbMovies.length} movies from tmdb_raw.json`);

  const matched = await matchDouban(tmdbMovies);
  const result = mergeToDataJson(matched);

  console.log('\n========================================');
  console.log(`done! +${result.added} new, total ${result.total} movies`);
  console.log('========================================');
}

main().catch(e => { console.error(e); process.exit(1); });
