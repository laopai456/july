const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { loadCategoryData, compareWithExisting, saveData, parseArgs, printHelp, DATA_FILE } = require('./lib/incremental');

const DOUBAN_API = 'https://movie.douban.com/j';

const COOKIE = 'bid=rmXci4zuhOM; ll="108296"; _vwo_uuid_v2=D59C352040A1639E04E09902C371DD105|9678fa318ad695dac8c843b5c1c9a040; ct=y; _pk_ref.100001.8cb4=%5B%22%22%2C%22%22%2C1775882738%2C%22https%3A%2F%2Fwww.bing.com%2F%22%5D; _pk_id.100001.8cb4=2c2064abfd652ae3.1775882738.; _pk_ses.100001.8cb4=1; __utma=30149280.179540387.1769946188.1775475731.1775882738.6; __utmc=30149280; __utmz=30149280.1775882738.6.6.utmcsr=bing|utmccn=(organic)|utmcmd=organic|utmctr=(not%20provided); dbcl2="294605645:jC7dIJCo830"; ck=0r2i; ap_v=0,6.0; push_noty_num=0; push_doumail_num=0; __utmt=1; __utmv=30149280.29460; frodotk_db="99fc964026b41c93cdf5c2c0741c55b9"; __utmb=30149280.8.10.1775882738';

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

async function fetchList(tag, sort, start, limit) {
  const data = await fetchWithRetry(DOUBAN_API + '/new_search_subjects', { sort: sort || 'U', range: '0,10', tags: tag, start, limit });
  return data ? (data.data || []) : [];
}

async function fetchDetailByTitle(title) {
  const data = await fetchWithRetry(DOUBAN_API + '/subject_suggest', { q: title });
  if (!data || data.length === 0) return null;
  for (const item of data) {
    if (item.type === 'movie') return item;
  }
  return null;
}

function extractYear(text) {
  if (!text) return '';
  const match = text.match(/\((\d{4})\)/);
  return match ? match[1] : '';
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
  
  const { items: existingItems, indexMap, allData } = loadCategoryData('movie');
  console.log('加载现有数据: ' + existingItems.length + ' 条');
  
  const categories = [
    { name: '中国', tags: ['电影,中国大陆', '电影,台湾', '电影,香港'] },
    { name: '日韩', tags: ['电影,日本', '电影,韩国', '电影,泰国', '电影,印度'] },
    { name: '欧美', tags: ['电影,美国', '电影,英国', '电影,法国', '电影,德国', '电影,西班牙', '电影,意大利', '电影,俄罗斯', '电影,加拿大', '电影,澳大利亚'] }
  ];
  const allItems = [];
  const seenIds = new Set();
  
  for (const cat of categories) {
    console.log('\n【获取 ' + cat.name + ' 电影】');
    
    for (const tag of cat.tags) {
      console.log('  标签: ' + tag);
      for (let start = 0; start < 20; start += RATE_LIMIT.batchSize) {
        const batchNum = Math.floor(start / RATE_LIMIT.batchSize) + 1;
        process.stdout.write('\r    [批次 ' + batchNum + '] 获取第 ' + (start + 1) + '-' + Math.min(start + RATE_LIMIT.batchSize, 20) + ' 条...');
        
        const list = await fetchList(tag, 'U', start, RATE_LIMIT.batchSize);
        for (const item of list) {
          if (!seenIds.has(item.id)) { seenIds.add(item.id); allItems.push({ ...item, subCategory: cat.name }); }
        }
        
        if (start + RATE_LIMIT.batchSize < 20) {
          process.stdout.write(' 等待中...');
          await sleep(RATE_LIMIT.batchPause);
        }
      }
      console.log(' 完成');
    }
  }
  
  console.log('\n共获取 ' + allItems.length + ' 条电影\n');
  if (allItems.length === 0) { console.log('未获取到数据'); return; }
  
  const { newItems, existingItems: matchedItems, stats } = compareWithExisting(allItems, indexMap);
  
  console.log('比对结果:');
  console.log('  新增: ' + stats.newCount + ' 条');
  console.log('  已存在: ' + stats.existingCount + ' 条');
  console.log('  移除: ' + stats.removedCount + ' 条\n');
  
  const results = [];
  
  if (args.full) {
    console.log('强制全量更新...');
    
    for (let i = 0; i < allItems.length; i++) {
      const item = allItems[i];
      process.stdout.write('\r处理进度: ' + (i + 1) + '/' + allItems.length + ' (' + Math.round((i / allItems.length) * 100) + '%)...');
      
      const detail = await fetchDetailByTitle(item.title);
      
      let year = '';
      if (detail && detail.year) {
        year = detail.year;
      } else if (item.year) {
        year = item.year;
      } else if (detail && detail.sub_title) {
        year = extractYear(detail.sub_title);
      } else if (detail && detail.title) {
        year = extractYear(detail.title);
      }
      
      const hotScore = calculateHotScore(item.rate || 0, year);
      
      results.push({
        id: item.id,
        doubanId: item.id,
        title: item.title,
        rate: item.rate || '0',
        cover: item.cover || '',
        year: year,
        directors: item.directors || [],
        casts: item.casts || [],
        genres: detail ? (detail.genres || item.genres || []) : (item.genres || []),
        doubanUrl: 'https://movie.douban.com/subject/' + item.id + '/',
        hotScore: hotScore,
        subCategory: item.subCategory
      });
      
      if ((i + 1) % 8 === 0 && i + 1 < allItems.length) await sleep(RATE_LIMIT.batchPause);
    }
  } else if (stats.existingCount === 0) {
    console.log('首次运行，全量获取...');
    
    for (let i = 0; i < allItems.length; i++) {
      const item = allItems[i];
      process.stdout.write('\r处理进度: ' + (i + 1) + '/' + allItems.length + ' (' + Math.round((i / allItems.length) * 100) + '%)...');
      
      const detail = await fetchDetailByTitle(item.title);
      
      let year = '';
      if (detail && detail.year) {
        year = detail.year;
      } else if (item.year) {
        year = item.year;
      } else if (detail && detail.sub_title) {
        year = extractYear(detail.sub_title);
      } else if (detail && detail.title) {
        year = extractYear(detail.title);
      }
      
      const hotScore = calculateHotScore(item.rate || 0, year);
      
      results.push({
        id: item.id,
        doubanId: item.id,
        title: item.title,
        rate: item.rate || '0',
        cover: item.cover || '',
        year: year,
        directors: item.directors || [],
        casts: item.casts || [],
        genres: detail ? (detail.genres || item.genres || []) : (item.genres || []),
        doubanUrl: 'https://movie.douban.com/subject/' + item.id + '/',
        hotScore: hotScore,
        subCategory: item.subCategory
      });
      
      if ((i + 1) % 8 === 0 && i + 1 < allItems.length) await sleep(RATE_LIMIT.batchPause);
    }
  } else {
    console.log('增量更新: 只获取新增数据详情...');
    console.log('新增: ' + stats.newCount + ' 条, 已存在: ' + stats.existingCount + ' 条 (跳过详情获取)\n');
    
    for (let i = 0; i < newItems.length; i++) {
      const item = newItems[i];
      process.stdout.write('\r处理新数据: ' + (i + 1) + '/' + newItems.length + ' (' + Math.round((i / newItems.length) * 100) + '%)...');
      
      const detail = await fetchDetailByTitle(item.title);
      
      let year = '';
      if (detail && detail.year) {
        year = detail.year;
      } else if (item.year) {
        year = item.year;
      } else if (detail && detail.sub_title) {
        year = extractYear(detail.sub_title);
      } else if (detail && detail.title) {
        year = extractYear(detail.title);
      }
      
      const hotScore = calculateHotScore(item.rate || 0, year);
      
      results.push({
        id: item.id,
        doubanId: item.id,
        title: item.title,
        rate: item.rate || '0',
        cover: item.cover || '',
        year: year,
        directors: item.directors || [],
        casts: item.casts || [],
        genres: detail ? (detail.genres || item.genres || []) : (item.genres || []),
        doubanUrl: 'https://movie.douban.com/subject/' + item.id + '/',
        hotScore: hotScore,
        subCategory: item.subCategory
      });
      
      if ((i + 1) % 8 === 0 && i + 1 < newItems.length) await sleep(RATE_LIMIT.batchPause);
    }
    
    console.log('\n\n已存在数据: 直接使用，更新热力值...');
    
    for (const item of existingItems) {
      if (item.doubanId) {
        const matchedItem = matchedItems.find(m => m.id === item.doubanId);
        if (matchedItem) {
          item.rate = matchedItem.rate || item.rate;
        }
        item.hotScore = calculateHotScore(item.rate, item.year);
        results.push(item);
      }
    }
  }
  
  const chineseItems = results.filter(i => i.subCategory === '中国').sort((a, b) => b.hotScore - a.hotScore).slice(0, TOTAL_PER_CATEGORY);
  const asiaItems = results.filter(i => i.subCategory === '日韩').sort((a, b) => b.hotScore - a.hotScore).slice(0, TOTAL_PER_CATEGORY);
  const westernItems = results.filter(i => i.subCategory === '欧美').sort((a, b) => b.hotScore - a.hotScore).slice(0, TOTAL_PER_CATEGORY);
  
  console.log('\n\n分类统计: 中国 ' + chineseItems.length + ' / 日韩 ' + asiaItems.length + ' / 欧美 ' + westernItems.length);
  
  const finalItems = [
    ...chineseItems.map((item, i) => ({ ...item, id: 'chinese_' + String(i+1).padStart(3,'0') })),
    ...asiaItems.map((item, i) => ({ ...item, id: 'asia_' + String(i+1).padStart(3,'0') })),
    ...westernItems.map((item, i) => ({ ...item, id: 'western_' + String(i+1).padStart(3,'0') }))
  ];
  
  const { itemCount, indexCount } = saveData('movie', finalItems, allData, 'movieIndex');
  
  console.log('\n各分类前5部:');
  console.log('\n【中国】');
  chineseItems.slice(0, 5).forEach((item, i) => console.log('  ' + (i + 1) + '. ' + item.title + ' (' + (item.year || '未知') + ') - 评分' + item.rate + ' 热力' + item.hotScore));
  console.log('\n【日韩】');
  asiaItems.slice(0, 5).forEach((item, i) => console.log('  ' + (i + 1) + '. ' + item.title + ' (' + (item.year || '未知') + ') - 评分' + item.rate + ' 热力' + item.hotScore));
  console.log('\n【欧美】');
  westernItems.slice(0, 5).forEach((item, i) => console.log('  ' + (i + 1) + '. ' + item.title + ' (' + (item.year || '未知') + ') - 评分' + item.rate + ' 热力' + item.hotScore));
  
  const savedRequests = indexMap.size > 0 && !args.full ? Math.round((stats.existingCount / allItems.length) * 100) : 0;
  
  console.log('\n========================================');
  console.log('电影数据已保存到 data.json');
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
