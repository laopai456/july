const fs = require('fs');
const {
  fetchWithCurrentYearPriority, fetchSubjectAbstract,
  fetchDetailsBatch, searchSupplementItems,
  calculateHotScore, isChineseVariety, getSubCategory, parallelLimit,
  getRequestCount, TOTAL_PER_CATEGORY, RATE_LIMIT, sleep
} = require('./lib/douban');
const { loadCategoryData, compareWithExisting, parseArgs, printHelp, DATA_FILE } = require('./lib/incremental');

const VARIETY_TAGS = [
  { tag: '综艺', yearCount: 100, hotCount: 100 },
  { tag: '综艺,音乐', yearCount: 100, hotCount: 100 },
  { tag: '综艺,脱口秀', yearCount: 100, hotCount: 100 }
];

async function main() {
  const args = parseArgs();

  if (args.help) {
    printHelp('variety');
    return;
  }

  console.log('========================================');
  console.log('开始' + (args.full ? '全量' : '增量') + '更新综艺数据');
  console.log('每分类: 当年100条 + 热门100条, 去重后按子分类截取');
  console.log('========================================\n');

  // ========== 第1步: 加载现有索引 ==========
  const { indexMap, allData } = loadCategoryData('variety');
  console.log('现有索引: ' + indexMap.size + ' 条');

  // ========== 第2步: 抓取列表（当年优先 → 往年补齐） ==========
  const allItems = [];
  const seenIds = new Set();

  const varietyResults = await parallelLimit(
    VARIETY_TAGS.map(({ tag, yearCount, hotCount }) =>
      () => fetchWithCurrentYearPriority(tag, hotCount, { yearCount, logLabel: tag })
        .then(items => ({ items }))
    ),
    RATE_LIMIT.maxConcurrent
  );

  for (const { items } of varietyResults) {
    for (const item of items) {
      if (!seenIds.has(item.id)) { seenIds.add(item.id); allItems.push(item); }
    }
  }

  const supplementItems = await searchSupplementItems('variety', seenIds);
  for (const item of supplementItems) {
    allItems.push(item);
  }

  console.log('\n共获取列表: ' + allItems.length + ' 条');

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

  // ========== 第5步: 分类（综艺专用，已在详情中获取abstract） ==========
  for (let i = 0; i < newResults.length; i++) {
    const item = newResults[i];
    item.subCategory = getSubCategory(item.title, item.genres);
    if ((i + 1) % 20 === 0) process.stdout.write('\r分类处理: ' + (i + 1) + '/' + newResults.length + '...');
  }
  console.log('\n分类处理完成');

  // ========== 第6步: 合并数据，更新索引 ==========
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

  // ========== 第7步: 从索引构建完整列表，计算热力分，过滤 ==========
  const allResults = [];
  for (const [doubanId, item] of indexMap) {
    const hotScore = calculateHotScore(item.rate, item.year);
    const subCategory = getSubCategory(item.title, item.genres);
    item.subCategory = subCategory;
    allResults.push({
      ...item,
      doubanId: doubanId,
      hotScore: hotScore
    });
  }

  console.log('索引总量: ' + allResults.length + ' 条');

  const chineseItems = allResults.filter(item => isChineseVariety(item.title, item.genres));
  console.log('过滤国外综艺: ' + (allResults.length - chineseItems.length) + ' 条, 剩余 ' + chineseItems.length + ' 条');

  // ========== 第8步: 分类排序截取 ==========
  const showItems = chineseItems.filter(i => i.subCategory === '真人秀').sort((a, b) => b.hotScore - a.hotScore).slice(0, TOTAL_PER_CATEGORY);
  const comedyItems = chineseItems.filter(i => i.subCategory === '喜剧').sort((a, b) => b.hotScore - a.hotScore).slice(0, TOTAL_PER_CATEGORY);
  const musicItems = chineseItems.filter(i => i.subCategory === '音综').sort((a, b) => b.hotScore - a.hotScore).slice(0, TOTAL_PER_CATEGORY);

  console.log('分类统计: 真人秀 ' + showItems.length + ' / 喜剧 ' + comedyItems.length + ' / 音综 ' + musicItems.length);

  const finalItems = [
    ...showItems.map((item, i) => ({ ...item, id: 'show_' + String(i + 1).padStart(3, '0') })),
    ...comedyItems.map((item, i) => ({ ...item, id: 'comedy_' + String(i + 1).padStart(3, '0') })),
    ...musicItems.map((item, i) => ({ ...item, id: 'music_' + String(i + 1).padStart(3, '0') }))
  ];

  // ========== 第9步: 保存 ==========
  const allIndex = {};
  for (const [doubanId, item] of indexMap) {
    allIndex['douban_' + doubanId] = item;
  }

  const dataToSave = {
    ...allData,
    variety: finalItems,
    varietyIndex: allIndex,
    varietyUpdatedAt: new Date().toISOString()
  };

  fs.writeFileSync(DATA_FILE, JSON.stringify(dataToSave, null, 2));

  // ========== 输出统计 ==========
  console.log('\n各分类前5部:');
  console.log('\n【真人秀】');
  showItems.slice(0, 5).forEach((item, i) => console.log('  ' + (i + 1) + '. ' + item.title + ' (' + (item.year || '未知') + ') - 评分' + item.rate + ' 热力' + item.hotScore));
  console.log('\n【喜剧】');
  comedyItems.slice(0, 5).forEach((item, i) => console.log('  ' + (i + 1) + '. ' + item.title + ' (' + (item.year || '未知') + ') - 评分' + item.rate + ' 热力' + item.hotScore));
  console.log('\n【音综】');
  musicItems.slice(0, 5).forEach((item, i) => console.log('  ' + (i + 1) + '. ' + item.title + ' (' + (item.year || '未知') + ') - 评分' + item.rate + ' 热力' + item.hotScore));

  const savedRequests = !args.full && allItems.length > 0
    ? Math.round(((allItems.length - itemsToFetch.length) / allItems.length) * 100)
    : 0;

  console.log('\n========================================');
  console.log('综艺数据已保存到 data.json');
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
