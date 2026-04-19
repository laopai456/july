const fs = require('fs');
const {
  fetchWithCurrentYearPriority, fetchSubjectAbstract,
  fetchDetailsBatch, searchSupplementItems,
  calculateHotScore, isChineseVariety, parallelLimit,
  getRequestCount, TOTAL_PER_CATEGORY, RATE_LIMIT, sleep
} = require('./lib/douban');
const { loadCategoryData, compareWithExisting, parseArgs, printHelp, DATA_FILE } = require('./lib/incremental');

const VARIETY_TAGS = [
  { tag: '综艺', hotCount: 30, recentCount: 50 },
  { tag: '综艺,音乐', hotCount: 30, recentCount: 50 },
  { tag: '综艺,脱口秀', hotCount: 30, recentCount: 50 },
  { tag: '真人秀', hotCount: 0, recentCount: 50, yearOnly: true }
];

const VARIETY_DISPLAY_COUNT = 100;

let scheduleMap = {};
try { scheduleMap = JSON.parse(fs.readFileSync(__dirname + '/variety_schedule.json', 'utf8')) } catch (e) {}

function normalizeTitle(t) {
  return t.replace(/\s+/g, '').replace(/第/g, '').replace(/季/g, '')
}

async function main() {
  const args = parseArgs();

  if (args.help) {
    printHelp('variety');
    return;
  }

  console.log('========================================');
  console.log('开始' + (args.full ? '全量' : '增量') + '更新综艺数据');
  console.log('总榜单模式: 按热力值排序, 展示' + VARIETY_DISPLAY_COUNT + '条');
  console.log('========================================\n');

  const { indexMap, allData } = loadCategoryData('variety');
  console.log('现有索引: ' + indexMap.size + ' 条');

  const allItems = [];
  const seenIds = new Set();

  const varietyResults = await parallelLimit(
    VARIETY_TAGS.map(({ tag, hotCount, recentCount, yearOnly }) =>
      () => fetchWithCurrentYearPriority(tag, hotCount, { logLabel: tag, recentCount, yearOnly })
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

  const newResults = await fetchDetailsBatch(itemsToFetch, { useAbstract: true });

  console.log('\n详情获取完成: ' + newResults.length + ' 条');

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
        abstract: item.abstract || '',
        lastUpdate: now
      });
    }
  }

  console.log('索引更新后: ' + indexMap.size + ' 条');

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

  const chineseItems = allResults.filter(item => isChineseVariety(item.title, item.genres));
  console.log('过滤国外综艺: ' + (allResults.length - chineseItems.length) + ' 条, 剩余 ' + chineseItems.length + ' 条');

  function getAirMonth(title) {
    const normTitle = normalizeTitle(title);
    for (const key of Object.keys(scheduleMap)) {
      const normKey = normalizeTitle(key);
      if (normTitle.includes(normKey) || normKey.includes(normTitle)) {
        return scheduleMap[key];
      }
    }
    return 0;
  }

  const finalItems = chineseItems
    .map(item => ({ ...item, airMonth: getAirMonth(item.title) }))
    .sort((a, b) => b.hotScore - a.hotScore)
    .slice(0, VARIETY_DISPLAY_COUNT)
    .map((item, i) => ({ ...item, id: 'variety_' + String(i + 1).padStart(3, '0') }));

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

  console.log('\n总榜前10部:');
  finalItems.slice(0, 10).forEach((item, i) => console.log('  ' + (i + 1) + '. ' + item.title + ' (' + (item.year || '未知') + ') - 评分' + item.rate + ' 热力' + item.hotScore));

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
