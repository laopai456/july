const axios = require('axios');

const DOUBAN_API = 'https://movie.douban.com/j';

const COOKIE = 'bid=rmXci4zuhOM; ll="108296"; _vwo_uuid_v2=D59C352040A1639E04E09902C371DD105|9678fa318ad695dac8c843b5c1c9a040; ct=y; _pk_id.100001.8cb4=2c2064abfd652ae3.1775882738.; dbcl2="294605645:jC7dIJCo830"; push_noty_num=0; push_doumail_num=0; __utmv=30149280.29460; __yadk_uid=GuE5SO9dsCF2AGbIx4ZJi1CDvnYI2IJ5; ck=0r2i; _pk_ref.100001.8cb4=%5B%22%22%2C%22%22%2C1776015224%2C%22https%3A%2F%2Fwww.bing.com%2F%22%5D; _pk_ses.100001.8cb4=1; ap_v=0,6.0; frodotk_db="a4b959990041755fee2c0ccb00c4601d"; __utma=30149280.179540387.1769946188.1775932681.1776015224.8; __utmc=30149280; __utmz=30149280.1776015224.8.8.utmcsr=bing|utmccn=(organic)|utmcmd=organic|utmctr=(not%20provided); __utmt=1; __utmb=30149280.4.10.1776015224';

const RATE_LIMIT = {
  minDelay: 3000,
  maxDelay: 5000,
  requestTimeout: 30000,
  maxRetries: 5,
  batchSize: 20,
  batchPause: 10000,
  maxConcurrent: 2,
  banCooldown: 60000
};

const DISPLAY_COUNT = 100;
const BACKUP_COUNT = 100;
const TOTAL_PER_CATEGORY = DISPLAY_COUNT + BACKUP_COUNT;

let requestCount = 0;
let lastRequestTime = 0;

function randomDelay(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function parallelLimit(tasks, limit) {
  const results = [];
  let index = 0;

  async function worker(workerId) {
    while (index < tasks.length) {
      const i = index++;
      if (i > 0) await sleep(randomDelay(1000, 2000));
      results[i] = await tasks[i]();
    }
  }

  const workers = Array.from({ length: Math.min(limit, tasks.length) }, (_, i) => worker(i));
  await Promise.all(workers);
  return results;
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
        const banWait = RATE_LIMIT.banCooldown * Math.min(attempt, 3);
        console.log('\n[限流] 被豆瓣限流，等待 ' + (banWait / 1000) + ' 秒后重试...');
        await sleep(banWait);
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

async function fetchList(tag, start, limit, yearRange = '', sort = '', extraParams = {}) {
  const params = { tags: tag, start, limit, ...extraParams };
  if (yearRange) params.year_range = yearRange;
  if (sort) params.sort = sort;
  const data = await fetchWithRetry(DOUBAN_API + '/new_search_subjects', params);
  if (data && data.msg) {
    console.log('\n  [API消息] ' + data.msg);
  }
  if (!data) return { items: [], total: 0 };
  const items = data.data || [];
  const total = data.total || (items.length < limit ? start + items.length : start + items.length + 1);
  return { items, total };
}

async function fetchDetailByTitle(title, doubanId, preferType = null) {
  const data = await fetchWithRetry(DOUBAN_API + '/subject_suggest', { q: title });
  if (!data || data.length === 0) return null;
  if (doubanId) {
    const matched = data.find(item => item.id === doubanId);
    if (matched) return matched;
  }
  if (preferType === 'tv') {
    const typed = data.find(item => item.episode && item.episode !== '');
    if (typed) return typed;
  }
  return data[0];
}

async function fetchSubjectAbstract(subjectId) {
  const data = await fetchWithRetry(DOUBAN_API + '/subject_abstract', { subject_id: subjectId });
  if (data && data.subject) {
    return {
      types: data.subject.types || [],
      region: data.subject.region || '',
      directors: data.subject.directors || [],
      actors: data.subject.actors || [],
      abstract: ''
    };
  }
  return null;
}

async function fetchSubjectSummary(subjectId) {
  try {
    await waitForRateLimit();
    const url = 'https://m.douban.com/subject/' + subjectId + '/';
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1',
        'Accept': 'text/html',
        'Referer': 'https://m.douban.com/'
      },
      timeout: RATE_LIMIT.requestTimeout
    });
    const html = typeof response.data === 'string' ? response.data : '';
    if (html.length < 5000) return '';

    let summary = '';
    const sectionMatch = html.match(/<section\s+class="subject-intro">[\s\S]*?<p[^>]*>\s*([\s\S]*?)<\/p>/);
    if (sectionMatch) {
      summary = sectionMatch[1].replace(/<[^>]+>/g, '').trim();
    }
    if (!summary) {
      const metaMatch = html.match(/<meta\s+name="description"\s+content="[^"]*简介[：:]([^"]+)"/);
      if (metaMatch) {
        summary = metaMatch[1];
      }
    }
    if (summary) {
      return summary.replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&#39;/g, "'").replace(/&nbsp;/g, ' ').trim();
    }
    return '';
  } catch (e) {
    return '';
  }
}

function extractYear(text) {
  if (!text) return '';
  let match = text.match(/\((\d{4})\)/);
  if (match) return match[1];
  match = text.match(/(\d{4})年/);
  if (match) return match[1];
  match = text.match(/\b(19\d{2}|20\d{2})\b/);
  if (match) return match[1];
  return '';
}

function calculateHotScore(rating, year) {
  const currentYear = new Date().getFullYear();
  const itemYear = parseInt(year);

  if (!itemYear || itemYear < 1990 || itemYear > currentYear + 1) {
    const rate = parseFloat(rating) || 0;
    return rate > 0 ? Math.min(15, Math.round(rate * 1.5)) : 0;
  }

  const yearDiff = Math.max(0, currentYear - itemYear);
  const timeScore = Math.max(0, 200 - yearDiff * 40);

  const rate = parseFloat(rating) || 0;
  const rateBonus = rate > 0 ? Math.min(15, Math.round(rate * 1.5)) : 0;

  return timeScore + rateBonus;
}

const FOREIGN_KEYWORDS = [
  '泰版', '泰剧', '泰国版',
  '男人们的恋爱', '我的咖啡男友', '少年星球', '再次出发',
  '背叛者', '秘密朋友俱乐部', '野兽游戏',
  '韩国', '韩元', '日本', '美国', '英国', 'Korean', 'Japanese', 'American',
  'Running Man', '无限挑战', '新西游记', '我独自生活', '认识的哥哥',
  '爬梯子', 'EXO', 'exo', 'Exo',
  'Happy Together', 'Radio Star', '音乐银行', '人气歌谣', 'M COUNTDOWN',
  '蒙面歌王', '我家的熊孩子', '同床异梦', '妻子的味道', '三时三餐',
  '尹食堂', '姜食堂', '两天一夜', '超人回来了', '人生酒馆', '黄金渔场',
  '白钟元', '林中小屋', '暑假', '露营', '地球娱乐室', '海妖的呼唤',
  'The Zone', '犯罪现场', '女高推理', '魔鬼的计谋', '四个愿望',
  'Hacks', 'Netflix', 'HBO', 'BBC',
  '绝望写手',
  '请回答', '豆豆笑笑', '搞笑演唱会', 'Gag Concert', '寻笑人',
  'SNL Korea', '全知干预视角', '玩什么好呢', '闲着干嘛呢', '刘QUIZ',
  'You Quiz', '文明特急', '爱豆房', 'idol Room', '一周的偶像', 'After School Club',
  '单身即地狱', '地狱', '李瑞镇', '达拉达拉', '体能之巅', 'Physical',
  '换乘恋爱', 'heart signal', 'Heart Signal', '黑话律师', 'Big Mouth',
  '异能', 'Moving', '鱿鱼游戏', 'Squid Game', '黑暗荣耀', 'Glory',
  '小镇魔发师', '怪奇谜案', '天机试炼场', '天下烘焙', '给我钱',
  '朴宝剑', '李相二', '郭东延', '郑智薰', '李龙真', '朴成奎', '李惠利',
  '全炫茂', '申东熙', '姜智荣', '朴娜莱', '朴河宣', '李多熙', '金美贤',
  '禹智皓', '申效涉', '李星和', '权爀禹', '朴宰范',
  'Biong Biong', '黑白厨师', '思想验证区域', '三傻游肯尼亚', '豆豆饭饭', '恋爱女子宿舍',
  '超时空辉夜姬', '泰勒·汤姆林森',
  '格莱美', 'Grammy', '奥斯卡', '金球奖', '艾美奖', 'Emmy',
  '风向GO', '风向go',
  '麻浦帅小伙', 'Rap: Public', '新人歌手曹政奭', '超级乐队',
  '基和皮尔', 'Key & Peele',
  '康熙来了', '锵锵三人行', '锵锵行天下', '天天向上', '快乐大本营', '非正式会谈',
  '十三邀', '圆桌派', '第一人称复数',
  '虽然没准备什么菜'
];

const NON_VARIETY_TYPES = ['纪录片', '电影', '电视剧', '动画'];

const NON_VARIETY_TITLES = ['不讨好的勇气', '哈哈不哈哈', '综艺大热门', '综艺玩很大', '超级星光大道', '康熙来了', '我猜我猜', '娱乐百分百', '全民最大党', '国光帮帮忙', '黑涩会', '模范棒棒堂', '型男大主厨', '食尚玩家', '天才冲冲冲', '女人我最大', '大学生了没', '小明星大跟班', '超级红人榜', '飢饿游戏', '木曜4超玩'];

const CHINESE_REGIONS = ['中国大陆', '中国香港'];

function isChineseVariety(title, genres, region) {
  if (!title) return true;

  if (region && !CHINESE_REGIONS.some(r => region.includes(r))) {
    return false;
  }

  for (const t of NON_VARIETY_TITLES) {
    if (title.includes(t)) return false;
  }

  if (genres && genres.length > 0) {
    const typeStr = genres.join(' ');
    for (const t of NON_VARIETY_TYPES) {
      if (typeStr.includes(t)) return false;
    }
  }

  const englishPattern = /[a-zA-Z]{3,}/;
  if (englishPattern.test(title)) {
    const chineseChars = (title.match(/[\u4e00-\u9fff]/g) || []).length;
    if (chineseChars < 2) return false;
  }

  for (const keyword of FOREIGN_KEYWORDS) {
    if (title.toLowerCase().includes(keyword.toLowerCase())) {
      return false;
    }
  }

  const koreanPattern = /[\uAC00-\uD7AF]/;
  if (koreanPattern.test(title)) {
    return false;
  }

  const thaiPattern = /[\u0E00-\u0E7F]/;
  if (thaiPattern.test(title)) {
    return false;
  }

  return true;
}

const CULTURE_PATTERNS = ['朗读者', '局部', '博物奇妙夜', '博物', '国家宝藏', '见字如面',
  '典籍里的中国', '经典咏流传', '故事里的中国', '诗意', '读书', '开讲啦',
  '十三邀', '圆桌派', '锵锵', '第一人称复数', '谈话', '见字如面',
  '拜托了冰箱', '中餐厅', '向往的生活', '朋友请听好', '声临其境',
  '奇遇人生', '毛雪汪', '幻乐之城'];

const NON_COMEDY_TITLES = ['奇葩说', '奇葩大会', '今晚80后', '今晚80后脱口秀'];

function getSubCategory(title, types) {
  const normalized = title.toLowerCase();

  for (const p of CULTURE_PATTERNS) {
    if (normalized.includes(p.toLowerCase())) return '真人秀';
  }

  for (const p of NON_COMEDY_TITLES) {
    if (normalized.includes(p.toLowerCase())) return '真人秀';
  }

  if (types && types.length > 0) {
    const typeStr = types.join(' ');
    if (typeStr.includes('音乐')) return '音综';
    if (typeStr.includes('喜剧') || typeStr.includes('脱口秀')) return '喜剧';
  }

  const musicPatterns = ['音乐', '歌唱', '歌手', '唱歌', '声音', '好声音', '我是歌手',
    '超级女声', '快乐男声', '创造营', '青春有你', '偶像练习生',
    '乘风', '披荆斩棘', '舞蹈', '跳舞', '舞者', '街舞', '舞蹈风暴',
    '选秀', '偶像', '练习生', '出道', '成团', '蒙面唱', '蒙面歌王',
    '天赐的声音', '声入人心', '我们的歌', '时光音乐会', '乐队的夏天',
    '说唱', '明日之子', '创造101', '以团之名', '音综', '乐队'];

  const comedyPatterns = ['喜剧', '搞笑', '脱口秀', '吐槽', '段子', '欢乐', '开心', '爆笑',
    '笑傲', '喜剧人', '喜剧大赛', '一年一度', '喜人', '欢乐喜剧', '主咖', '喜友秀', '今夜'];

  for (const p of musicPatterns) {
    if (normalized.includes(p.toLowerCase())) return '音综';
  }
  for (const p of comedyPatterns) {
    if (normalized.includes(p.toLowerCase())) return '喜剧';
  }
  return '真人秀';
}

async function fetchTagItems(tag, count, yearRange = '', sort = '', extraParams = {}) {
  const items = [];
  for (let start = 0; start < count; start += RATE_LIMIT.batchSize) {
    const batchNum = Math.floor(start / RATE_LIMIT.batchSize) + 1;
    process.stdout.write('\r    [批次 ' + batchNum + '] 获取第 ' + (start + 1) + '-' + Math.min(start + RATE_LIMIT.batchSize, count) + ' 条...');

    const result = await fetchList(tag, start, RATE_LIMIT.batchSize, yearRange, sort, extraParams);
    items.push(...result.items);

    if (start + RATE_LIMIT.batchSize < count) {
      process.stdout.write(' 等待中...');
      await sleep(RATE_LIMIT.batchPause);
    }
  }
  console.log(' 完成');
  return items;
}

async function fetchTagTotal(tag, yearRange = '', sort = '', extraParams = {}) {
  const result = await fetchList(tag, 0, 1, yearRange, sort, extraParams);
  return result.total;
}

async function fetchWithCurrentYearPriority(tag, hotCount, options = {}) {
  const currentYear = new Date().getFullYear();
  const yearRange = currentYear + ',' + currentYear;
  const lastYearRange = (currentYear - 1) + ',' + (currentYear - 1);
  const { logLabel = tag, minYearCount: optMinYear = 50, maxYearCount = 200, yearRatio = 0.4, recentCount = 50, yearOnly = false, extraParams = {}, yearCount: optYearCount, lastYearCount: optLastYear } = options;
  const minYearCount = optYearCount !== undefined ? optYearCount : optMinYear;
  const lastYearCount = optLastYear !== undefined ? optLastYear : 50;

  const allItems = [];
  const seenIds = new Set();

  console.log('\n  [探测' + logLabel + '当年总量]');
  const yearTotal = await fetchTagTotal(tag, yearRange, '', extraParams);
  const yearCount = Math.min(maxYearCount, Math.max(minYearCount, Math.ceil(yearTotal * yearRatio)));
  console.log('  [' + logLabel + ' 当年总量: ' + yearTotal + ' 条, 按' + (yearRatio * 100) + '%比例取 ' + yearCount + ' 条]');

  console.log('  [获取' + logLabel + ' - 当年热度]');
  const yearItems = await fetchTagItems(tag, yearCount, yearRange, '', extraParams);
  for (const item of yearItems) {
    if (!seenIds.has(item.id)) {
      seenIds.add(item.id);
      allItems.push(item);
    }
  }
  console.log('  [' + logLabel + ' 当年热度] ' + yearItems.length + ' 条, 去重后 ' + allItems.length + ' 条');

  console.log('  [获取' + logLabel + ' - 当年最新(按时间排序)]');
  const recentItems = await fetchTagItems(tag, recentCount, yearRange, 'R', extraParams);
  let recentNew = 0;
  for (const item of recentItems) {
    if (!seenIds.has(item.id)) {
      seenIds.add(item.id);
      allItems.push(item);
      recentNew++;
    }
  }
  console.log('  [' + logLabel + ' 当年最新] ' + recentItems.length + ' 条, 新增 ' + recentNew + ' 条');

  console.log('  [获取' + logLabel + ' - 去年热度补充]');
  const lastYearItems = await fetchTagItems(tag, Math.min(yearCount, lastYearCount), lastYearRange, '', extraParams);
  let lastYearNew = 0;
  for (const item of lastYearItems) {
    if (!seenIds.has(item.id)) {
      seenIds.add(item.id);
      allItems.push(item);
      lastYearNew++;
    }
  }
  console.log('  [' + logLabel + ' 去年补充] ' + lastYearItems.length + ' 条, 新增 ' + lastYearNew + ' 条');

  if (!yearOnly && hotCount > 0) {
    console.log('  [获取' + logLabel + ' - 往年热门补充]');
    const hotItems = await fetchTagItems(tag, hotCount, '', '', extraParams);
    let supplementCount = 0;
    for (const item of hotItems) {
      if (!seenIds.has(item.id)) {
        seenIds.add(item.id);
        allItems.push(item);
        supplementCount++;
      }
    }
    console.log('  [' + logLabel + ' 往年补充] ' + supplementCount + ' 条');
  }

  return allItems;
}

async function fetchDetailForItem(item, options = {}) {
  const { preferType = null, useAbstract = false } = options;

  const detail = await fetchDetailByTitle(item.title, item.id, preferType);

  if (preferType === 'tv' && detail && detail.episode !== undefined && detail.episode === '') {
    return null;
  }

  let abstract = null;
  let summary = '';
  if (useAbstract && detail && detail.id) {
    abstract = await fetchSubjectAbstract(detail.id);
    summary = await fetchSubjectSummary(detail.id);
  }

  let year = '';
  if (detail && detail.year) year = detail.year;
  if (!year && item.year) year = item.year;
  if (!year && detail && detail.sub_title) year = extractYear(detail.sub_title);
  if (!year && detail && detail.title) year = extractYear(detail.title);

  const result = {
    doubanId: item.id,
    title: item.title,
    rate: item.rate || '0',
    cover: item.cover || '',
    year: year,
    directors: abstract ? abstract.directors : (item.directors || []),
    casts: abstract ? abstract.actors : (item.casts || []),
    genres: abstract ? abstract.types : (detail ? (detail.genres || item.genres || []) : (item.genres || [])),
    subCategory: item.subCategory || '',
    abstract: summary || (abstract ? abstract.abstract : ''),
    region: abstract ? abstract.region : (item.region || '')
  };

  return result;
}

async function fetchDetailsBatch(itemsToFetch, options = {}) {
  const { onProgress, batchPauseEvery = 8 } = options;
  const results = [];

  for (let i = 0; i < itemsToFetch.length; i++) {
    const item = itemsToFetch[i];
    if (onProgress) {
      onProgress(i, itemsToFetch.length);
    } else {
      process.stdout.write('\r获取详情: ' + (i + 1) + '/' + itemsToFetch.length + ' (' + Math.round((i / itemsToFetch.length) * 100) + '%)...');
    }

    const result = await fetchDetailForItem(item, options);
    results.push(result);

    if ((i + 1) % batchPauseEvery === 0 && i + 1 < itemsToFetch.length) {
      await sleep(RATE_LIMIT.batchPause);
    }
  }

  return results;
}

async function loadSupplement(category) {
  const fs = require('fs');
  const path = require('path');
  const supplementPath = path.join(__dirname, '..', 'supplement.json');
  if (!fs.existsSync(supplementPath)) return [];

  const supplement = JSON.parse(fs.readFileSync(supplementPath, 'utf8'));
  return supplement[category] || [];
}

async function searchSupplementItems(category, seenIds, options = {}) {
  const titles = await loadSupplement(category);
  if (titles.length === 0) return [];

  const fs = require('fs');
  const path = require('path');
  let scheduleMap = {};
  if (options.schedulePath) {
    try { scheduleMap = JSON.parse(fs.readFileSync(options.schedulePath, 'utf8')) } catch (e) {}
  }

  const currentMonth = new Date().getMonth() + 1;
  const currentYear = new Date().getFullYear();
  const norm = t => t.replace(/[\s！!：:·\-—]/g, '').replace(/第/g, '').replace(/季/g, '').replace(/1/g, '一').replace(/2/g, '二').replace(/3/g, '三').replace(/4/g, '四').replace(/5/g, '五').replace(/6/g, '六').replace(/7/g, '七').replace(/8/g, '八').replace(/9/g, '九').replace(/0/g, '零');
  const filteredTitles = titles.filter(title => {
    if (scheduleMap && Object.keys(scheduleMap).length > 0) {
      const nt = norm(title);
      for (const key of Object.keys(scheduleMap)) {
        const nk = norm(key);
        if (nt.includes(nk) || nk.includes(nt)) {
          if (scheduleMap[key] > currentMonth) return false;
        }
      }
    }
    return true;
  });

  const subCategory = options.subCategory || '';
  const skipped = titles.length - filteredTitles.length;
  console.log('\n[补充搜索: ' + filteredTitles.length + ' 个作品' + (skipped > 0 ? ', 跳过未播出 ' + skipped + ' 个' : '') + ']');
  const items = [];
  for (const title of filteredTitles) {
    const detail = await fetchDetailByTitle(title);
    if (detail && detail.id && !seenIds.has(detail.id)) {
      const year = parseInt(detail.year) || 0;
      if (year > 0 && year < currentYear - 1) {
        console.log('  跳过(年份不匹配): ' + (detail.title || title) + ' (' + detail.year + ')');
        continue;
      }
      seenIds.add(detail.id);
      items.push({
        id: detail.id,
        title: detail.title || title,
        rate: '0',
        cover: detail.img || '',
        year: detail.year || '',
        directors: [],
        casts: [],
        genres: detail.type ? [detail.type] : [],
        subCategory: subCategory
      });
      console.log('  补充: ' + (detail.title || title) + ' (' + (detail.year || '未知') + ')' + (subCategory ? ' [' + subCategory + ']' : ''));
    }
  }
  return items;
}

function getRequestCount() {
  return requestCount;
}

function resetRequestCount() {
  requestCount = 0;
  lastRequestTime = 0;
}

module.exports = {
  DOUBAN_API,
  RATE_LIMIT,
  DISPLAY_COUNT,
  BACKUP_COUNT,
  TOTAL_PER_CATEGORY,
  sleep,
  randomDelay,
  parallelLimit,
  getHeaders,
  waitForRateLimit,
  fetchWithRetry,
  fetchList,
  fetchDetailByTitle,
  fetchSubjectAbstract,
  fetchSubjectSummary,
  extractYear,
  calculateHotScore,
  FOREIGN_KEYWORDS,
  isChineseVariety,
  getSubCategory,
  fetchTagItems,
  fetchTagTotal,
  fetchWithCurrentYearPriority,
  fetchDetailForItem,
  fetchDetailsBatch,
  loadSupplement,
  searchSupplementItems,
  getRequestCount,
  resetRequestCount
};
