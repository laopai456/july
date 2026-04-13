const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { loadCategoryData, compareWithExisting, parseArgs, printHelp, DATA_FILE } = require('./lib/incremental');

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

async function fetchList(tag, start, limit) {
  const data = await fetchWithRetry(DOUBAN_API + '/new_search_subjects', { tags: tag, start, limit });
  return data ? (data.data || []) : [];
}

async function fetchDetailByTitle(title, doubanId) {
  const data = await fetchWithRetry(DOUBAN_API + '/subject_suggest', { q: title });
  if (!data || data.length === 0) return null;
  if (doubanId) {
    const matched = data.find(item => item.id === doubanId);
    if (matched) return matched;
  }
  for (const item of data) {
    if (item.type === 'movie') return item;
  }
  return null;
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
  
  return Math.max(10, timeBonus + rateBonus);
}

async function main() {
  const args = parseArgs();
  
  if (args.help) {
    printHelp('movie');
    return;
  }
  
  console.log('========================================');
  console.log('开始' + (args.full ? '全量' : '增量') + '更新电影数据');
  console.log('每分类: ' + DISPLAY_COUNT + '条显示 + ' + BACKUP_COUNT + '条备用');
  console.log('========================================\n');
  
  // ========== 第1步: 加载现有索引 ==========
  const { indexMap, allData } = loadCategoryData('movie');
  console.log('现有索引: ' + indexMap.size + ' 条');
  
  // ========== 第2步: 抓取列表 ==========
  const categories = [
    { name: '中国', tags: [{ tag: '电影,中国大陆', count: 40 }, { tag: '电影,台湾', count: 20 }, { tag: '电影,香港', count: 20 }] },
    { name: '日韩', tags: [{ tag: '电影,日本', count: 40 }, { tag: '电影,韩国', count: 40 }, { tag: '电影,泰国', count: 20 }, { tag: '电影,印度', count: 20 }] },
    { name: '欧美', tags: [{ tag: '电影,美国', count: 40 }, { tag: '电影,英国', count: 20 }, { tag: '电影,法国', count: 20 }, { tag: '电影,德国', count: 20 }, { tag: '电影,西班牙', count: 20 }, { tag: '电影,意大利', count: 20 }, { tag: '电影,俄罗斯', count: 20 }, { tag: '电影,加拿大', count: 20 }, { tag: '电影,澳大利亚', count: 20 }] }
  ];
  const allItems = [];
  const seenIds = new Set();
  
  for (const cat of categories) {
    console.log('\n【获取 ' + cat.name + ' 电影】');
    
    for (const { tag, count } of cat.tags) {
      console.log('  标签: ' + tag + ' (最多' + count + '条)');
      for (let start = 0; start < count; start += RATE_LIMIT.batchSize) {
        const batchNum = Math.floor(start / RATE_LIMIT.batchSize) + 1;
        process.stdout.write('\r    [批次 ' + batchNum + '] 获取第 ' + (start + 1) + '-' + Math.min(start + RATE_LIMIT.batchSize, count) + ' 条...');
        
        const list = await fetchList(tag, start, RATE_LIMIT.batchSize);
        for (const item of list) {
          if (!seenIds.has(item.id)) { seenIds.add(item.id); allItems.push({ ...item, subCategory: cat.name }); }
        }
        
        if (start + RATE_LIMIT.batchSize < count) {
          process.stdout.write(' 等待中...');
          await sleep(RATE_LIMIT.batchPause);
        }
      }
      console.log(' 完成');
    }
  }
  
  console.log('\n共获取 ' + allItems.length + ' 条电影\n');
  if (allItems.length === 0) { console.log('未获取到数据'); return; }
  
  // ========== 第3步: 比对索引，区分新增/已存在 ==========
  let itemsToFetch;
  
  if (args.full) {
    itemsToFetch = allItems;
    console.log('强制全量: 需要获取详情 ' + itemsToFetch.length + ' 条\n');
  } else {
    const { newItems, existingItems: matchedItems, stats } = compareWithExisting(allItems, indexMap);
    console.log('比对结果:');
    console.log('  新增: ' + stats.newCount + ' 条');
    console.log('  已存在: ' + stats.existingCount + ' 条 (跳过详情获取)\n');
    itemsToFetch = newItems;
  }
  
  // ========== 第4步: 抓取新增详情 ==========
  const newResults = [];
  
  for (let i = 0; i < itemsToFetch.length; i++) {
    const item = itemsToFetch[i];
    process.stdout.write('\r获取详情: ' + (i + 1) + '/' + itemsToFetch.length + ' (' + Math.round((i / itemsToFetch.length) * 100) + '%)...');
    
    const detail = await fetchDetailByTitle(item.title, item.id);
    
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
    
    newResults.push({
      doubanId: item.id,
      title: item.title,
      rate: item.rate || '0',
      cover: item.cover || '',
      year: year,
      directors: item.directors || [],
      casts: item.casts || [],
      genres: detail ? (detail.genres || item.genres || []) : (item.genres || []),
      subCategory: item.subCategory
    });
    
    if ((i + 1) % 8 === 0 && i + 1 < itemsToFetch.length) await sleep(RATE_LIMIT.batchPause);
  }
  
  console.log('\n详情获取完成: ' + newResults.length + ' 条');
  
  // ========== 第5步: 合并数据，更新索引 ==========
  const now = new Date().toISOString().split('T')[0];
  
  for (const item of newResults) {
    if (item.doubanId) {
      indexMap.set(item.doubanId, {
        title: item.title,
        rate: item.rate,
        year: item.year,
        cover: item.cover,
        directors: item.directors || [],
        casts: item.casts || [],
        genres: item.genres || [],
        subCategory: item.subCategory || '',
        lastUpdate: now
      });
    }
  }
  
  console.log('索引更新后: ' + indexMap.size + ' 条');
  
  // ========== 第6步: 从索引构建完整列表，计算热力分 ==========
  const allResults = [];
  for (const [doubanId, item] of indexMap) {
    const hotScore = calculateHotScore(item.rate, item.year);
    allResults.push({
      ...item,
      doubanId: doubanId,
      hotScore: hotScore
    });
  }
  
  console.log('索引总量: ' + allResults.length + ' 条');
  
  // ========== 第7步: 分类排序截取 ==========
  const chineseItems = allResults.filter(i => i.subCategory === '中国').sort((a, b) => b.hotScore - a.hotScore).slice(0, TOTAL_PER_CATEGORY);
  const asiaItems = allResults.filter(i => i.subCategory === '日韩').sort((a, b) => b.hotScore - a.hotScore).slice(0, TOTAL_PER_CATEGORY);
  const westernItems = allResults.filter(i => i.subCategory === '欧美').sort((a, b) => b.hotScore - a.hotScore).slice(0, TOTAL_PER_CATEGORY);
  
  console.log('分类统计: 中国 ' + chineseItems.length + ' / 日韩 ' + asiaItems.length + ' / 欧美 ' + westernItems.length);
  
  const finalItems = [
    ...chineseItems.map((item, i) => ({ ...item, id: 'chinese_' + String(i+1).padStart(3,'0') })),
    ...asiaItems.map((item, i) => ({ ...item, id: 'asia_' + String(i+1).padStart(3,'0') })),
    ...westernItems.map((item, i) => ({ ...item, id: 'western_' + String(i+1).padStart(3,'0') }))
  ];
  
  // ========== 第8步: 保存 ==========
  const allIndex = {};
  for (const [doubanId, item] of indexMap) {
    allIndex['douban_' + doubanId] = item;
  }
  
  const dataToSave = {
    ...allData,
    movie: finalItems,
    movieIndex: allIndex,
    movieUpdatedAt: new Date().toISOString()
  };
  
  fs.writeFileSync(DATA_FILE, JSON.stringify(dataToSave, null, 2));
  
  // ========== 输出统计 ==========
  console.log('\n各分类前5部:');
  console.log('\n【中国】');
  chineseItems.slice(0, 5).forEach((item, i) => console.log('  ' + (i + 1) + '. ' + item.title + ' (' + (item.year || '未知') + ') - 评分' + item.rate + ' 热力' + item.hotScore));
  console.log('\n【日韩】');
  asiaItems.slice(0, 5).forEach((item, i) => console.log('  ' + (i + 1) + '. ' + item.title + ' (' + (item.year || '未知') + ') - 评分' + item.rate + ' 热力' + item.hotScore));
  console.log('\n【欧美】');
  westernItems.slice(0, 5).forEach((item, i) => console.log('  ' + (i + 1) + '. ' + item.title + ' (' + (item.year || '未知') + ') - 评分' + item.rate + ' 热力' + item.hotScore));
  
  const savedRequests = !args.full && allItems.length > 0
    ? Math.round(((allItems.length - itemsToFetch.length) / allItems.length) * 100)
    : 0;
  
  console.log('\n========================================');
  console.log('电影数据已保存到 data.json');
  console.log('展示数据: ' + finalItems.length + ' 条');
  console.log('完整索引: ' + Object.keys(allIndex).length + ' 条');
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
