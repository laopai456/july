const fs = require('fs');
const { safeWriteData } = require('./lib/safe_write');
const {
  fetchWithCurrentYearPriority,
  fetchDetailsBatch,
  searchSupplementItems,
  fetchExploreSubjects,
  calculateHotScore,
  parallelLimit,
  getRequestCount, TOTAL_PER_CATEGORY, RATE_LIMIT, sleep
} = require('./lib/douban');
const { loadCategoryData, compareWithExisting, findIncompleteInIndex, parseArgs, printHelp, DATA_FILE } = require('./lib/incremental');

const DRAMA_TAGS = [
  { tag: '电视剧', countries: '中国大陆,中国香港,中国台湾', subCategory: '国产剧', yearCount: 80, hotCount: 40 },
  { tag: '电视剧', countries: '韩国', subCategory: '韩剧', yearCount: 20, hotCount: 40 },
  { tag: '电视剧', countries: '日本', subCategory: '日剧', yearCount: 20, hotCount: 40 }
];

const EXCLUDED_GENRES = ['动画', '纪录片', '真人秀', '脱口秀'];

const REGION_TO_SUBCATEGORY = {
  '中国大陆': '国产剧', '中国香港': '国产剧', '中国台湾': '国产剧',
  '韩国': '韩剧',
  '日本': '日剧'
};

function getExpectedSubCategory(region) {
  if (!region) return null;
  const parts = region.split(/[\/\s,、]+/).map(s => s.trim()).filter(Boolean);
  for (const part of parts) {
    if (REGION_TO_SUBCATEGORY[part]) return REGION_TO_SUBCATEGORY[part];
  }
  return null;
}

async function main() {
  const args = parseArgs();

  if (args.help) {
    printHelp('drama');
    return;
  }

  console.log('========================================');
  console.log('开始' + (args.full ? '全量' : '增量') + '更新热剧数据');
  console.log('每分类: 20条显示 + 30条备用');
  console.log('========================================\n');

  // ========== 第1步: 加载现有索引 ==========
  const { indexMap, allData } = loadCategoryData('drama');
  console.log('现有索引: ' + indexMap.size + ' 条');

  // ========== 第2步: 抓取列表（当年优先 → 往年补齐） ==========
  const allItems = [];
  const seenIds = new Set();

  for (const { tag, countries, subCategory, yearCount, hotCount } of DRAMA_TAGS) {
    console.log('\n【获取 ' + subCategory + '】');
    const items = await fetchWithCurrentYearPriority(tag, hotCount, {
      yearCount,
      logLabel: subCategory,
      lastYearCount: subCategory === '国产剧' ? 120 : undefined,
      extraParams: countries ? { countries } : {}
    });
    for (const item of items) {
      if (!seenIds.has(item.id)) {
        seenIds.add(item.id);
        allItems.push({ ...item, subCategory });
      }
    }
  }

  const EXPLORE_TAGS = [
    { exploreTag: '国产剧', subCategory: '国产剧', count: 60 },
    { exploreTag: '韩剧', subCategory: '韩剧', count: 60 },
    { exploreTag: '日剧', subCategory: '日剧', count: 40 }
  ];

  for (const { exploreTag, subCategory, count } of EXPLORE_TAGS) {
    console.log('\n【探索补充: ' + subCategory + ' (search_subjects)】');
    const exploreItems = await fetchExploreSubjects('tv', exploreTag, count);
    let newCount = 0;
    for (const item of exploreItems) {
      if (!seenIds.has(item.id)) {
        seenIds.add(item.id);
        allItems.push({ ...item, subCategory });
        newCount++;
      }
    }
    console.log('  [' + subCategory + ' 探索] ' + exploreItems.length + ' 条, 新增 ' + newCount + ' 条');
  }

  for (const tag of ['国产剧', '韩剧', '日剧']) {
    const supplementItems = await searchSupplementItems('drama_' + tag, seenIds, { subCategory: tag });
    for (const item of supplementItems) {
      allItems.push(item);
    }
  }

  console.log('\n共获取 ' + allItems.length + ' 条热剧\n');

  // ========== 第3步: 比对索引，区分新增/已存在 ==========
  let itemsToFetch;

  if (allItems.length === 0) {
    console.log('无新增列表数据，直接用索引重新生成榜单\n');
    itemsToFetch = [];
  } else if (args.full) {
    itemsToFetch = allItems;
    console.log('强制全量: 需要获取详情 ' + itemsToFetch.length + ' 条\n');
  } else {
    const { newItems, refetchItems, stats } = compareWithExisting(allItems, indexMap);
    console.log('比对结果:');
    console.log('  新增: ' + stats.newCount + ' 条');
    console.log('  已存在: ' + stats.existingCount + ' 条 (跳过详情获取)');
    if (stats.refetchCount > 0) console.log('  数据不完整需补全: ' + stats.refetchCount + ' 条');

    const incompleteInIndex = findIncompleteInIndex(indexMap);
    const alreadyInFetch = new Set([...newItems, ...refetchItems].map(i => i.id));
    const extraRefetch = incompleteInIndex.filter(i => !alreadyInFetch.has(i.id));
    if (extraRefetch.length > 0) console.log('  索引中数据不完整(非当前API结果): ' + extraRefetch.length + ' 条');
    console.log('');

    itemsToFetch = [...newItems, ...refetchItems, ...extraRefetch];
  }

  // ========== 第4步: 抓取新增详情 ==========
  const newResults = await fetchDetailsBatch(itemsToFetch, { useAbstract: true, preferType: 'tv' });

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

  // ========== 第6步: 从索引构建完整列表，计算热力分，过滤动画/region校验 ==========
  const allResults = [];
  let genreFilteredCount = 0;
  let regionMismatchCount = 0;
  for (const [doubanId, item] of indexMap) {
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

  if (genreFilteredCount > 0) {
    console.log('过滤动画/纪录片: ' + genreFilteredCount + ' 条');
  }
  if (regionMismatchCount > 0) {
    console.log('过滤地区不匹配: ' + regionMismatchCount + ' 条');
  }

  console.log('索引总量: ' + allResults.length + ' 条');

  // ========== 第7步: 分类排序截取 ==========
  const chineseItems = allResults.filter(i => i.subCategory === '国产剧').sort((a, b) => b.hotScore - a.hotScore).slice(0, TOTAL_PER_CATEGORY);
  const koreanItems = allResults.filter(i => i.subCategory === '韩剧').sort((a, b) => b.hotScore - a.hotScore).slice(0, TOTAL_PER_CATEGORY);
  const japaneseItems = allResults.filter(i => i.subCategory === '日剧').sort((a, b) => b.hotScore - a.hotScore).slice(0, TOTAL_PER_CATEGORY);

  console.log('分类统计: 国产剧 ' + chineseItems.length + ' / 韩剧 ' + koreanItems.length + ' / 日剧 ' + japaneseItems.length);

  const finalItems = [
    ...chineseItems.map((item, i) => ({ ...item, id: 'chinese_' + String(i + 1).padStart(3, '0') })),
    ...koreanItems.map((item, i) => ({ ...item, id: 'korean_' + String(i + 1).padStart(3, '0') })),
    ...japaneseItems.map((item, i) => ({ ...item, id: 'japanese_' + String(i + 1).padStart(3, '0') }))
  ];

  // ========== 第8步: 保存 ==========
  const allIndex = {};
  for (const [doubanId, item] of indexMap) {
    allIndex['douban_' + doubanId] = item;
  }

  const dataToSave = {
    ...allData,
    drama: finalItems,
    dramaIndex: allIndex,
    dramaUpdatedAt: new Date().toISOString()
  };

  safeWriteData(dataToSave, { scriptName: 'fetch_drama' });

  // ========== 输出统计 ==========
  console.log('\n各分类前5部:');
  console.log('\n【国产剧】');
  chineseItems.slice(0, 5).forEach((item, i) => console.log('  ' + (i + 1) + '. ' + item.title + ' (' + (item.year || '未知') + ') - 评分' + item.rate + ' 热力' + item.hotScore));
  console.log('\n【韩剧】');
  koreanItems.slice(0, 5).forEach((item, i) => console.log('  ' + (i + 1) + '. ' + item.title + ' (' + (item.year || '未知') + ') - 评分' + item.rate + ' 热力' + item.hotScore));
  console.log('\n【日剧】');
  japaneseItems.slice(0, 5).forEach((item, i) => console.log('  ' + (i + 1) + '. ' + item.title + ' (' + (item.year || '未知') + ') - 评分' + item.rate + ' 热力' + item.hotScore));

  const savedRequests = !args.full && allItems.length > 0
    ? Math.round(((allItems.length - itemsToFetch.length) / allItems.length) * 100)
    : 0;

  console.log('\n========================================');
  console.log('热剧数据已保存到 data.json');
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
