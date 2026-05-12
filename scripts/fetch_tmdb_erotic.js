require('dotenv').config();
const https = require('https');
const fs = require('fs');
const path = require('path');
const { safeWriteData, DATA_PATH } = require('./lib/safe_write');

const TMDB_KEY = process.env.TMDB_API_KEY || '';
const OUTPUT_RAW = path.join(__dirname, '..', 'tmdb_raw.json');
const MIN_YEAR = 2005;
const MAX_PAGES = 5;
const PAGE_DELAY = 300;
const KEYWORD_DELAY = 250;

const SOURCES = [
  { name: 'KR-19', params: 'certification_country=KR&certification=19&with_original_language=ko', needValidate: true },
  { name: 'KR-erotic', params: 'with_keywords=256466|155477&with_original_language=ko', needValidate: false },
  { name: 'KR-seduction', params: 'with_keywords=195089&with_original_language=ko', needValidate: false },
  { name: 'JP-R18+', params: 'certification_country=JP&certification=R18%2B&with_original_language=ja&with_release_type=3&without_genres=16', needValidate: true },
  { name: 'PH-R18', params: 'certification_country=PH&certification=R-18&with_original_language=tl', needValidate: false },
  { name: 'TH-18', params: 'certification_country=TH&certification=18&with_original_language=th', needValidate: false },
  { name: 'GLOBAL-erotic', params: 'with_keywords=256466&vote_count.gte=20', needValidate: false },
];

const EROTIC_KEYWORD_IDS = new Set([
  256466, 155477, 195089, 41260,
]);
const EROTIC_KEYWORD_NAMES = [
  'erotic', 'softcore', 'seduction', 'erotica',
  '情色', '色情', '诱惑',
];

const NON_EROTIC_GENRE_IDS = new Set([16, 99, 10751, 10402]);

const NON_EROTIC_TITLES = [
  '啊，荒野', '啊荒野', 'あゝ、荒野', 'ああ荒野', '荒野 前篇', '荒野 后篇',
  '驾驶我的车', '鬼城杀', '骨及所有', '骸骨及一切',
  '麻辣教师GTO', '日本食人鲨', '四墓惊魂',
  '空之境界', '来自深渊', '游戏人生',
  '地狱骑士', '德伯力克', '辣妞征集',
  '安娜的迷宫', '比基尼复仇者', '黑骚特警组',
  '小勇者们', '哭声', '燃烧', '母亲',
  '追击者', '孤胆特工', '恶人传', '记忆之夜',
  '熔炉', '黄海', '甜蜜的人生', '走到尽头',
  '看见恶魔', '荒野', '恶女',
  '驭险迷情', '驭险谜情',
  '裙子里面是野兽',
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

function isNonEroticTitle(title) {
  if (!title) return false;
  const t = title.replace(/[\s,，·:：！!？?。、]/g, '');
  return NON_EROTIC_TITLES.some(k => t.includes(k.replace(/[\s,，·:：！!？?。、]/g, '')));
}

function hasEroticKeyword(keywordList) {
  if (!keywordList || keywordList.length === 0) return false;
  for (const kw of keywordList) {
    if (EROTIC_KEYWORD_IDS.has(kw.id)) return true;
    const name = (kw.name || '').toLowerCase();
    if (EROTIC_KEYWORD_NAMES.some(ek => name.includes(ek))) return true;
  }
  return false;
}

async function validateMovieKeywords(tmdbId, title) {
  try {
    const data = await tmdbGet(`/movie/${tmdbId}/keywords?api_key=${TMDB_KEY}`);
    await sleep(KEYWORD_DELAY);
    if (data.keywords && data.keywords.length > 0) {
      return hasEroticKeyword(data.keywords);
    }
    return null;
  } catch (e) {
    return null;
  }
}

async function validateMovieGenres(tmdbId) {
  try {
    const data = await tmdbGet(`/movie/${tmdbId}?api_key=${TMDB_KEY}&language=zh-CN`);
    await sleep(KEYWORD_DELAY);
    if (!data || !data.genres) return null;
    const genreIds = data.genres.map(g => g.id);
    if (genreIds.some(id => NON_EROTIC_GENRE_IDS.has(id))) return false;
    return null;
  } catch (e) {
    return null;
  }
}

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
      if (isNonEroticTitle(m.title || m.original_title)) continue;

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
        needValidate: src.needValidate,
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
  console.log('TMDB 情色片批量抓取 + keywords 验证');
  console.log('========================================');

  const VALIDATE_SOURCES = new Set(['KR-19', 'JP-R18+', 'GLOBAL-softcore']);

  let allMovies = new Map();

  if (fs.existsSync(OUTPUT_RAW)) {
    try {
      const existing = JSON.parse(fs.readFileSync(OUTPUT_RAW, 'utf8').replace(/^\uFEFF/, ''));
      for (const m of existing) {
        m.needValidate = VALIDATE_SOURCES.has(m.source);
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

  const needValidate = [...allMovies.values()].filter(m => m.needValidate);
  const alreadyValid = [...allMovies.values()].filter(m => !m.needValidate);

  console.log(`\n========================================`);
  console.log(`原始抓取: ${allMovies.size} 部`);
  console.log(`需验证 (KR-19/JP-R18+): ${needValidate.length} 部`);
  console.log(`已验证 (关键词命中): ${alreadyValid.length} 部`);

  if (needValidate.length > 0) {
    console.log(`\n--- Keywords 验证 (必须确认有情色关键词才保留) ---`);
    let kept = 0, removed = 0, noKeyword = 0;

    for (let i = 0; i < needValidate.length; i++) {
      const m = needValidate[i];
      if ((i + 1) % 50 === 0) {
        console.log(`  progress: ${i + 1}/${needValidate.length} (kept:${kept} removed:${removed} noKeyword:${noKeyword})`);
      }

      const isErotic = await validateMovieKeywords(m.tmdbId, m.title);

      if (isErotic === true) {
        m.needValidate = false;
        kept++;
      } else if (isErotic === false) {
        allMovies.delete(String(m.tmdbId));
        removed++;
      } else {
        allMovies.delete(String(m.tmdbId));
        noKeyword++;
      }
    }

    console.log(`\n  验证结果: kept=${kept} removed=${removed} noKeyword=${noKeyword}`);
  }

  const list = [...allMovies.values()].sort((a, b) => (b.voteCount || 0) - (a.voteCount || 0));

  for (const m of list) {
    delete m.needValidate;
  }

  console.log(`\n========================================`);
  console.log(`验证后保留: ${list.length} 部`);

  console.log(`\nTop 20:`);
  for (let i = 0; i < Math.min(20, list.length); i++) {
    const m = list[i];
    console.log(`  ${i + 1}. ${m.title} (${m.year}) ${m.language} r=${m.rating} v=${m.voteCount} [${m.source}]`);
  }

  fs.writeFileSync(OUTPUT_RAW, JSON.stringify(list, null, 2), 'utf8');
  console.log(`\nSaved to: ${OUTPUT_RAW}`);

  console.log(`\n--- 清理 data.json 中已有的非情色 TMDB 条目 ---`);
  const data = JSON.parse(fs.readFileSync(DATA_PATH, 'utf8'));
  const movies = data.genreIndex['情色'].movie || [];

  const rawMap = new Map();
  for (const m of list) {
    rawMap.set(String(m.tmdbId), m);
  }

  let cleaned = 0;
  for (let i = movies.length - 1; i >= 0; i--) {
    const m = movies[i];
    if (!m.doubanId || !m.doubanId.startsWith('tmdb_')) continue;
    const tmdbId = m.doubanId.replace('tmdb_', '');
    if (rawMap.has(tmdbId)) continue;
    if (isNonEroticTitle(m.title)) {
      console.log(`  [清理-标题黑名单] ${m.title} (${m.doubanId})`);
      movies.splice(i, 1);
      cleaned++;
      continue;
    }
    if ((m.genres || []).length === 0 && (m.abstract || '').length < 20) {
      console.log(`  [清理-无详情] ${m.title} (${m.doubanId})`);
      movies.splice(i, 1);
      cleaned++;
    }
  }
  console.log(`  清理: ${cleaned} 部无详情/黑名单条目`);

  data.genreIndex['情色'].movie = movies;
  const existingIds = new Set(movies.map(m => String(m.doubanId)));
  const existingTitles = new Set(movies.map(m => (m.title + '_' + m.year).toLowerCase().replace(/[\s·:：！!？?]/g, '')));

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

  safeWriteData(data, { scriptName: 'fetch_tmdb_erotic' });

  console.log(`新增: ${added} | 重复ID: ${dupId} | 重复标题: ${dupTitle} | 黑名单: ${blocked}`);
  console.log(`data.json 情色总数: ${movies.length}`);
  console.log(`========================================`);
}

main().catch(e => { console.error(e); process.exit(1); });
