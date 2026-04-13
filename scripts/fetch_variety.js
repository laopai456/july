const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { loadCategoryData, compareWithExisting, saveData, parseArgs, printHelp, DATA_FILE } = require('./lib/incremental');

const DOUBAN_API = 'https://movie.douban.com/j';

const COOKIE = 'bid=rmXci4zuhOM; ll="108296"; _vwo_uuid_v2=D59C352040A1639E04E09902C371DD105|9678fa318ad695dac8c843b5c1c9a040; ct=y; _pk_id.100001.8cb4=2c2064abfd652ae3.1775882738.; dbcl2="294605645:jC7dIJCo830"; push_noty_num=0; push_doumail_num=0; __utmv=30149280.29460; __yadk_uid=GuE5SO9dsCF2AGbIx4ZJi1CDvnYI2IJ5; ck=0r2i; _pk_ref.100001.8cb4=%5B%22%22%2C%22%22%2C1776015224%2C%22https%3A%2F%2Fwww.bing.com%2F%22%5D; _pk_ses.100001.8cb4=1; ap_v=0,6.0; frodotk_db="a4b959990041755fee2c0ccb00c4601d"; __utma=30149280.179540387.1769946188.1775932681.1776015224.8; __utmc=30149280; __utmz=30149280.1776015224.8.8.utmcsr=bing|utmccn=(organic)|utmcmd=organic|utmctr=(not%20provided); __utmt=1; __utmb=30149280.4.10.1776015224';

const DISPLAY_COUNT = 20;
const BACKUP_COUNT = 30;
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
        await sleep(10000);
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

async function fetchList(start, limit, tag = '综艺') {
  const data = await fetchWithRetry(DOUBAN_API + '/new_search_subjects', { tags: tag, start, limit });
  if (data && data.msg) {
    console.log('\n  [API消息] ' + data.msg);
  }
  return data ? (data.data || []) : [];
}

async function fetchDetailByTitle(title, doubanId) {
  const data = await fetchWithRetry(DOUBAN_API + '/subject_suggest', { q: title });
  if (!data || data.length === 0) return null;
  if (doubanId) {
    const matched = data.find(item => item.id === doubanId);
    if (matched) return matched;
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
      actors: data.subject.actors || []
    };
  }
  return null;
}

function calculateHotScore(rating, year) {
  const currentYear = new Date().getFullYear();
  const itemYear = parseInt(year) || currentYear;
  const yearDiff = currentYear - itemYear;
  
  let timeBonus;
  if (yearDiff === 0) {
    timeBonus = 150;
  } else if (yearDiff === 1) {
    timeBonus = 100;
  } else if (yearDiff === 2) {
    timeBonus = 60;
  } else if (yearDiff === 3) {
    timeBonus = 30;
  } else if (yearDiff === 4) {
    timeBonus = 10;
  } else if (yearDiff <= 6) {
    timeBonus = -5;
  } else {
    timeBonus = -15;
  }
  
  const rate = parseFloat(rating) || 0;
  let rateBonus = 0;
  if (rate > 0) {
    rateBonus = Math.round((rate - 6) * 2);
  }
  
  const hotScore = Math.max(10, timeBonus + rateBonus);
  
  return hotScore;
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

function getSubCategory(title, types) {
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
  
  const normalized = title.toLowerCase();
  
  for (const p of musicPatterns) {
    if (normalized.includes(p.toLowerCase())) return '音综';
  }
  for (const p of comedyPatterns) {
    if (normalized.includes(p.toLowerCase())) return '喜剧';
  }
  return '真人秀';
}

const FOREIGN_KEYWORDS = [
  '韩国', '日本', '美国', '英国', 'Korean', 'Japanese', 'American',
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
  '麻浦帅小伙', 'Rap: Public', '新人歌手曹政奭', '超级乐队',
  '基和皮尔', 'Key & Peele',
  '康熙来了', '锵锵三人行', '锵锵行天下', '天天向上', '快乐大本营', '非正式会谈',
  '十三邀', '圆桌派', '第一人称复数',
  '虽然没准备什么菜'
];

function isChineseVariety(title) {
  if (!title) return true;
  
  for (const keyword of FOREIGN_KEYWORDS) {
    if (title.toLowerCase().includes(keyword.toLowerCase())) {
      return false;
    }
  }
  
  const koreanPattern = /[\uAC00-\uD7AF]/;
  if (koreanPattern.test(title)) {
    return false;
  }
  
  return true;
}

async function main() {
  const args = parseArgs();
  
  if (args.help) {
    printHelp('variety');
    return;
  }
  
  console.log('========================================');
  console.log('开始' + (args.full ? '全量' : '增量') + '更新综艺数据');
  console.log('每分类: ' + DISPLAY_COUNT + '条显示 + ' + BACKUP_COUNT + '条备用');
  console.log('========================================\n');
  
  const { items: existingItems, indexMap, allData } = loadCategoryData('variety');
  console.log('加载现有数据: ' + existingItems.length + ' 条');
  
  const allItems = [];
  const seenIds = new Set();
  
  const tags = ['综艺', '综艺,音乐', '综艺,脱口秀'];
  for (const tag of tags) {
    console.log('\n[获取' + tag + '类型]');
    for (let start = 0; start < 60; start += RATE_LIMIT.batchSize) {
      const batchNum = Math.floor(start / RATE_LIMIT.batchSize) + 1;
      process.stdout.write('\r[批次 ' + batchNum + '] 获取第 ' + (start + 1) + '-' + Math.min(start + RATE_LIMIT.batchSize, 60) + ' 条...');
      
      const list = await fetchList(start, RATE_LIMIT.batchSize, tag);
      if (start === 0 && list.length > 0) {
        console.log('\n  [调试] 第一条数据:', JSON.stringify(list[0], null, 2));
      }
      for (const item of list) {
        if (!seenIds.has(item.id)) { seenIds.add(item.id); allItems.push(item); }
      }
      
      if (start + RATE_LIMIT.batchSize < 60) {
        await sleep(RATE_LIMIT.batchPause);
      }
    }
    console.log('\n[' + tag + '] 完成');
  }
  
  console.log('\n\n共获取 ' + allItems.length + ' 条综艺');
  
  const beforeFilter = allItems.length;
  const filteredItems = allItems.filter(item => isChineseVariety(item.title));
  const filtered = beforeFilter - filteredItems.length;
  console.log('过滤国外综艺: ' + filtered + ' 条, 剩余 ' + filteredItems.length + ' 条\n');
  
  if (filteredItems.length === 0) { console.log('未获取到数据'); return; }
  
  const { newItems, existingItems: matchedItems, stats } = compareWithExisting(filteredItems, indexMap);
  
  console.log('比对结果:');
  console.log('  新增: ' + stats.newCount + ' 条');
  console.log('  已存在: ' + stats.existingCount + ' 条\n');
  
  const results = [];
  
  if (args.full) {
    console.log('强制全量更新...');
    
    for (let i = 0; i < allItems.length; i++) {
      const item = allItems[i];
      process.stdout.write('\r处理进度: ' + (i + 1) + '/' + allItems.length + ' (' + Math.round((i / allItems.length) * 100) + '%)...');
      
      const detail = await fetchDetailByTitle(item.title, item.id);
      const abstract = await fetchSubjectAbstract(item.id);
      
      let year = '';
      if (detail && detail.year) {
        year = detail.year;
      }
      if (!year && item.year) {
        year = item.year;
      }
      if (!year && detail && detail.sub_title) {
        year = extractYear(detail.sub_title);
      }
      if (!year && detail && detail.title) {
        year = extractYear(detail.title);
      }
      
      const hotScore = calculateHotScore(item.rate || 0, year);
      const subCategory = getSubCategory(item.title, abstract ? abstract.types : null);
      
      results.push({
        id: item.id,
        doubanId: item.id,
        title: item.title,
        rate: item.rate || '0',
        cover: item.cover || '',
        year: year,
        directors: abstract ? abstract.directors : (item.directors || []),
        casts: abstract ? abstract.actors : (item.casts || []),
        genres: abstract ? abstract.types : [],
        doubanUrl: 'https://movie.douban.com/subject/' + item.id + '/',
        hotScore: hotScore,
        subCategory: subCategory
      });
      
      if ((i + 1) % 8 === 0 && i + 1 < allItems.length) await sleep(RATE_LIMIT.batchPause);
    }
  } else if (stats.existingCount === 0) {
    console.log('首次运行，全量获取...');
    
    for (let i = 0; i < allItems.length; i++) {
      const item = allItems[i];
      process.stdout.write('\r处理进度: ' + (i + 1) + '/' + allItems.length + ' (' + Math.round((i / allItems.length) * 100) + '%)...');
      
      const detail = await fetchDetailByTitle(item.title, item.id);
      const abstract = await fetchSubjectAbstract(item.id);
      
      let year = '';
      if (detail && detail.year) {
        year = detail.year;
      }
      if (!year && item.year) {
        year = item.year;
      }
      if (!year && detail && detail.sub_title) {
        year = extractYear(detail.sub_title);
      }
      if (!year && detail && detail.title) {
        year = extractYear(detail.title);
      }
      
      const hotScore = calculateHotScore(item.rate || 0, year);
      const subCategory = getSubCategory(item.title, abstract ? abstract.types : null);
      
      results.push({
        id: item.id,
        doubanId: item.id,
        title: item.title,
        rate: item.rate || '0',
        cover: item.cover || '',
        year: year,
        directors: abstract ? abstract.directors : (item.directors || []),
        casts: abstract ? abstract.actors : (item.casts || []),
        genres: abstract ? abstract.types : [],
        doubanUrl: 'https://movie.douban.com/subject/' + item.id + '/',
        hotScore: hotScore,
        subCategory: subCategory
      });
      
      if ((i + 1) % 8 === 0 && i + 1 < allItems.length) await sleep(RATE_LIMIT.batchPause);
    }
  } else {
    console.log('增量更新: 只获取新增数据详情...');
    console.log('新增: ' + stats.newCount + ' 条, 已存在: ' + stats.existingCount + ' 条 (跳过详情获取)\n');
    
    for (let i = 0; i < newItems.length; i++) {
      const item = newItems[i];
      process.stdout.write('\r处理新数据: ' + (i + 1) + '/' + newItems.length + ' (' + Math.round((i / newItems.length) * 100) + '%)...');
      
      const detail = await fetchDetailByTitle(item.title, item.id);
      const abstract = await fetchSubjectAbstract(item.id);
      
      let year = '';
      if (detail && detail.year) {
        year = detail.year;
      }
      if (!year && item.year) {
        year = item.year;
      }
      if (!year && detail && detail.sub_title) {
        year = extractYear(detail.sub_title);
      }
      if (!year && detail && detail.title) {
        year = extractYear(detail.title);
      }
      
      const hotScore = calculateHotScore(item.rate || 0, year);
      const subCategory = getSubCategory(item.title, abstract ? abstract.types : null);
      
      results.push({
        id: item.id,
        doubanId: item.id,
        title: item.title,
        rate: item.rate || '0',
        cover: item.cover || '',
        year: year,
        directors: abstract ? abstract.directors : (item.directors || []),
        casts: abstract ? abstract.actors : (item.casts || []),
        genres: abstract ? abstract.types : [],
        doubanUrl: 'https://movie.douban.com/subject/' + item.id + '/',
        hotScore: hotScore,
        subCategory: subCategory
      });
      
      if ((i + 1) % 8 === 0 && i + 1 < newItems.length) await sleep(RATE_LIMIT.batchPause);
    }
    
    console.log('\n\n已存在数据: 更新热力值...');
    
    let matchedCount = 0;
    let historyCount = 0;
    
    for (const item of existingItems) {
      if (item.doubanId) {
        const matchedItem = matchedItems.find(m => m.id === item.doubanId);
        if (matchedItem) {
          item.rate = matchedItem.rate || item.rate;
          matchedCount++;
        } else {
          historyCount++;
        }
        item.hotScore = calculateHotScore(item.rate, item.year);
        results.push(item);
      }
    }
    
    console.log('  匹配更新: ' + matchedCount + ' 条');
    console.log('  历史保留: ' + historyCount + ' 条');
  }
  
  console.log('\n\n统计: 成功 ' + results.length + ' 条\n');
  
  const showItems = results.filter(i => i.subCategory === '真人秀').sort((a, b) => b.hotScore - a.hotScore).slice(0, TOTAL_PER_CATEGORY);
  const comedyItems = results.filter(i => i.subCategory === '喜剧').sort((a, b) => b.hotScore - a.hotScore).slice(0, TOTAL_PER_CATEGORY);
  const musicItems = results.filter(i => i.subCategory === '音综').sort((a, b) => b.hotScore - a.hotScore).slice(0, TOTAL_PER_CATEGORY);
  
  console.log('分类统计: 真人秀 ' + showItems.length + ' / 喜剧 ' + comedyItems.length + ' / 音综 ' + musicItems.length);
  
  const finalItems = [
    ...showItems.map((item, i) => ({ ...item, id: 'show_' + String(i+1).padStart(3,'0') })),
    ...comedyItems.map((item, i) => ({ ...item, id: 'comedy_' + String(i+1).padStart(3,'0') })),
    ...musicItems.map((item, i) => ({ ...item, id: 'music_' + String(i+1).padStart(3,'0') }))
  ];
  
  const allIndex = {};
  const now = new Date().toISOString().split('T')[0];
  for (const item of results) {
    if (item.doubanId) {
      allIndex['douban_' + item.doubanId] = {
        title: item.title,
        rate: item.rate,
        year: item.year,
        cover: item.cover,
        directors: item.directors || [],
        casts: item.casts || [],
        genres: item.genres || [],
        subCategory: item.subCategory || '',
        lastUpdate: now
      };
    }
  }
  
  const dataToSave = {
    ...allData,
    variety: finalItems,
    varietyIndex: allIndex,
    varietyUpdatedAt: new Date().toISOString()
  };
  
  fs.writeFileSync(DATA_FILE, JSON.stringify(dataToSave, null, 2));
  
  const itemCount = finalItems.length;
  const indexCount = Object.keys(allIndex).length;
  
  console.log('\n各分类前5部:');
  console.log('\n【真人秀】');
  showItems.slice(0, 5).forEach((item, i) => console.log('  ' + (i + 1) + '. ' + item.title + ' (' + (item.year || '未知') + ') - 评分' + item.rate + ' 热力' + item.hotScore));
  console.log('\n【喜剧】');
  comedyItems.slice(0, 5).forEach((item, i) => console.log('  ' + (i + 1) + '. ' + item.title + ' (' + (item.year || '未知') + ') - 评分' + item.rate + ' 热力' + item.hotScore));
  console.log('\n【音综】');
  musicItems.slice(0, 5).forEach((item, i) => console.log('  ' + (i + 1) + '. ' + item.title + ' (' + (item.year || '未知') + ') - 评分' + item.rate + ' 热力' + item.hotScore));
  
  const savedRequests = indexMap.size > 0 && !args.full ? Math.round((stats.existingCount / allItems.length) * 100) : 0;
  
  console.log('\n========================================');
  console.log('综艺数据已保存到 data.json');
  console.log('保存数据: ' + itemCount + ' 条');
  console.log('生成索引: ' + indexCount + ' 条');
  console.log('总请求次数: ' + requestCount);
  if (savedRequests > 0) {
    console.log('节省请求: 约 ' + savedRequests + '%');
  }
  console.log('========================================');
}

module.exports = { main };

if (require.main === module) {
  main().catch(e => console.error('错误:', e.message));
}
