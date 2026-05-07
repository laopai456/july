const https = require('https');
const fs = require('fs');
const path = require('path');
const data = require('../data.json');
const all = [...(data.genreIndex['情色'].movie || []), ...(data.genreIndex['情色'].drama || [])];

const TMDB_KEY = '96ac6a609d077c2d49da61e620697ea7';
const EROTIC_GENRES = ['情色', '伦理', '成人', '同性'];
const CAI_EROTIC_GENRES = ['伦理片', '韩国伦理', '日本伦理', '西方伦理', '港台三级', '伦理', '两性课堂', '情色', '成人'];
const JP_KR_REGIONS = ['韩国', '日本', '南韩'];
const FORCE_KEEP_TITLES = ['白日焰火', '色戒', '玩物', '上流社会'];
const FORCE_REMOVE_TITLES = ['啊，荒野','啊荒野','荒野 前篇','荒野 后篇','驾驶我的车','鬼城杀','骨及所有','骸骨及一切','麻辣教师GTO','日本食人鲨','四墓惊魂','空之境界','来自深渊','游戏人生','地狱骑士','德伯力克','辣妞征集','安娜的迷宫','比基尼复仇者','黑骚特警组','小勇者们','哭声','燃烧','母亲','追击者','孤胆特工','恶人传','记忆之夜','熔炉','黄海','甜蜜的人生','走到尽头','看见恶魔','荒野','恶女','无可奈何','金钱的味道'];
const COOKIE = 'bid=rmXci4zuhOM; ll="108296"; _vwo_uuid_v2=D59C352040A1639E04E09902C371DD105|9678fa318ad695dac8c843b5c1c9a040; ct=y; _pk_id.100001.8cb4=2c2064abfd652ae3.1775882738.; dbcl2="294605645:jC7dIJCo830"; push_noty_num=0; push_doumail_num=0; __utmv=30149280.29460; __yadk_uid=GuE5SO9dsCF2AGbIx4ZJi1CDvnYI2IJ5; ck=0r2i; ap_v=0,6.0; frodotk_db="a4b959990041755fee2c0ccb00c4601d"; __utma=30149280.179540387.1769946188.1775932681.1776015224.8; __utmc=30149280; __utmz=30149280.1776015224.8.8.utmcsr=bing|utmccn=(organic)|utmcmd=organic|utmctr=(not+provided); __utmt=1; __utmb=30149280.4.10.1776015224';
const TMDB_EROTIC_KEYWORD_IDS = new Set([256466, 155477, 195089, 41260]);
const TMDB_EROTIC_KEYWORD_NAMES = ['erotic', 'softcore', 'seduction', 'erotica'];
const MAX_ITEMS = 200;
const STRICT_THRESHOLD = 100;

function isForceRemove(t) { if(!t)return false; const s=t.replace(/[\s,，·:：！!？?。、]/g,''); return FORCE_REMOVE_TITLES.some(k=>s.includes(k.replace(/[\s,，·:：！!？?。、]/g,''))); }
function isForceKeep(t) { return FORCE_KEEP_TITLES.some(k=>t.includes(k)); }
function hasCaiEroticGenre(g) { return (g||[]).some(x=>CAI_EROTIC_GENRES.includes(x)); }
function getRegionPriority(r) { if(!r)return 2; return JP_KR_REGIONS.some(x=>r.includes(x))?0:2; }
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

async function hasTmdbEroticKeyword(tmdbId) {
  try {
    const res = await httpGet(`https://api.themoviedb.org/3/movie/${tmdbId}/keywords?api_key=${TMDB_KEY}`, {});
    if (res.status !== 200) return false;
    const d = JSON.parse(res.body);
    if (!d.keywords) return false;
    for (const kw of d.keywords) {
      if (TMDB_EROTIC_KEYWORD_IDS.has(kw.id)) return true;
      const name = (kw.name || '').toLowerCase();
      if (TMDB_EROTIC_KEYWORD_NAMES.some(ek => name.includes(ek))) return true;
    }
    return false;
  } catch { return false; }
}

async function main() {
  console.log('========================================');
  console.log('情色榜单筛选：高分严格 + 低分宽松');
  console.log(`严格验证阈值: 前${STRICT_THRESHOLD}名需豆瓣确认`);
  console.log(`最终取: ${MAX_ITEMS}部`);
  console.log('========================================\n');

  const localFiltered = [];
  const tmdbItems = [];

  for (const m of all) {
    if (isForceRemove(m.title)) continue;
    if (parseInt(m.year) < 2010 && !isForceKeep(m.title)) continue;
    if ((m.region || '').includes('中国大陆') && !isForceKeep(m.title)) continue;
    const id = m.doubanId || '';
    if (id.startsWith('tmdb_')) { tmdbItems.push(m); continue; }
    localFiltered.push(m);
  }

  localFiltered.sort((a, b) => {
    const ap = getRegionPriority(a.region), bp = getRegionPriority(b.region);
    if (ap !== bp) return ap - bp;
    return (b.hotScore || 0) - (a.hotScore || 0);
  });

  console.log(`本地过滤: ${all.length} → ${localFiltered.length} (+ ${tmdbItems.length} tmdb_待验证)`);

  const strictPool = localFiltered.slice(0, STRICT_THRESHOLD + 50);
  const loosePool = localFiltered.slice(STRICT_THRESHOLD + 50);

  console.log(`严格验证池: ${strictPool.length} 部 (前${STRICT_THRESHOLD + 50}名)`);
  console.log(`宽松备选池: ${loosePool.length} 部`);
  console.log(`TMDB待验证: ${tmdbItems.length} 部\n`);

  console.log('--- 第1步: 严格验证前' + (STRICT_THRESHOLD + 50) + '名 ---');
  const strictVerified = [];
  const strictRejected = [];
  let verified = 0;

  for (const m of strictPool) {
    let dbId = m.doubanId;
    let searched = false;

    if (dbId.startsWith('cai_')) {
      const search = await searchDoubanId(m.title, m.year);
      await sleep(1200);
      if (!search) {
        strictRejected.push({ ...m, reason: '豆瓣未搜到' });
        continue;
      }
      dbId = search.id;
      searched = true;
    }

    const genres = await getDoubanGenres(dbId);
    await sleep(1200);

    if (!genres) {
      strictRejected.push({ ...m, reason: '无genres' });
      continue;
    }

    const hasErotic = genres.some(g => EROTIC_GENRES.includes(g));
    verified++;

    if (hasErotic) {
      strictVerified.push({ ...m, _verified: '豆瓣确认', _dbGenres: genres.join('/') });
    } else {
      strictRejected.push({ ...m, reason: `非情色[${genres.join('/')}]`, _dbGenres: genres.join('/') });
    }

    if (verified % 20 === 0) {
      console.log(`  进度: ${verified}/${strictPool.length} (确认:${strictVerified.length} 拒绝:${strictRejected.length})`);
    }
  }

  console.log(`\n  严格验证完成: 确认=${strictVerified.length} 拒绝=${strictRejected.length}`);

  console.log('\n--- 第2步: TMDB keywords 验证 (跳过，国内不可达) ---');
  console.log(`  TMDB: ${tmdbItems.length}条跳过`);
  for (const m of tmdbItems) {
    strictRejected.push({ ...m, reason: 'TMDB不可达' });
  }

  console.log('\n--- 第3步: 组装最终榜单 ---');
  const finalList = [];

  strictVerified.sort((a, b) => {
    const ap = getRegionPriority(a.region), bp = getRegionPriority(b.region);
    if (ap !== bp) return ap - bp;
    return (b.hotScore || 0) - (a.hotScore || 0);
  });

  const addedKeys = new Set();
  for (const m of strictVerified) {
    if (finalList.length >= MAX_ITEMS) break;
    const key = m.title + '_' + m.year;
    if (addedKeys.has(key)) continue;
    addedKeys.add(key);
    const { _verified, _dbGenres, _priority, ...rest } = m;
    finalList.push({ ...rest, verified: _verified });
  }

  if (finalList.length < MAX_ITEMS) {
    const remaining = [...strictRejected, ...loosePool]
      .filter(m => !addedKeys.has(m.title + '_' + m.year))
      .sort((a, b) => {
        const ap = getRegionPriority(a.region), bp = getRegionPriority(b.region);
        if (ap !== bp) return ap - bp;
        return (b.hotScore || 0) - (a.hotScore || 0);
      });

    for (const m of remaining) {
      if (finalList.length >= MAX_ITEMS) break;
      const key = m.title + '_' + m.year;
      if (addedKeys.has(key)) continue;
      addedKeys.add(key);
      const { reason, _dbGenres, _priority, ...rest } = m;
      finalList.push({ ...rest, verified: '宽松入选' });
    }
  }

  const jkCount = finalList.filter(m => JP_KR_REGIONS.some(r => (m.region || '').includes(r))).length;
  const strictCount = finalList.filter(m => m.verified === '豆瓣确认' || m.verified === 'TMDB确认').length;
  const looseCount = finalList.filter(m => m.verified === '宽松入选').length;

  console.log(`\n========================================`);
  console.log(`最终榜单: ${finalList.length} 部`);
  console.log(`严格确认: ${strictCount}  宽松入选: ${looseCount}`);
  console.log(`日韩: ${jkCount}  其他: ${finalList.length - jkCount}`);
  console.log('========================================');

  console.log('\n--- Top 30 ---');
  for (let i = 0; i < Math.min(30, finalList.length); i++) {
    const m = finalList[i];
    const area = JP_KR_REGIONS.some(r => (m.region || '').includes(r)) ? '日韩' : '其他';
    console.log(`${String(i + 1).padStart(3)}. [${area}] ${m.verified === '宽松入选' ? '🔶' : '✅'} ${m.title} (${m.year}) ${m.region || '?'} rate:${m.rate} hot:${m.hotScore} [${m.verified}]`);
  }

  const output = {
    description: '情色榜单 - 高分严格筛选+低分宽松',
    generatedAt: new Date().toISOString(),
    total: finalList.length,
    strictCount,
    looseCount,
    items: finalList,
  };

  const outPath = path.join(__dirname, '..', 'erotic_list.json');
  fs.writeFileSync(outPath, JSON.stringify(output, null, 2), 'utf8');
  console.log(`\n榜单已保存: ${outPath}`);
}

main().catch(e => console.error(e));
