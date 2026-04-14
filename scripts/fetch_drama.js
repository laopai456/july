const fs = require('fs');
const {
  fetchWithCurrentYearPriority,
  fetchDetailsBatch,
  calculateHotScore,
  parallelLimit,
  getRequestCount, TOTAL_PER_CATEGORY, RATE_LIMIT, sleep
} = require('./lib/douban');
const { loadCategoryData, compareWithExisting, parseArgs, printHelp, DATA_FILE } = require('./lib/incremental');

const DRAMA_TAGS = [
  { tag: '国产剧', yearCount: 20, hotCount: 40 },
  { tag: '韩剧', yearCount: 20, hotCount: 40 },
  { tag: '日剧', yearCount: 20, hotCount: 40 }
];

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

  const results = await parallelLimit(
    DRAMA_TAGS.map(({ tag, yearCount, hotCount }) =>
      () => fetchWithCurrentYearPriority(tag, hotCount, { yearCount, logLabel: tag })
        .then(items => ({ tag, items }))
    ),
    RATE_LIMIT.maxConcurrent
  );

  for (const { tag, items } of results) {
    console.log('\n【获取 ' + tag + '】');
    for (const item of items) {
      if (!seenIds.has(item.id)) {
        seenIds.add(item.id);
        allItems.push({ ...item, subCategory: tag });
      }
    }
  }

  console.log('\n共获取 ' + allItems.length + ' 条热剧\n');
  if (allItems.length === 0) { console.log('未获取到数据'); return; }

  // ========== 第3步: 比对索引，区分新增/已存在 ==========
  let itemsToFetch;

  if (args.full) {
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
  const newResults = await fetchDetailsBatch(itemsToFetch, { useAbstract: true });

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
        abstract: item.abstract || '',
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

  fs.writeFileSync(DATA_FILE, JSON.stringify(dataToSave, null, 2));

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
