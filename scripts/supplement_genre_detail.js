const https = require('https');
const fs = require('fs');
const path = require('path');
const { safeWriteData, DATA_PATH } = require('./lib/safe_write');

const EROTIC_GENRES = ['情色', '伦理', '成人', '情色片', '伦理片'];
const CLEAR_GENRES = ['动画', '纪录片', '儿童', '家庭', '戏曲', '同性'];
const NON_EROTIC_IDS = [
  '35345859', '37163391', '10535457', '1892161',
  '27030639', '27030636',
  'tmdb_1444376', 'tmdb_758866', 'tmdb_1271314', 'tmdb_72021',
  'tmdb_445030', 'tmdb_23150', 'tmdb_526429', 'tmdb_23153',
  'tmdb_23151', 'tmdb_23155', 'tmdb_23154', 'tmdb_23167',
  'tmdb_23166', 'tmdb_526426', 'tmdb_47747',
  'tmdb_318256', 'tmdb_593395', 'tmdb_43950', 'tmdb_347158',
  'tmdb_424645', 'tmdb_31248', 'tmdb_499441', 'tmdb_60160',
  'tmdb_1405338', 'tmdb_791177',
];
const NON_EROTIC_TITLES = [
  '啊，荒野', '啊荒野', 'あゝ、荒野', 'ああ荒野', '荒野 前篇', '荒野 后篇',
  '驾驶我的车', '鬼城杀', '骨及所有', '骸骨及一切',
  '麻辣教师GTO', '日本食人鲨', '四墓惊魂',
  '空之境界', '来自深渊', '游戏人生',
  '地狱骑士', '德伯力克', '辣妞征集',
  '安娜的迷宫', '比基尼复仇者', '黑骚特警组',
  '小勇者们', '驭险迷情', '驭险谜情',
  '裙子里面是野兽',
];

function isNonEroticTitle(title) {
  if (!title) return false;
  const t = title.replace(/[\s,，·:：！!？?。、]/g, '');
  return NON_EROTIC_TITLES.some(k => t.includes(k.replace(/[\s,，·:：！!？?。、]/g, '')));
}

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

function isEroticGenre(genres) {
  if (!genres || genres.length === 0) return null;
  if (genres.some(g => EROTIC_GENRES.includes(g))) return true;
  if (genres.some(g => CLEAR_GENRES.includes(g))) return false;
  return null;
}

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
  console.log('情色数据详情补充 + 分类清洗');
  console.log('========================================');

  const data = JSON.parse(fs.readFileSync(DATA_PATH, 'utf8'));
  const gi = data.genreIndex || {};
  const qs = gi['情色'] || {};
  const movies = qs.movie || [];

  let updated = 0;
  let removed = 0;
  let skipped = 0;
  let failed = 0;
  const removeReasons = {};

  for (let i = movies.length - 1; i >= 0; i--) {
    const item = movies[i];
    const idx = i + 1;
    if (idx % 20 === 0) {
      console.log(`  progress: ${idx}/${movies.length} (updated:${updated} removed:${removed})`);
    }

    if (NON_EROTIC_IDS.includes(String(item.doubanId))) {
      movies.splice(i, 1);
      removed++;
      console.log(`  [移除-黑名单] ${item.title} (${item.doubanId})`);
      continue;
    }

    if (isNonEroticTitle(item.title)) {
      movies.splice(i, 1);
      removed++;
      console.log(`  [移除-标题黑名单] ${item.title} (${item.doubanId})`);
      continue;
    }

    const hasDetail = item.abstract && item.directors && item.directors.length > 0;
    const hasGenre = item.genres && item.genres.length > 0;
    if (hasDetail && hasGenre) {
      const genreCheck = isEroticGenre(item.genres);
      if (genreCheck === false) {
        const reason = item.genres.join(',');
        removeReasons[reason] = (removeReasons[reason] || 0) + 1;
        movies.splice(i, 1);
        removed++;
        console.log(`  [移除] ${item.title} (${item.year}) genres=[${item.genres}]`);
      } else {
        skipped++;
      }
      continue;
    }

    const doubanId = String(item.doubanId || '');
    let matched = false;
    let genresFromDouban = null;

    if (doubanId && !doubanId.startsWith('tmdb_')) {
      try {
        const abstract = await doubanGet('subject_abstract?subject_id=' + doubanId);
        if (abstract && abstract.subject) {
          genresFromDouban = abstract.subject.types || null;
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
            await sleep(400);

            const abstract = await doubanGet('subject_abstract?subject_id=' + found.id);
            if (abstract && abstract.subject) {
              genresFromDouban = abstract.subject.types || null;
              item.doubanId = found.id;
              item.cover = found.img || item.cover;
              if (found.rate) item.rate = found.rate;
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

    const genresToCheck = genresFromDouban || item.genres || [];
    const genreCheck = isEroticGenre(genresToCheck);

    if (genreCheck === false) {
      const reason = genresToCheck.join(',');
      removeReasons[reason] = (removeReasons[reason] || 0) + 1;
      movies.splice(i, 1);
      removed++;
      console.log(`  [移除] ${item.title} (${item.year}) genres=[${genresToCheck}]`);
    } else if (!matched && genresToCheck.length === 0) {
      console.log(`  [保留-未验证] ${item.title} (${item.year}) 无genres且无法匹配豆瓣`);
    }
  }

  qs.movie = movies;
  gi['情色'] = qs;
  data.genreIndex = gi;

  safeWriteData(data, { scriptName: 'supplement_genre_detail' });

  console.log(`\n========================================`);
  console.log(`结果: updated=${updated} removed=${removed} skipped=${skipped} failed=${failed}`);
  console.log(`保留: ${movies.length} 部`);
  if (Object.keys(removeReasons).length > 0) {
    console.log(`\n移除原因统计:`);
    Object.entries(removeReasons).sort((a, b) => b[1] - a[1]).forEach(([reason, count]) => {
      console.log(`  [${reason}]: ${count} 部`);
    });
  }
  console.log(`========================================`);
}

main().catch(e => { console.error(e); process.exit(1); });
