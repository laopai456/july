const fs = require('fs');
const { safeWriteData } = require('./lib/safe_write');
const {
  fetchWithCurrentYearPriority, fetchTagItems,
  fetchDetailsBatch,
  searchSupplementItems,
  fetchExploreSubjects,
  calculateHotScore,
  parallelLimit,
  getRequestCount, TOTAL_PER_CATEGORY, RATE_LIMIT, sleep
} = require('./lib/douban');
const { loadCategoryData, compareWithExisting, parseArgs, printHelp, DATA_FILE } = require('./lib/incremental');

const MOVIE_CATEGORIES = [
  {
    name: '中国',
    tags: [
      { tag: '电影,中国大陆', yearCount: 20, hotCount: 40 },
      { tag: '电影,台湾', yearCount: 20, hotCount: 20 },
      { tag: '电影,香港', yearCount: 20, hotCount: 20 }
    ]
  },
  {
    name: '日韩',
    tags: [
      { tag: '电影,日本', yearCount: 20, hotCount: 40 },
      { tag: '电影,韩国', yearCount: 20, hotCount: 40 },
      { tag: '电影,泰国', yearCount: 20, hotCount: 20 },
      { tag: '电影,印度', yearCount: 20, hotCount: 20 }
    ]
  },
  {
    name: '欧美',
    tags: [
      { tag: '电影,美国', yearCount: 20, hotCount: 40 },
      { tag: '电影,英国', yearCount: 20, hotCount: 20 },
      { tag: '电影,法国', yearCount: 20, hotCount: 20 },
      { tag: '电影,德国', yearCount: 20, hotCount: 20 },
      { tag: '电影,西班牙', yearCount: 20, hotCount: 20 },
      { tag: '电影,意大利', yearCount: 20, hotCount: 20 },
      { tag: '电影,俄罗斯', yearCount: 20, hotCount: 20 },
      { tag: '电影,加拿大', yearCount: 20, hotCount: 20 },
      { tag: '电影,澳大利亚', yearCount: 20, hotCount: 20 }
    ]
  }
];

const NON_MOVIE_PATTERNS = [
  '开幕式', '闭幕式', '春晚', '春节联欢晚会', '元宵晚会', '中秋晚会', '跨年晚会',
  '演唱会', '音乐会', '话剧', '歌剧', '舞剧', '音乐剧',
  '奥运会', '冬奥会', '世界杯', '亚运会', '全运会', '锦标赛', '决赛',
  '颁奖典礼', '颁奖礼', '金鸡奖', '金马奖', '金像奖', '奥斯卡',
  '发布会', '首映礼', '红毯', '脱口秀', '相声', '小品', '元宵喜乐会',
  '直播', '晚会', '盛典', ' Gala'
];

const EXCLUDED_GENRES = ['动画', '纪录片', '短片'];

const REGION_TO_SUBCATEGORY = {
  '中国大陆': '中国', '中国香港': '中国', '中国台湾': '中国',
  '日本': '日韩', '韩国': '日韩', '泰国': '日韩', '印度': '日韩',
  '美国': '欧美', '英国': '欧美', '法国': '欧美', '德国': '欧美',
  '西班牙': '欧美', '意大利': '欧美', '俄罗斯': '欧美', '加拿大': '欧美',
  '澳大利亚': '欧美', '新西兰': '欧美', '爱尔兰': '欧美', '荷兰': '欧美',
  '瑞典': '欧美', '丹麦': '欧美', '挪威': '欧美', '波兰': '欧美',
  '巴西': '欧美', '墨西哥': '欧美', '阿根廷': '欧美'
};

function getExpectedSubCategory(region) {
  if (!region) return null;
  const parts = region.split(/[\/\s,、]+/).map(s => s.trim()).filter(Boolean);
  for (const part of parts) {
    if (REGION_TO_SUBCATEGORY[part]) return REGION_TO_SUBCATEGORY[part];
  }
  return null;
}

function isRealMovie(title) {
  const lower = title.toLowerCase();
  return !NON_MOVIE_PATTERNS.some(p => lower.includes(p.toLowerCase()));
}

async function main() {
  const args = parseArgs();

  if (args.help) {
    printHelp('movie');
    return;
  }

  console.log('========================================');
  console.log('开始' + (args.full ? '全量' : '增量') + '更新电影数据');
  console.log('每分类: 20条显示 + 30条备用');
  console.log('========================================\n');

  // ========== 第1步: 加载现有索引 ==========
  const { indexMap, allData } = loadCategoryData('movie');
  console.log('现有索引: ' + indexMap.size + ' 条');

  // ========== 第2步: 抓取列表（当年优先 → 往年补齐，并行） ==========
  const allItems = [];
  const seenIds = new Set();

  for (const cat of MOVIE_CATEGORIES) {
    console.log('\n【获取 ' + cat.name + ' 电影】');

    const results = await parallelLimit(
      cat.tags.map(({ tag, yearCount, hotCount }) =>
        () => fetchWithCurrentYearPriority(tag, hotCount, { yearCount, logLabel: tag })
          .then(items => ({ tag, items }))
      ),
      RATE_LIMIT.maxConcurrent
    );

    for (const { tag, items } of results) {
      let count = 0;
      for (const item of items) {
        if (!seenIds.has(item.id)) {
          seenIds.add(item.id);
          allItems.push({ ...item, subCategory: cat.name });
          count++;
        }
      }
      console.log('  ' + tag + ': 去重后新增 ' + count + ' 条');
    }
  }

  console.log('\n【探索补充: 电影热门 (search_subjects)】');
  const exploreMovieItems = await fetchExploreSubjects('movie', '热门', 60);
  let exploreMovieNew = 0;
  for (const item of exploreMovieItems) {
    if (!seenIds.has(item.id)) {
      seenIds.add(item.id);
      allItems.push({ ...item, subCategory: '' });
      exploreMovieNew++;
    }
  }
  console.log('  [电影探索] ' + exploreMovieItems.length + ' 条, 新增 ' + exploreMovieNew + ' 条');

  for (const catName of ['中国', '日韩', '欧美']) {
    const supplementItems = await searchSupplementItems('movie_' + catName, seenIds, { subCategory: catName });
    for (const item of supplementItems) {
      allItems.push(item);
    }
  }

  console.log('\n共获取 ' + allItems.length + ' 条电影\n');

  // ========== 第3步: 比对索引，区分新增/已存在 ==========
  let itemsToFetch;

  if (allItems.length === 0) {
    console.log('无新增列表数据，直接用索引重新生成榜单\n');
    itemsToFetch = [];
  } else if (args.full) {
    itemsToFetch = allItems;
    console.log('强制全量: 需要获取详情 ' + itemsToFetch.length + ' 条\n');
  } else {
    const { newItems, stats } = compareWithExisting(allItems, indexMap);
    console.log('比对结果:');
    console.log('  新增: ' + stats.newCount + ' 条');
    console.log('  已存在: ' + stats.existingCount + ' 条 (跳过详情获取)\n');
    itemsToFetch = newItems;
  }

  // ========== 第4步: 抓取新增详情 ==========
  const newResults = await fetchDetailsBatch(itemsToFetch, { preferType: 'movie', useAbstract: true });

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
        region: item.region || '',
        abstract: item.abstract || '',
        lastUpdate: now
      });
    }
  }

  console.log('索引更新后: ' + indexMap.size + ' 条');

  // ========== 第6步: 从索引构建完整列表，计算热力分，过滤非电影/动画/region校验 ==========
  const allResults = [];
  let filteredCount = 0;
  let genreFilteredCount = 0;
  let regionMismatchCount = 0;
  for (const [doubanId, item] of indexMap) {
    if (!isRealMovie(item.title)) {
      filteredCount++;
      continue;
    }
    if (item.genres && item.genres.some(g => EXCLUDED_GENRES.includes(g))) {
      genreFilteredCount++;
      continue;
    }
    const expected = getExpectedSubCategory(item.region);
    if (expected && expected !== item.subCategory) {
      regionMismatchCount++;
      continue;
    }
    const hotScore = calculateHotScore(item.rate, item.year);
    allResults.push({
      ...item,
      doubanId: doubanId,
      hotScore: hotScore
    });
  }

  if (filteredCount > 0) {
    console.log('过滤非电影内容: ' + filteredCount + ' 条');
  }
  if (genreFilteredCount > 0) {
    console.log('过滤动画/纪录片/短片: ' + genreFilteredCount + ' 条');
  }
  if (regionMismatchCount > 0) {
    console.log('过滤地区不匹配: ' + regionMismatchCount + ' 条');
  }
  console.log('索引总量: ' + allResults.length + ' 条');

  // ========== 第7步: 分类排序截取 ==========
  const chineseItems = allResults.filter(i => i.subCategory === '中国').sort((a, b) => b.hotScore - a.hotScore).slice(0, TOTAL_PER_CATEGORY);
  const asiaItems = allResults.filter(i => i.subCategory === '日韩').sort((a, b) => b.hotScore - a.hotScore).slice(0, TOTAL_PER_CATEGORY);
  const westernItems = allResults.filter(i => i.subCategory === '欧美').sort((a, b) => b.hotScore - a.hotScore).slice(0, TOTAL_PER_CATEGORY);

  console.log('分类统计: 中国 ' + chineseItems.length + ' / 日韩 ' + asiaItems.length + ' / 欧美 ' + westernItems.length);

  const finalItems = [
    ...chineseItems.map((item, i) => ({ ...item, id: 'chinese_' + String(i + 1).padStart(3, '0') })),
    ...asiaItems.map((item, i) => ({ ...item, id: 'asia_' + String(i + 1).padStart(3, '0') })),
    ...westernItems.map((item, i) => ({ ...item, id: 'western_' + String(i + 1).padStart(3, '0') }))
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

  safeWriteData(dataToSave, { scriptName: 'fetch_movie' });

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
  console.log('总请求次数: ' + getRequestCount());
  if (savedRequests > 0) {
    console.log('节省请求: 约 ' + savedRequests + '%');
  }
  console.log('========================================');
}

module.exports = { main };

if (require.main === module) {
  main().catch(e => console.error('错误:', e.message));
}
