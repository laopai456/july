const https = require('https');
const fs = require('fs');
const path = require('path');

const TMDB_KEY = '96ac6a609d077c2d49da61e620697ea7';
const OUTPUT_RAW = path.join(__dirname, '..', 'tmdb_raw.json');
const DATA_PATH = path.join(__dirname, '..', 'data.json');
const MIN_YEAR = 2005;
const MAX_PAGES = 5;
const PAGE_DELAY = 300;

const SOURCES = [
  { name: 'KR-19', params: 'certification_country=KR&certification=19&with_original_language=ko' },
  { name: 'KR-erotic', params: 'with_keywords=256466|155477&with_original_language=ko' },
  { name: 'KR-seduction', params: 'with_keywords=195089&with_original_language=ko' },
  { name: 'KR-affair', params: 'with_keywords=9826&with_original_language=ko' },
  { name: 'JP-R18+', params: 'certification_country=JP&certification=R18%2B&with_original_language=ja&with_release_type=3&without_genres=16' },
  { name: 'PH-R18', params: 'certification_country=PH&certification=R-18&with_original_language=tl' },
  { name: 'TH-18', params: 'certification_country=TH&certification=18&with_original_language=th' },
  { name: 'GLOBAL-erotic', params: 'with_keywords=256466&vote_count.gte=20' },
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

async function fetchSource(src, allMovies) {
  console.log(`\n[${src.name}]`);
  let page = 1;
  let maxPages = MAX_PAGES;
  let sourceCount = 0;

  while (page <= maxPages) {
    const url = `/discover/movie?language=zh-CN&sort_by=vote_count.desc&vote_count.gte=5&include_adult=true&${src.params}&page=${page}&api_key=${TMDB_KEY}`;
    let r;
    try {
      r = await tmdbGet(url);
    } catch (e) {
      console.log(`  FAIL: ${e.message}`);
      break;
    }

    if (!r.results || r.results.length === 0) break;
    maxPages = Math.min(r.total_pages, MAX_PAGES);

    let pageCount = 0;
    for (const m of r.results) {
      const id = String(m.id);
      if (allMovies.has(id)) continue;

      let year = 0;
      if (m.release_date && m.release_date.length >= 4) {
        year = parseInt(m.release_date.substring(0, 4));
      }
      if (year < MIN_YEAR) continue;

      allMovies.set(id, {
        tmdbId: m.id,
        title: m.title || m.original_title || '',
        originalTitle: m.original_title || '',
        year,
        rating: parseFloat(m.vote_average || 0).toFixed(1),
        voteCount: m.vote_count || 0,
        language: m.original_language || '',
        poster: m.poster_path ? `https://image.tmdb.org/t/p/w300${m.poster_path}` : '',
        overview: m.overview || '',
        source: src.name,
      });
      pageCount++;
      sourceCount++;
    }

    console.log(`  page ${page}/${maxPages}: +${pageCount}`);
    page++;
    await sleep(PAGE_DELAY);
  }

  console.log(`  [${src.name}] total: ${sourceCount}`);
  return sourceCount;
}

async function main() {
  console.log('========================================');
  console.log('TMDB 情色片批量抓取（Node.js 版）');
  console.log('========================================');

  let allMovies = new Map();

  if (fs.existsSync(OUTPUT_RAW)) {
    try {
      const existing = JSON.parse(fs.readFileSync(OUTPUT_RAW, 'utf8').replace(/^\uFEFF/, ''));
      for (const m of existing) {
        allMovies.set(String(m.tmdbId), m);
      }
      console.log(`已加载 ${allMovies.size} 条已有数据`);
    } catch (e) {
      console.log('加载已有数据失败，从头开始');
    }
  }

  for (const src of SOURCES) {
    await fetchSource(src, allMovies);
  }

  const list = [...allMovies.values()].sort((a, b) => (b.voteCount || 0) - (a.voteCount || 0));

  console.log(`\n========================================`);
  console.log(`TMDB total: ${list.length} movies (>= ${MIN_YEAR})`);

  console.log(`\nTop 15:`);
  for (let i = 0; i < Math.min(15, list.length); i++) {
    const m = list[i];
    console.log(`  ${i + 1}. ${m.title} (${m.year}) ${m.language} r=${m.rating} v=${m.voteCount} [${m.source}]`);
  }

  fs.writeFileSync(OUTPUT_RAW, JSON.stringify(list, null, 2), 'utf8');
  console.log(`\nSaved to: ${OUTPUT_RAW}`);

  console.log(`\n--- 合并到 data.json ---`);
  const data = JSON.parse(fs.readFileSync(DATA_PATH, 'utf8'));
  const movies = data.genreIndex['情色'].movie || [];
  const existingIds = new Set(movies.map(m => String(m.doubanId)));
  const existingTitles = new Set(movies.map(m => (m.title + '_' + m.year).toLowerCase().replace(/[\s·:：！!？?]/g, '')));

  const NON_EROTIC_TITLES = [
    '啊，荒野', '啊荒野', 'あゝ、荒野', 'ああ荒野', '荒野 前篇', '荒野 后篇',
    '驾驶我的车', '鬼城杀', '骨及所有', '骸骨及一切',
    '麻辣教师GTO', '日本食人鲨', '四墓惊魂',
    '空之境界', '来自深渊', '游戏人生',
    '地狱骑士', '德伯力克', '辣妞征集',
    '安娜的迷宫', '比基尼复仇者', '黑骚特警组',
    '小勇者们',
  ];

  function isNonEroticTitle(title) {
    if (!title) return false;
    const t = title.replace(/[\s,，·:：！!？?。、]/g, '');
    return NON_EROTIC_TITLES.some(k => t.includes(k.replace(/[\s,，·:：！!？?。、]/g, '')));
  }

  let added = 0, dupId = 0, dupTitle = 0, blocked = 0;

  for (const m of list) {
    const tmdbId = `tmdb_${m.tmdbId}`;
    if (existingIds.has(tmdbId)) { dupId++; continue; }

    const normTitle = (m.title + '_' + m.year).toLowerCase().replace(/[\s·:：！!？?]/g, '');
    if (existingTitles.has(normTitle)) { dupTitle++; continue; }

    if (isNonEroticTitle(m.title)) { blocked++; continue; }

    movies.push({
      doubanId: tmdbId,
      title: m.title,
      rate: m.rating || '0',
      year: String(m.year),
      cover: m.poster || '',
      directors: [],
      casts: [],
      genres: [],
      abstract: m.overview || '',
      region: '',
      hotScore: m.voteCount || 0,
      supplement: true,
    });
    existingIds.add(tmdbId);
    existingTitles.add(normTitle);
    added++;
  }

  movies.sort((a, b) => (b.hotScore || 0) - (a.hotScore || 0));
  data.genreIndex['情色'].movie = movies;

  fs.writeFileSync(DATA_PATH, JSON.stringify(data, null, 2), 'utf8');

  console.log(`新增: ${added} | 重复ID: ${dupId} | 重复标题: ${dupTitle} | 黑名单: ${blocked}`);
  console.log(`data.json 情色总数: ${movies.length}`);
  console.log(`========================================`);
}

main().catch(e => { console.error(e); process.exit(1); });
