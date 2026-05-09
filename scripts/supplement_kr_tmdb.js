const https = require('https');
const fs = require('fs');
const path = require('path');
const { safeWriteData, DATA_PATH } = require('./lib/safe_write');
const TMDB_KEY = '96ac6a609d077c2d49da61e620697ea7';

const SUPPLEMENT = [
  { en: 'A Frozen Flower', zh: '\u971c\u82b1\u5e97', year: 2008 },
  { en: 'The Housemaid', zh: '\u5973\u4ec6', year: 2010 },
  { en: 'The Isle', zh: '\u6f02\u6d41\u6b32\u5ba4', year: 2000 },
  { en: 'The Taste of Money', zh: '\u91d1\u94b1\u7684\u5473\u9053', year: 2012 },
  { en: 'Obsessed', zh: '\u4eba\u95f4\u4e2d\u6bd2', year: 2014 },
  { en: 'The Scarlet Letter', zh: '\u7ea2\u5b57', year: 2004 },
  { en: 'Portrait of a Beauty', zh: '\u7f8e\u4eba\u56fe', year: 2008 },
  { en: 'The Servant', zh: '\u65b9\u5b50\u4f20', year: 2010 },
  { en: 'Untold Scandal', zh: '\u4e11\u95fb', year: 2003 },
  { en: 'A Man and a Woman', zh: '\u7537\u4e0e\u5973', year: 2016 },
  { en: 'Happy End', zh: '\u5feb\u4e50\u5230\u6b7b', year: 1999 },
  { en: 'B.E.D', zh: 'B.E.D', year: 2012 },
  { en: 'Green Chair', zh: '\u7eff\u8272\u6905\u5b50', year: 2005 },
  { en: 'Lie', zh: '\u8c0e\u8a00', year: 2000 },
  { en: 'April Snow', zh: '\u5916\u51fa', year: 2005 },
  { en: 'Natalie', zh: '\u5a1c\u5854\u8389', year: 2010 },
  { en: 'Scarlet Innocence', zh: '\u9a6c\u4e39\u7c2a', year: 2014 },
  { en: 'Too Young to Die', zh: '\u6b7b\u4e5f\u65e0\u59a8', year: 2008 },
  { en: 'Sad Movie', zh: '\u60b2\u4f24\u7535\u5f71', year: 2005 },
  { en: 'Love', zh: '\u7231', year: 2007 },
];

function tmdbGet(urlPath) {
  return new Promise((resolve, reject) => {
    https.get(`https://api.themoviedb.org/3${urlPath}`, res => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => { try { resolve(JSON.parse(d)); } catch (e) { resolve({}); } });
    }).on('error', reject);
  });
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function main() {
  console.log('========================================');
  console.log('Korean supplement via TMDB');
  console.log('========================================');

  const data = JSON.parse(fs.readFileSync(DATA_PATH, 'utf8'));
  const gi = data.genreIndex || {};
  const qs = gi['\u60c5\u8272'] || { movie: [], drama: [] };
  const existingIds = new Set();
  for (const item of [...(qs.movie || []), ...(qs.drama || [])]) {
    if (item.doubanId) existingIds.add(String(item.doubanId));
  }

  let added = 0;

  for (const m of SUPPLEMENT) {
    try {
      const url = `/search/movie?api_key=${TMDB_KEY}&language=ko-KR&query=${encodeURIComponent(m.en)}&include_adult=true&page=1`;
      const r = await tmdbGet(url);

      let found = null;
      if (r.results) {
        for (const item of r.results) {
          if (item.original_language === 'ko') {
            const yr = item.release_date ? parseInt(item.release_date.substring(0, 4)) : 0;
            if (Math.abs(yr - m.year) <= 3) { found = item; break; }
          }
        }
        if (!found) {
          for (const item of r.results) {
            if (item.original_language === 'ko') { found = item; break; }
          }
        }
      }

      if (!found) {
        console.log(`  [MISS] ${m.zh} (${m.en})`);
        await sleep(300);
        continue;
      }

      const tmdbIdStr = `tmdb_${found.id}`;
      if (existingIds.has(tmdbIdStr)) {
        console.log(`  [EXISTS] ${m.zh}`);
        await sleep(200);
        continue;
      }

      const yr = found.release_date ? found.release_date.substring(0, 4) : '0';
      const poster = found.poster_path ? `https://image.tmdb.org/t/p/w300${found.poster_path}` : '';
      const rate = parseFloat(found.vote_average || 0).toFixed(1);
      const hotScore = Math.round(parseFloat(rate) * 10 + 150);

      qs.movie.push({
        doubanId: tmdbIdStr,
        title: m.zh,
        rate,
        year: yr,
        cover: poster,
        directors: [],
        casts: [],
        genres: [],
        abstract: found.overview || '',
        region: '\u97e9\u56fd',
        hotScore,
        supplement: true,
      });
      existingIds.add(tmdbIdStr);
      added++;
      console.log(`  [ADD] ${m.zh} -> ${found.title} (${yr}) r=${rate} hs=${hotScore}`);
    } catch (e) {
      console.log(`  [ERR] ${m.zh}: ${e.message}`);
    }
    await sleep(300);
  }

  qs.movie.sort((a, b) => (b.hotScore || 0) - (a.hotScore || 0));
  gi['\u60c5\u8272'] = qs;
  data.genreIndex = gi;
  safeWriteData(data, { scriptName: 'supplement_kr_tmdb' });

  const krCount = qs.movie.filter(i => i.region === '\u97e9\u56fd' || i.supplement).length;
  console.log(`\nAdded ${added}, total ${qs.movie.length} movies, KR: ${krCount}`);
  console.log('========================================');
}

main().catch(e => { console.error(e); process.exit(1); });
