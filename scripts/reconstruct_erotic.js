const https = require('https');
const fs = require('fs');
const path = require('path');
const { safeWriteData, DATA_PATH } = require('./lib/safe_write');

const TMDB_KEY = '96ac6a609d077c2d49da61e620697ea7';
const MAX_ITEMS = 200;
const DISPLAY_COUNT = 50;
const MIN_YEAR = 2010;

const COOKIE = 'bid=rmXci4zuhOM; ll="108296"; ct=y; dbcl2="294605645:jC7dIJCo830"; ck=0r2i; ap_v=0,6.0';

const EROTIC_KEYWORD_IDS = new Set([256466, 155477, 195089, 41260]);
const EROTIC_KEYWORD_NAMES = ['erotic', 'softcore', 'seduction', 'erotica'];
const EROTIC_GENRES = ['情色', '伦理', '成人', '情色片', '伦理片'];
const EXCLUDED_GENRES = ['动画', '同性'];
const BLOCKED_KEYWORDS = ['动画', 'ANIMATION', '动漫', '同性'];
const JP_KR_REGIONS = ['韩国', '日本', '南韩', '北韩'];

const FORCE_KEEP_IDS = new Set([
  '20502443', '27168151', 'tmdb_847258',
  '25835285', '10487226',
]);

const BLOCKED_IDS = new Set([
  '26325320', '1294038',
]);

const FORCE_KEEP_TITLES = new Set([
  '隐藏的面孔', '痴人之爱', '东西向洞',
]);

const SEX_COMEDY_TITLES = new Set([
]);

const FORCE_REMOVE_TITLES = [
  '啊，荒野', '啊荒野', 'あゝ、荒野', 'ああ荒野', '荒野 前篇', '荒野 后篇',
  '驾驶我的车', '鬼城杀', '骨及所有', '骸骨及一切',
  '麻辣教师GTO', '日本食人鲨', '四墓惊魂',
  '空之境界', '来自深渊', '游戏人生',
  '地狱骑士', '德伯力克', '辣妞征集',
  '安娜的迷宫', '比基尼复仇者', '黑骚特警组',
  '小勇者们', '哭声', '燃烧', '母亲',
  '追击者', '孤胆特工', '恶人传', '记忆之夜',
  '熔炉', '黄海', '甜蜜的人生', '走到尽头',
  '看见恶魔', '荒野', '恶女', '无可奈何',
  '驭险迷情', '驭险谜情',
  '裙子里面是野兽',
  '绝杀空手道', '变性记', '海边的女孩',
  '空中的眼睛和蜗牛', '我们2017',
  '朴烈', '妹妹太爱我了怎么办', '爱的健身房', 'Oh！透明人间',
  '热线电话',
];

function isForceRemove(title) {
  if (!title) return false;
  const t = title.replace(/[\s,，·:：！!？?。、]/g, '');
  return FORCE_REMOVE_TITLES.some(k => t.includes(k.replace(/[\s,，·:：！!？?。、]/g, '')));
}

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

function httpGet(url, headers) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers, timeout: 10000 }, res => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => resolve({ status: res.statusCode, body: d }));
    }).on('error', reject);
  });
}

async function searchDoubanId(title, year) {
  const res = await httpGet(`https://movie.douban.com/j/subject_suggest?q=${encodeURIComponent(title)}`, {
    'User-Agent': 'Mozilla/5.0', 'Referer': 'https://movie.douban.com/', 'Cookie': COOKIE
  });
  if (res.status !== 200) return null;
  try {
    const d = JSON.parse(res.body);
    if (!Array.isArray(d) || d.length === 0) return null;
    const norm = t => (t || '').replace(/[\s·～~：:！!？?]/g, '');
    const byTitleAndYear = d.find(r => norm(r.title) === norm(title) && r.year === String(year));
    if (byTitleAndYear) return byTitleAndYear;
    const byYear = d.find(r => r.year === String(year));
    if (byYear) return byYear;
    return d[0];
  } catch { return null; }
}

async function getDoubanGenres(doubanId) {
  const res = await httpGet(`https://movie.douban.com/subject/${doubanId}/`, {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    'Accept': 'text/html', 'Referer': 'https://movie.douban.com/', 'Cookie': COOKIE
  });
  if (res.status !== 200) return null;
  const spans = res.body.match(/<span\s+property="v:genre">([^<]*)<\/span>/g);
  return spans ? spans.map(g => g.replace(/<[^>]*>/g, '')) : null;
}

function hasEroticGenre(genres) {
  return (genres || []).some(g => EROTIC_GENRES.includes(g));
}

function hasExcludedGenre(genres) {
  return (genres || []).some(g => EXCLUDED_GENRES.includes(g));
}

function hasBlockedKeyword(title) {
  if (!title) return false;
  const t = title.toUpperCase();
  return BLOCKED_KEYWORDS.some(k => t.includes(k.toUpperCase()));
}

async function hasEroticKeyword(tmdbId) {
  try {
    const data = await tmdbGet(`/movie/${tmdbId}/keywords?api_key=${TMDB_KEY}`);
    await sleep(250);
    if (!data.keywords) return false;
    for (const kw of data.keywords) {
      if (EROTIC_KEYWORD_IDS.has(kw.id)) return true;
      const name = (kw.name || '').toLowerCase();
      if (EROTIC_KEYWORD_NAMES.some(ek => name.includes(ek))) return true;
    }
    return false;
  } catch (e) {
    return false;
  }
}

function getRegionPriority(region) {
  if (!region) return 2;
  if (JP_KR_REGIONS.some(r => region.includes(r))) return 0;
  if (['泰国', '菲律宾', '印度'].some(r => region.includes(r))) return 1;
  return 2;
}

async function main() {
  console.log('========================================');
  console.log('情色榜单重建：严格筛选 200 部');
  console.log(`条件: year >= ${MIN_YEAR}, 有情色标签, 日韩优先`);
  console.log('========================================');

  const data = JSON.parse(fs.readFileSync(DATA_PATH, 'utf8'));
  const movies = data.genreIndex['情色'].movie || [];
  console.log(`当前总数: ${movies.length}`);

  const confirmed = [];
  const needValidate = [];
  const removed = { year: 0, titleBlacklist: 0, mainland: 0, noGenre: 0, excludedGenre: 0, blockedKeyword: 0, blockedId: 0 };

  for (const m of movies) {
    if (isForceRemove(m.title)) { removed.titleBlacklist++; continue; }
    if (hasBlockedKeyword(m.title)) { removed.blockedKeyword++; continue; }
    if (BLOCKED_IDS.has(m.doubanId)) { removed.blockedId++; continue; }
    if (parseInt(m.year) < MIN_YEAR && !FORCE_KEEP_IDS.has(m.doubanId)) { removed.year++; continue; }
    if ((m.region || '').includes('中国大陆') && !FORCE_KEEP_IDS.has(m.doubanId)) { removed.mainland++; continue; }
    if (hasExcludedGenre(m.genres)) { removed.excludedGenre++; continue; }

    if (FORCE_KEEP_IDS.has(m.doubanId) || FORCE_KEEP_TITLES.has(m.title) || SEX_COMEDY_TITLES.has(m.title)) {
      confirmed.push({ ...m, _priority: getRegionPriority(m.region), _confirmed: 'force' });
      continue;
    }

    if (hasEroticGenre(m.genres)) {
      confirmed.push({ ...m, _priority: getRegionPriority(m.region), _confirmed: 'genre' });
      continue;
    }

    if (m.doubanId && m.doubanId.startsWith('cai_')) {
      confirmed.push({ ...m, _priority: getRegionPriority(m.region), _confirmed: 'cai' });
      continue;
    }

    if (m.doubanId && m.doubanId.startsWith('tmdb_')) {
      needValidate.push(m);
    } else {
      removed.noGenre++;
    }
  }

  console.log(`\n--- 第1轮：本地筛选 ---`);
  console.log(`  有情色genres: ${confirmed.filter(m => m._confirmed === 'genre').length}`);
  console.log(`  采集站(cai_): ${confirmed.filter(m => m._confirmed === 'cai').length}`);
  console.log(`  强制保留: ${confirmed.filter(m => m._confirmed === 'force').length}`);
  console.log(`  需TMDB验证: ${needValidate.length}`);
  console.log(`  移除: 年份=${removed.year} 黑名单=${removed.titleBlacklist} 关键词=${removed.blockedKeyword} 错误ID=${removed.blockedId} 大陆=${removed.mainland} 排除类型=${removed.excludedGenre} 无标签=${removed.noGenre}`);

  if (needValidate.length > 0) {
    console.log(`\n--- 第2轮：TMDB keywords 验证 ---`);
    let kept = 0, rejected = 0;

    for (let i = 0; i < needValidate.length; i++) {
      const m = needValidate[i];
      if ((i + 1) % 50 === 0) {
        console.log(`  progress: ${i + 1}/${needValidate.length} (kept:${kept} rejected:${rejected})`);
      }

      const tmdbId = m.doubanId.replace('tmdb_', '');
      const isErotic = await hasEroticKeyword(tmdbId);

      if (isErotic) {
        confirmed.push({ ...m, _priority: getRegionPriority(m.region), _confirmed: 'tmdb_keyword' });
        kept++;
      } else {
        rejected++;
      }
    }

    console.log(`  TMDB验证: kept=${kept} rejected=${rejected}`);
  }

  confirmed.sort((a, b) => {
    if (a._priority !== b._priority) return a._priority - b._priority;
    return (b.hotScore || 0) - (a.hotScore || 0);
  });

  const final = confirmed.slice(0, MAX_ITEMS).map(m => {
    const { _priority, _confirmed, ...rest } = m;
    return { ...rest, _confirmed };
  });

  let verifyRound = 0;
  const allRejectedIds = new Set();
  const NON_EROTIC_GENRE_IDS = new Set([16, 99, 10751, 10402]);
  const EROTIC_GENRE_IDS = new Set();

  while (true) {
    const topDisplay = final.slice(0, DISPLAY_COUNT);
    const caiInTop = topDisplay.filter(m => m._confirmed === 'cai' && !FORCE_KEEP_TITLES.has(m.title));

    if (caiInTop.length === 0) break;

    verifyRound++;
    console.log(`\n--- 第2.5轮 (第${verifyRound}遍)：豆瓣+TMDB验证 Top ${DISPLAY_COUNT} 中的 cai_ 条目 (${caiInTop.length}部) ---`);
    let verified = 0, rejected = 0, notFound = 0;
    const rejectedIds = new Set();

    for (let i = 0; i < caiInTop.length; i++) {
      const m = caiInTop[i];
      process.stdout.write(`  [${i + 1}/${caiInTop.length}] ${m.title} (${m.year}) -> `);

      let genres = null;
      let source = '';

      const search = await searchDoubanId(m.title, m.year);
      await sleep(1200);

      if (search && search.id) {
        genres = await getDoubanGenres(search.id);
        await sleep(1200);
        if (genres) source = '豆瓣';
      }

      if (!genres) {
        try {
          const urlPath = `/search/movie?api_key=${TMDB_KEY}&query=${encodeURIComponent(m.title)}&language=zh-CN&include_adult=true${m.year ? '&primary_release_year=' + m.year : ''}`;
          const result = await tmdbGet(urlPath);
          await sleep(300);
          if (result && result.results && result.results.length > 0) {
            const genreIds = result.results[0].genre_ids || [];
            const genreMap = { 16: '动画', 18: '剧情', 27: '恐怖', 28: '动作', 35: '喜剧', 36: '历史', 37: '西部', 53: '悬疑', 80: '犯罪', 99: '纪录片', 878: '科幻', 9648: '悬疑', 10402: '音乐', 10749: '爱情', 10751: '家庭', 10752: '战争' };
            genres = genreIds.map(id => genreMap[id] || `genre_${id}`);
            source = 'TMDB';

            const hasEroticTmdb = genreIds.some(id => EROTIC_GENRE_IDS.has(id));
            const hasNonEroticTmdb = genreIds.some(id => NON_EROTIC_GENRE_IDS.has(id));
            if (!hasEroticTmdb && !hasNonEroticTmdb && genres.length === 0) genres = null;
          }
        } catch (e) { /* ignore */ }
      }

      if (!genres) {
        console.log(`两源均未搜到，保留`);
        notFound++;
        continue;
      }

      const hasErotic = genres.some(g => EROTIC_GENRES.includes(g));
      const hasExclude = genres.some(g => EXCLUDED_GENRES.includes(g));
      const hasComedy = genres.some(g => g === '喜剧');
      const originalHasErotic = (m.genres || []).some(g => EROTIC_GENRES.some(e => g.includes(e)));
      const isSexComedy = SEX_COMEDY_TITLES.has(m.title) || (hasComedy && originalHasErotic);

      if (hasExclude) {
        console.log(`❌ 排除类型 [${genres.join('/')}] (${source})`);
        rejectedIds.add(m.doubanId);
        rejected++;
      } else if (hasErotic) {
        console.log(`✅ 确认 [${genres.join('/')}] (${source})`);
        verified++;
      } else if (isSexComedy) {
        console.log(`✅ 性喜剧 [${genres.join('/')}] (${source})`);
        verified++;
      } else {
        console.log(`❌ 非情色 [${genres.join('/')}] (${source})`);
        rejectedIds.add(m.doubanId);
        rejected++;
      }
    }

    if (rejectedIds.size > 0) {
      for (const id of rejectedIds) allRejectedIds.add(id);
      const before = final.length;
      for (let i = final.length - 1; i >= 0; i--) {
        if (rejectedIds.has(final[i].doubanId)) final.splice(i, 1);
      }
      console.log(`  移除 ${rejectedIds.size} 部，${before} -> ${final.length}`);
    }

    console.log(`  第${verifyRound}遍结果: 确认=${verified} 移除=${rejected} 未搜到=${notFound}`);

    if (rejected === 0) break;
  }

  if (verifyRound > 0) {
    console.log(`\n  验证完成: 共${verifyRound}遍，累计移除 ${allRejectedIds.size} 部非情色条目`);
  }

  const stats = {
    genre: confirmed.filter(m => m._confirmed === 'genre').length,
    cai: confirmed.filter(m => m._confirmed === 'cai').length,
    force: confirmed.filter(m => m._confirmed === 'force').length,
    tmdb: confirmed.filter(m => m._confirmed === 'tmdb_keyword').length,
  };

  console.log(`\n========================================`);
  console.log(`最终结果: ${final.length} / ${confirmed.length} (取前${MAX_ITEMS})`);
  console.log(`确认来源: genres=${stats.genre} cai=${stats.cai} force=${stats.force} tmdb_keyword=${stats.tmdb}`);
  console.log(`\n按地区:`);
  const jpkr = final.filter(m => JP_KR_REGIONS.some(r => (m.region || '').includes(r))).length;
  const other = final.length - jpkr;
  console.log(`  日韩: ${jpkr} | 其他: ${other}`);

  console.log(`\nTop 20:`);
  for (let i = 0; i < Math.min(20, final.length); i++) {
    const m = final[i];
    const confirmed_by = confirmed.find(c => c.doubanId === m.doubanId)?._confirmed || '?';
    console.log(`  ${i + 1}. ${m.title} (${m.year}) ${m.region || '?'} r=${m.rate} [${confirmed_by}]`);
  }

  const noCover = final.filter(m => !m.cover || m.cover.trim() === '');
  console.log(`\n空封面: ${noCover.length} 部`);
  for (const m of noCover) {
    console.log(`  - ${m.title} (${m.year}) ${m.doubanId}`);
  }

  const TITLE_ALIASES = {
    '女继承人': ['Gangnam Daughter-in-law', '강남 며느리'],
  };

  if (noCover.length > 0) {
    console.log(`\n--- 第3轮：补全空封面 (TMDB搜索) ---`);
    let fixed = 0;
    for (const m of noCover) {
      try {
        const queries = [m.title];
        if (TITLE_ALIASES[m.title]) queries.push(...TITLE_ALIASES[m.title]);
        let found = false;
        for (const query of queries) {
          if (found) break;
          const urlPath = `/search/movie?api_key=${TMDB_KEY}&query=${encodeURIComponent(query)}&language=zh-CN&include_adult=true${m.year ? '&primary_release_year=' + m.year : ''}`;
          const result = await tmdbGet(urlPath);
          await sleep(300);
          if (result && result.results && result.results.length > 0 && result.results[0].poster_path) {
            m.cover = `https://image.tmdb.org/t/p/w500${result.results[0].poster_path}`;
            fixed++;
            console.log(`  [补全] ${m.title} (${query}) -> ${result.results[0].poster_path}`);
            found = true;
          }
        }
        if (!found) console.log(`  [未找到] ${m.title}`);
      } catch (e) {
        console.log(`  [错误] ${m.title}: ${e.message}`);
      }
    }
    console.log(`  封面补全: ${fixed}/${noCover.length}`);
  }

  data.genreIndex['情色'].movie = final.map(m => {
    const { _confirmed, ...rest } = m;
    return rest;
  });
  safeWriteData(data, { scriptName: 'reconstruct_erotic' });

  console.log(`\ndata.json 已更新`);
  console.log(`========================================`);
}

main().catch(e => { console.error(e); process.exit(1); });
