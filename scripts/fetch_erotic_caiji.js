const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');

const DATA_PATH = path.join(__dirname, '..', 'data.json');
const MAX_ITEMS = 1000;

const API_SOURCES = [
  { name: '非凡资源', url: 'http://cj.ffzyapi.com/api.php/provide/vod/' },
  { name: '红牛资源', url: 'https://hongniuziyuan.com/api.php/provide/vod/' },
  { name: '量子资源', url: 'http://cj.lziapi.com/api.php/provide/vod/' },
  { name: '快车资源', url: 'https://caiji.kczyapi.com/api.php/provide/vod/' },
  { name: '闪电资源', url: 'https://sdzyapi.com/api.php/provide/vod/' },
  { name: '番茄资源', url: 'http://api.fqzy.cc/api.php/provide/vod/' },
  { name: '天空资源', url: 'https://api.tiankongapi.com/api.php/provide/vod/' },
  { name: '酷云资源', url: 'http://kuapi.co/api.php/provide/vod/' },
  { name: '光速资源', url: 'https://api.guangsuapi.com/api.php/provide/vod/' },
  { name: '海尔资源', url: 'https://haier.zhui.la/api.php/provide/vod/' },
];

const EROTIC_TYPES = [
  '伦理片', '伦理', '韩国伦理', '港台三级', '西方伦理', '日本伦理',
  '情色', '成人', '两性课堂', '福利', '深夜',
];

const BLOCKED_WORDS = ['动画', '综艺', '纪录片', '短片', '预告', '花絮', '预告片', '特辑', '番外'];

function normalizeTitle(t) {
  return (t || '').replace(/[\s·\-:：.。！!？?《》【】]/g, '').replace(/（.*?）/g, '').replace(/\(.*?\)/g, '');
}

function httpGet(url, timeout = 10000) {
  return new Promise((resolve, reject) => {
    const mod = url.startsWith('https') ? https : http;
    const req = mod.get(url, { timeout, headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => {
        try { resolve(JSON.parse(d)); } catch (e) { resolve(null); }
      });
    });
    req.on('timeout', () => { req.destroy(); resolve(null); });
    req.on('error', () => resolve(null));
  });
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function isErotic(item) {
  const typeName = (item.type_name || '').toLowerCase();
  const tags = (item.tag || '').toLowerCase();
  const title = (item.vod_name || '').toLowerCase();
  return EROTIC_TYPES.some(t =>
    typeName.includes(t.toLowerCase()) ||
    tags.includes(t.toLowerCase())
  );
}

function parseYear(vod) {
  const y = parseInt(vod.vod_year) || 0;
  if (y > 1970 && y <= 2026) return String(y);
  const m = (vod.vod_content || '').match(/(20\d{2})/);
  return m ? m[1] : '';
}

function parseRate(vod) {
  const r = parseFloat(vod.vod_douban_score || vod.vod_score) || 0;
  return r > 0 ? String(Math.min(r, 10)) : '0';
}

function parseRegion(vod) {
  const area = vod.vod_area || vod.vod_remarks || '';
  if (/韩国|南韩|北韩/.test(area)) return '韩国';
  if (/日本|日韩/.test(area)) return '日本';
  if (/美国|欧美|英国|法国|意大利|德国|西班牙|瑞典|俄罗斯/.test(area)) return area.split('/')[0];
  if (/中国大陆|大陆|内地/.test(area)) return '中国大陆';
  if (/中国香港|香港/.test(area)) return '中国香港';
  if (/中国台湾|台湾/.test(area)) return '中国台湾';
  if (/泰国|菲律宾|越南|印尼/.test(area)) return area.split('/')[0];
  if (/印度/.test(area)) return '印度';
  return area || '其他';
}

function parseCover(vod) {
  let cover = vod.vod_pic || '';
  if (cover && !cover.startsWith('http')) cover = 'https:' + cover;
  return cover;
}

async function main() {
  console.log('=== 从资源采集站抓取情色片数据 ===\n');

  const allMovies = new Map();

  for (const source of API_SOURCES) {
    console.log(`[${source.name}] 测试连接...`);
    const listData = await httpGet(source.url + '?ac=list');
    if (!listData || !listData.list) {
      console.log(`  [${source.name}] 不可用，跳过`);
      continue;
    }

    const types = listData.class || [];
    const eroticTypes = types.filter(t =>
      EROTIC_TYPES.some(e => (t.type_name || '').includes(e))
    );
    console.log(`  可用! 分类: ${types.length} 个, 情色分类: ${eroticTypes.map(t => t.type_name).join(', ') || '无'}`);

    for (const et of eroticTypes) {
      console.log(`  抓取分类: ${et.type_name} (id:${et.type_id})`);
      let pg = 1;
      let emptyPages = 0;
      while (pg <= 10 && emptyPages < 2) {
        const data = await httpGet(source.url + '?ac=detail&t=' + et.type_id + '&pg=' + pg);
        if (!data || !data.list || data.list.length === 0) {
          emptyPages++;
          pg++;
          continue;
        }
        for (const vod of data.list) {
          const title = vod.vod_name || '';
          if (!title) continue;
          if (BLOCKED_WORDS.some(w => title.includes(w))) continue;
          const year = parseYear(vod);
          const key = normalizeTitle(title);
          if (!allMovies.has(key)) {
            allMovies.set(key, {
              title,
              year,
              rate: parseRate(vod),
              region: parseRegion(vod),
              cover: parseCover(vod),
              abstract: (vod.vod_blurb || vod.vod_content || '').substring(0, 200).replace(/<[^>]+>/g, ''),
              genres: [et.type_name],
              source: source.name,
            });
          }
        }
        console.log(`    第${pg}页: ${data.list.length} 条, 累计: ${allMovies.size}`);
        pg++;
        await sleep(300);
      }
    }
  }

  console.log(`\n共获取 ${allMovies.size} 部情色片`);

  const data = JSON.parse(fs.readFileSync(DATA_PATH, 'utf8'));
  const gi = data.genreIndex || {};
  const qs = gi['情色'] || { movie: [], drama: [] };

  const existingTitles = new Set();
  for (const item of [...(qs.movie || []), ...(qs.drama || [])]) {
    existingTitles.add(item.title + '_' + item.year);
  }

  let added = 0;
  for (const [key, m] of allMovies) {
    if (existingTitles.has(key)) continue;
    const rate = parseFloat(m.rate) || 0;
    const hotScore = Math.round(rate * 10 + 150);
    qs.movie.push({
      doubanId: 'cai_' + Buffer.from(m.title).toString('hex').substring(0, 12),
      title: m.title,
      rate: m.rate,
      year: m.year,
      cover: m.cover,
      directors: [],
      casts: [],
      genres: m.genres,
      abstract: m.abstract,
      region: m.region,
      hotScore,
      supplement: true,
      source: m.source,
    });
    existingTitles.add(key);
    added++;
  }

  qs.movie = qs.movie.filter(m => {
    if (parseInt(m.year) < 2000) return false;
    if ((m.region || '').includes('中国大陆')) return false;
    if (['正片', 'HD', 'HD中字', '伦理', '伦理片', '日语', '西班牙语', '伦理片（上半场）'].includes(m.region)) { m.region = ''; }
    if (m.region && m.region.length > 10) m.region = m.region.split(',')[0].split(' ')[0];
    return true;
  });
  qs.movie.sort((a, b) => (b.hotScore || 0) - (a.hotScore || 0));
  qs.movie = qs.movie.slice(0, MAX_ITEMS);
  gi['情色'] = qs;
  data.genreIndex = gi;
  fs.writeFileSync(DATA_PATH, JSON.stringify(data, null, 2), 'utf8');

  const regions = {};
  qs.movie.forEach(m => { regions[m.region || '未知'] = (regions[m.region || '未知'] || 0) + 1; });
  console.log('\n地区分布:');
  Object.entries(regions).sort((a, b) => b[1] - a[1]).forEach(([r, c]) => console.log('  ' + r + ': ' + c));
  console.log('\nAdded:', added, 'Final total:', qs.movie.length);
}

main().catch(e => { console.error(e); process.exit(1); });
