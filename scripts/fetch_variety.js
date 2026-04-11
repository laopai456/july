const axios = require('axios');
const fs = require('fs');
const path = require('path');

const DOUBAN_API = 'https://movie.douban.com/j';

const COOKIE = 'bid=rmXci4zuhOM; ll="108296"; _vwo_uuid_v2=D59C352040A1639E04E09902C371DD105|9678fa318ad695dac8c843b5c1c9a040; ct=y; _pk_ref.100001.8cb4=%5B%22%22%2C%22%22%2C1775882738%2C%22https%3A%2F%2Fwww.bing.com%2F%22%5D; _pk_id.100001.8cb4=2c2064abfd652ae3.1775882738.; _pk_ses.100001.8cb4=1; __utma=30149280.179540387.1769946188.1775475731.1775882738.6; __utmc=30149280; __utmz=30149280.1775882738.6.6.utmcsr=bing|utmccn=(organic)|utmcmd=organic|utmctr=(not%20provided); dbcl2="294605645:jC7dIJCo830"; ck=0r2i; ap_v=0,6.0; push_noty_num=0; push_doumail_num=0; __utmt=1; __utmv=30149280.29460; frodotk_db="99fc964026b41c93cdf5c2c0741c55b9"; __utmb=30149280.8.10.1775882738';

const COMEDY_PATTERNS = [
  '喜剧', '搞笑', '脱口秀', '吐槽', '段子', '欢乐', '开心', '爆笑',
  '笑傲', '喜剧人', '喜剧大赛', '一年一度', '喜人', '欢乐喜剧'
];

const MUSIC_PATTERNS = [
  '音乐', '歌唱', '歌手', '唱歌', '声音', '好声音', '我是歌手',
  '超级女声', '快乐男声', '创造营', '青春有你', '偶像练习生',
  '乘风', '披荆斩棘', '舞蹈', '跳舞', '舞者', '街舞', '舞蹈风暴',
  '选秀', '偶像', '练习生', '出道', '成团', '蒙面唱', '蒙面歌王',
  '天赐的声音', '声入人心', '我们的歌', '时光音乐会', '乐队的夏天',
  '说唱', '明日之子', '创造101', '以团之名', '音综', '乐队'
];

const VARIETY_GENRES = ['真人秀', '脱口秀', '综艺', '选秀', '音乐', '游戏', '竞技', '搞笑', '喜剧', '访谈', '生活', '旅行', '美食', '情感', '恋爱'];

const FOREIGN_KEYWORDS = [
  '韩国', '日本', '美国', '英国', 'Korean', 'Japanese', 'American',
  'Running Man', '无限挑战', '新西游记', '我独自生活', '认识的哥哥',
  'Happy Together', 'Radio Star', '音乐银行', '人气歌谣', 'M COUNTDOWN',
  '蒙面歌王', '我家的熊孩子', '同床异梦', '妻子的味道', '三时三餐',
  '尹食堂', '姜食堂', '两天一夜', '超人回来了', '人生酒馆', '黄金渔场',
  '白钟元', '林中小屋', '暑假', '露营', '地球娱乐室', '海妖的呼唤',
  'The Zone', '犯罪现场', '女高推理', '魔鬼的计谋', '四个愿望',
  'Hacks', 'Netflix', 'HBO', 'BBC',
  '请回答', '豆豆笑笑', '搞笑演唱会', 'Gag Concert', '寻笑人',
  'SNL Korea', '全知干预视角', '玩什么好呢', '闲着干嘛呢', '刘QUIZ',
  'You Quiz', '文明特急', '爱豆房', 'idol Room', '一周的偶像', 'After School Club',
  '单身即地狱', '地狱', '李瑞镇', '达拉达拉', '体能之巅', 'Physical',
  '换乘恋爱', 'heart signal', 'Heart Signal', '黑话律师', 'Big Mouth',
  '异能', 'Moving', '鱿鱼游戏', 'Squid Game', '黑暗荣耀', 'Glory'
];

const DISPLAY_COUNT = 10;
const BACKUP_COUNT = 0;
const TOTAL_PER_CATEGORY = DISPLAY_COUNT + BACKUP_COUNT;

const RATE_LIMIT = {
  minDelay: 3000,
  maxDelay: 5000,
  requestTimeout: 30000,
  maxRetries: 5,
  batchSize: 20,
  batchPause: 10000
};

let requestCount = 0;
let lastRequestTime = 0;

function randomDelay(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
];

function getRandomUA() {
  return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
}

function getHeaders() {
  return {
    'User-Agent': getRandomUA(),
    'Accept': 'application/json, text/plain, */*',
    'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
    'Referer': 'https://movie.douban.com/explore',
    'Cookie': COOKIE
  };
}

async function waitForRateLimit() {
  const now = Date.now();
  const elapsed = now - lastRequestTime;
  const requiredDelay = randomDelay(RATE_LIMIT.minDelay, RATE_LIMIT.maxDelay);
  if (elapsed < requiredDelay) await sleep(requiredDelay - elapsed);
  lastRequestTime = Date.now();
  requestCount++;
}

async function fetchWithRetry(url, params) {
  for (let attempt = 1; attempt <= RATE_LIMIT.maxRetries; attempt++) {
    try {
      await waitForRateLimit();
      const response = await axios.get(url, { params, headers: getHeaders(), timeout: RATE_LIMIT.requestTimeout });
      if (response.data && response.data.msg === '检测到有异常请求') {
        await sleep(20000);
        continue;
      }
      return response.data;
    } catch (e) {
      if (attempt === RATE_LIMIT.maxRetries) return null;
      await sleep(randomDelay(3000, 5000));
    }
  }
  return null;
}

async function fetchList(start, limit) {
  const data = await fetchWithRetry(DOUBAN_API + '/new_search_subjects', { sort: 'U', range: '0,10', tags: '综艺', start, limit });
  return data ? (data.data || []) : [];
}

async function fetchDetailByTitle(title) {
  const data = await fetchWithRetry(DOUBAN_API + '/subject_suggest', { q: title });
  console.log('  [调试] 搜索 "' + title + '" 返回:', data ? (Array.isArray(data) ? data.length + '条' : JSON.stringify(data).substring(0, 100)) : 'null');
  return (data && data.length > 0) ? data[0] : null;
}

function normalizeText(text) {
  return (text || '').replace(/[！？。，、；：""''【】《》（）\s\-\_\.\!\?\,\;\:\"\'\[\]\(\)]/g, '').replace(/第[一二三四五六七八九十\d]+季/g, '').replace(/\d+/g, '').toLowerCase();
}

function matchPattern(text, patterns) {
  const normalized = normalizeText(text);
  for (const p of patterns) { if (normalized.includes(normalizeText(p))) return true; }
  return false;
}

function getSubCategory(title, genres) {
  const allText = title + ' ' + (genres || []).join(' ');
  if (matchPattern(allText, MUSIC_PATTERNS)) return '音综';
  if (matchPattern(allText, COMEDY_PATTERNS)) return '喜剧';
  return '真人秀';
}

function isChineseVariety(title, detail, casts) {
  const combinedText = title + ' ' + (detail ? (detail.sub_title || '') : '');
  
  for (const keyword of FOREIGN_KEYWORDS) {
    if (combinedText.toLowerCase().includes(keyword.toLowerCase())) {
      return false;
    }
  }
  
  if (detail && detail.sub_title) {
    const subTitle = detail.sub_title;
    if (/^[A-Za-z]+$/.test(subTitle) && subTitle.length >= 4) {
      return false;
    }
  }
  
  const koreanPattern = /[\uAC00-\uD7AF]/;
  if (koreanPattern.test(title)) {
    return false;
  }
  
  if (casts && casts.length > 0) {
    const koreanSurnames = ['金', '李', '朴', '崔', '郑', '姜', '赵', '尹', '张', '林', '吴', '韩', '申', '权', '全', '禹'];
    let koreanCount = 0;
    for (const cast of casts) {
      const name = cast.split(' ')[0];
      if (koreanSurnames.includes(name) || koreanPattern.test(cast)) {
        koreanCount++;
      }
    }
    if (koreanCount >= casts.length * 0.5) {
      return false;
    }
  }
  
  return true;
}

function isVarietyType(genres) {
  if (!genres || genres.length === 0) return true;
  for (const g of genres) {
    if (VARIETY_GENRES.includes(g)) return true;
  }
  return false;
}

function calculateHotScore(rating, year) {
  const currentYear = new Date().getFullYear();
  const itemYear = parseInt(year) || currentYear;
  const yearDiff = currentYear - itemYear;
  
  let baseScore = 100;
  
  let timeBonus;
  if (yearDiff === 0) {
    timeBonus = 50;
  } else if (yearDiff === 1) {
    timeBonus = 30;
  } else if (yearDiff === 2) {
    timeBonus = 10;
  } else if (yearDiff === 3) {
    timeBonus = 0;
  } else if (yearDiff === 4) {
    timeBonus = -10;
  } else {
    timeBonus = -20;
  }
  
  const rate = parseFloat(rating) || 0;
  const rateBonus = rate > 0 ? Math.round(rate * 2) : 0;
  
  const hotScore = Math.max(10, baseScore + timeBonus + rateBonus);
  
  return hotScore;
}

async function fetchCollectCount(id) {
  try {
    const url = 'https://movie.douban.com/subject/' + id + '/';
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Cookie': COOKIE
      },
      timeout: 10000
    });
    
    const html = response.data;
    const match = html.match(/(\d+)人评价/);
    if (match) {
      return parseInt(match[1]);
    }
    
    const ratingMatch = html.match(/property="v:votes">(\d+)</);
    if (ratingMatch) {
      return parseInt(ratingMatch[1]);
    }
    
    return 0;
  } catch (e) {
    return 0;
  }
}

async function main() {
  console.log('========================================');
  console.log('开始获取综艺数据（测试模式 - 仅国产）');
  console.log('每分类: ' + DISPLAY_COUNT + '条 (测试)');
  console.log('========================================\n');
  
  const allItems = [];
  const seenIds = new Set();
  
  for (let start = 0; start < 60; start += RATE_LIMIT.batchSize) {
    const batchNum = Math.floor(start / RATE_LIMIT.batchSize) + 1;
    process.stdout.write('\r[批次 ' + batchNum + '/3] 获取第 ' + (start + 1) + '-' + Math.min(start + RATE_LIMIT.batchSize, 60) + ' 条...');
    
    const list = await fetchList(start, RATE_LIMIT.batchSize);
    for (const item of list) {
      if (!seenIds.has(item.id)) { seenIds.add(item.id); allItems.push(item); }
    }
    
    if (start + RATE_LIMIT.batchSize < 60) {
      process.stdout.write(' 等待中...');
      await sleep(RATE_LIMIT.batchPause);
    }
  }
  
  console.log('\n\n共获取 ' + allItems.length + ' 条综艺\n');
  if (allItems.length === 0) { console.log('未获取到数据'); return; }
  
  console.log('获取详细信息并过滤国外综艺...');
  const results = [];
  let filtered = 0, failed = 0;
  
  for (let i = 0; i < allItems.length; i++) {
    const item = allItems[i];
    process.stdout.write('\r处理进度: ' + (i + 1) + '/' + allItems.length + ' (' + Math.round((i / allItems.length) * 100) + '%)...');
    
    const detail = await fetchDetailByTitle(item.title);
    
    if (!detail) {
      console.log('\n  [警告] 未获取详情: ' + item.title + '，使用原始数据');
    }
    
    if (!isChineseVariety(item.title, detail, item.casts)) {
      filtered++;
      console.log('\n  [过滤] ' + item.title + ' (国外/韩综)');
      continue;
    }
    
    const itemGenres = detail ? (detail.genres || item.genres || []) : (item.genres || []);
    if (!isVarietyType(itemGenres)) {
      filtered++;
      console.log('\n  [过滤] ' + item.title + ' (非综艺类型: ' + itemGenres.join(',') + ')');
      continue;
    }
    
    const hotScore = calculateHotScore(item.rate || 0, detail ? detail.year : item.year);
    
    results.push({
      id: item.id,
      title: item.title,
      rate: item.rate || '0',
      cover: item.cover || '',
      year: detail ? (detail.year || item.year || '') : (item.year || ''),
      directors: item.directors || [],
      casts: item.casts || [],
      genres: itemGenres,
      doubanUrl: 'https://movie.douban.com/subject/' + item.id + '/',
      hotScore: hotScore
    });
    
    if ((i + 1) % 8 === 0 && i + 1 < allItems.length) await sleep(RATE_LIMIT.batchPause);
  }
  
  console.log('\n\n统计: 过滤 ' + filtered + ' 部国外, 失败 ' + failed + ' 部, 成功 ' + results.length + ' 部\n');
  
  const showItems = results.filter(i => getSubCategory(i.title, i.genres) === '真人秀').sort((a, b) => b.hotScore - a.hotScore).slice(0, TOTAL_PER_CATEGORY);
  const comedyItems = results.filter(i => getSubCategory(i.title, i.genres) === '喜剧').sort((a, b) => b.hotScore - a.hotScore).slice(0, TOTAL_PER_CATEGORY);
  const musicItems = results.filter(i => getSubCategory(i.title, i.genres) === '音综').sort((a, b) => b.hotScore - a.hotScore).slice(0, TOTAL_PER_CATEGORY);
  
  console.log('分类统计: 真人秀 ' + showItems.length + ' / 喜剧 ' + comedyItems.length + ' / 音综 ' + musicItems.length);
  
  const finalItems = [
    ...showItems.map((item, i) => ({ ...item, id: 'show_' + String(i+1).padStart(3,'0'), subCategory: '真人秀' })),
    ...comedyItems.map((item, i) => ({ ...item, id: 'comedy_' + String(i+1).padStart(3,'0'), subCategory: '喜剧' })),
    ...musicItems.map((item, i) => ({ ...item, id: 'music_' + String(i+1).padStart(3,'0'), subCategory: '音综' }))
  ];
  
  const outputPath = path.join(__dirname, '..', 'data.json');
  fs.writeFileSync(outputPath, JSON.stringify({ variety: finalItems, config: { displayCount: DISPLAY_COUNT, backupCount: BACKUP_COUNT } }, null, 2));
  
  console.log('\n各分类前5部:');
  console.log('\n【真人秀】');
  showItems.slice(0, 5).forEach((item, i) => console.log('  ' + (i + 1) + '. ' + item.title + ' (' + (item.year || '未知') + ') - 评分' + item.rate + ' 热力' + item.hotScore));
  console.log('\n【喜剧】');
  comedyItems.slice(0, 5).forEach((item, i) => console.log('  ' + (i + 1) + '. ' + item.title + ' (' + (item.year || '未知') + ') - 评分' + item.rate + ' 热力' + item.hotScore));
  console.log('\n【音综】');
  musicItems.slice(0, 5).forEach((item, i) => console.log('  ' + (i + 1) + '. ' + item.title + ' (' + (item.year || '未知') + ') - 评分' + item.rate + ' 热力' + item.hotScore));
  
  console.log('\n========================================');
  console.log('完成！总请求次数: ' + requestCount);
  console.log('========================================');
}

main().catch(e => console.error('错误:', e.message));
