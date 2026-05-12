require('dotenv').config();
const https = require('https');
const fs = require('fs');
const path = require('path');
const { safeWriteData, DATA_PATH } = require('./lib/safe_write');

const TMDB_KEY = process.env.TMDB_API_KEY || '';

const TMDB_GENRE_MAP = {
  28: '动作', 12: '冒险', 16: '动画', 35: '喜剧', 80: '犯罪',
  99: '纪录片', 18: '剧情', 10751: '家庭', 14: '奇幻', 36: '历史',
  27: '恐怖', 10402: '音乐', 9648: '悬疑', 10749: '爱情', 878: '科幻',
  10770: '电视电影', 53: '惊悚', 10752: '战争', 37: '西部',
};

const NON_EROTIC_GENRE_IDS = [16, 99, 10751];

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

function isNonEroticTitle(title) {
  if (!title) return false;
  const t = title.replace(/[\s,，·:：！!？?。、]/g, '');
  return NON_EROTIC_TITLES.some(k => t.includes(k.replace(/[\s,，·:：！!？?。、]/g, '')));
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

async function getMovieDetail(tmdbId) {
  const detail = await tmdbGet(`/movie/${tmdbId}?api_key=${TMDB_KEY}&language=zh-CN&append_to_response=credits`);
  return detail;
}

async function main() {
  console.log('========================================');
  console.log('TMDB 详情精确补全（替代豆瓣搜索匹配）');
  console.log('========================================');

  const data = JSON.parse(fs.readFileSync(DATA_PATH, 'utf8'));
  const movies = data.genreIndex['情色'].movie || [];

  const tmdbItems = movies.filter(m => m.doubanId && m.doubanId.startsWith('tmdb_'));
  console.log(`TMDB 条目: ${tmdbItems.length} 部`);

  let updated = 0;
  let removed = 0;
  let skipped = 0;
  let failed = 0;

  for (let i = 0; i < tmdbItems.length; i++) {
    const item = tmdbItems[i];
    const tmdbId = item.doubanId.replace('tmdb_', '');

    if ((i + 1) % 20 === 0) {
      console.log(`  progress: ${i + 1}/${tmdbItems.length} (updated:${updated} removed:${removed} fail:${failed})`);
    }

    if (NON_EROTIC_IDS.includes(String(item.doubanId)) || isNonEroticTitle(item.title)) {
      const idx = movies.indexOf(item);
      if (idx !== -1) {
        movies.splice(idx, 1);
        removed++;
        console.log(`  [移除-黑名单] ${item.title} (${item.doubanId})`);
      }
      continue;
    }

    try {
      const detail = await getMovieDetail(tmdbId);
      await sleep(250);

      if (!detail || detail.success === false) {
        failed++;
        console.log(`  [失败] ${item.title} - TMDB ID ${tmdbId} 无数据`);
        continue;
      }

      const genreIds = detail.genres ? detail.genres.map(g => g.id) : [];
      const genreNames = detail.genres ? detail.genres.map(g => g.name) : [];

      if (genreIds.some(id => NON_EROTIC_GENRE_IDS.includes(id))) {
        const idx = movies.indexOf(item);
        if (idx !== -1) {
          movies.splice(idx, 1);
          removed++;
          console.log(`  [移除-非情色类型] ${item.title} genres=[${genreNames.join(',')}]`);
        }
        continue;
      }

      let changed = false;

      if (detail.title && detail.title !== item.title) {
        const zhTitle = detail.title;
        if (zhTitle && /[\u4e00-\u9fff]/.test(zhTitle)) {
          item.title = zhTitle;
          changed = true;
        }
      }

      if (genreNames.length > 0 && (item.genres || []).length === 0) {
        item.genres = genreNames;
        changed = true;
      }

      if (detail.overview && (!item.abstract || item.abstract.length < detail.overview.length)) {
        item.abstract = detail.overview;
        changed = true;
      }

      if (detail.credits) {
        const directors = (detail.credits.crew || [])
          .filter(c => c.job === 'Director')
          .map(c => c.name || c.original_name || '')
          .filter(Boolean)
          .slice(0, 3);

        const casts = (detail.credits.cast || [])
          .map(c => c.name || c.original_name || '')
          .filter(Boolean)
          .slice(0, 5);

        if (directors.length > 0 && (item.directors || []).length === 0) {
          item.directors = directors;
          changed = true;
        }
        if (casts.length > 0 && (item.casts || []).length === 0) {
          item.casts = casts;
          changed = true;
        }
      }

      if (detail.production_countries && detail.production_countries.length > 0 && !item.region) {
        const countryMap = {
          'KR': '韩国', 'JP': '日本', 'US': '美国', 'FR': '法国',
          'IT': '意大利', 'ES': '西班牙', 'GB': '英国', 'DE': '德国',
          'PH': '菲律宾', 'TH': '泰国', 'IN': '印度', 'BR': '巴西',
          'DK': '丹麦', 'SE': '瑞典', 'NL': '荷兰', 'AU': '澳大利亚',
          'CN': '中国大陆', 'HK': '中国香港', 'TW': '中国台湾',
          'PL': '波兰', 'RU': '俄罗斯', 'TR': '土耳其', 'MX': '墨西哥',
        };
        const region = detail.production_countries.map(c => countryMap[c.iso_3166_1] || c.name).join(' / ');
        if (region) {
          item.region = region;
          changed = true;
        }
      }

      if (detail.poster_path && (!item.cover || item.cover.includes('doubanio.com'))) {
        item.cover = `https://image.tmdb.org/t/p/w500${detail.poster_path}`;
        changed = true;
      }

      if (detail.vote_average && (!item.rate || item.rate === '0')) {
        item.rate = parseFloat(detail.vote_average).toFixed(1);
        changed = true;
      }

      if (changed) {
        updated++;
        console.log(`  [更新] ${item.title} (${item.year}) genres=[${(item.genres||[]).join(',')}] region=${item.region||''}`);
      } else {
        skipped++;
      }

    } catch (e) {
      failed++;
      console.log(`  [错误] ${item.title}: ${e.message}`);
    }
  }

  movies.sort((a, b) => (b.hotScore || 0) - (a.hotScore || 0));
  data.genreIndex['情色'].movie = movies;

  safeWriteData(data, { scriptName: 'fix_tmdb_detail' });

  console.log(`\n========================================`);
  console.log(`结果: updated=${updated} removed=${removed} skipped=${skipped} failed=${failed}`);
  console.log(`保留: ${movies.length} 部`);
  console.log(`========================================`);
}

main().catch(e => { console.error(e); process.exit(1); });
