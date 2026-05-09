const fs = require('fs');
const path = require('path');
const { safeWriteData, DATA_PATH } = require('./lib/safe_write');
const TMDB_RAW_PATH = path.join(__dirname, '..', 'tmdb_raw.json');

const data = JSON.parse(fs.readFileSync(DATA_PATH, 'utf8'));
const tmdbRaw = JSON.parse(fs.readFileSync(TMDB_RAW_PATH, 'utf8').replace(/^\uFEFF/, ''));

const tmdbMap = new Map();
tmdbRaw.forEach(m => tmdbMap.set(m.tmdbId, m));

const movies = data.genreIndex['情色'].movie;
let updated = 0;

movies.forEach(item => {
  if (item.abstract && item.abstract.length > 0) return;

  let raw = null;
  if (String(item.doubanId).startsWith('tmdb_')) {
    const tid = parseInt(String(item.doubanId).replace('tmdb_', ''));
    raw = tmdbMap.get(tid);
  }

  if (!raw && item.tmdbSource) {
    raw = tmdbRaw.find(m => {
      if (!item.title || !m.title) return false;
      return item.title.includes(m.title.substring(0, 3)) || m.title.includes(item.title.substring(0, 3));
    });
  }

  if (raw && raw.overview) {
    item.abstract = raw.overview;
    updated++;
  }
});

safeWriteData(data, { scriptName: 'supplement_abstract' });
console.log(`updated: ${updated} / ${movies.length}`);

const withAbstract = movies.filter(i => i.abstract && i.abstract.length > 0);
console.log(`now with abstract: ${withAbstract.length} / ${movies.length}`);
