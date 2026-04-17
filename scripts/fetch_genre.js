const fs = require('fs');
const {
  fetchWithCurrentYearPriority,
  fetchDetailsBatch,
  calculateHotScore,
  parallelLimit,
  getRequestCount, TOTAL_PER_CATEGORY, RATE_LIMIT, sleep
} = require('./lib/douban');
const { loadExistingData, compareWithExisting, DATA_FILE } = require('./lib/incremental');

const GENRE_TAGS = [
  { tag: '悬疑', movieCount: 150, dramaCount: 50 },
  { tag: '喜剧', movieCount: 150, dramaCount: 50 },
  { tag: '恐怖', movieCount: 150, dramaCount: 50 },
  { tag: '犯罪', movieCount: 150, dramaCount: 50 },
  { tag: '动作', movieCount: 150, dramaCount: 50 },
  { tag: '爱情', movieCount: 150, dramaCount: 50 }
];

const DISPLAY_COUNT = 50;

function parseGenreArgs() {
  const args = process.argv.slice(2);
  return {
    full: args.includes('--full'),
    all: args.includes('--all'),
    genre: getArgValue(args, '--genre'),
    help: args.includes('--help') || args.includes('-h')
  };
}

function getArgValue(args, flag) {
  const idx = args.indexOf(flag);
  if (idx > -1 && args[idx + 1]) return args[idx + 1];
  return null;
}

function printGenreHelp() {
  console.log(`
用法: node scripts/fetch_genre.js [选项]

选项:
  --genre <类型>  抓取单个类型 (悬疑/喜剧/恐怖/犯罪/动作/爱情)
  --all           抓取全部6个类型
  --full          强制全量更新，忽略索引
  -h, --help      显示帮助信息

示例:
  node scripts/fetch_genre.js --genre 悬疑       # 增量更新悬疑
  node scripts/fetch_genre.js --genre 悬疑 --full # 全量更新悬疑
  node scripts/fetch_genre.js --all              # 增量更新全部类型
  node scripts/fetch_genre.js --all --full       # 全量更新全部类型
`);
}

function loadGenreIndex(genreName, allData) {
  const genreIndex = allData.genreIndex || {};
  const genreData = genreIndex[genreName] || {};
  const movieIndex = genreData.movieRawIndex || {};
  const dramaIndex = genreData.dramaRawIndex || {};

  const movieMap = new Map();
  for (const [key, item] of Object.entries(movieIndex)) {
    const doubanId = key.replace('douban_', '');
    movieMap.set(doubanId, item);
  }

  const dramaMap = new Map();
  for (const [key, item] of Object.entries(dramaIndex)) {
    const doubanId = key.replace('douban_', '');
    dramaMap.set(doubanId, item);
  }

  return { movieMap, dramaMap, genreData };
}

async function fetchGenreSection(tag, type, targetCount, indexMap, args) {
  const searchTag = type === 'movie' ? ('电影,' + tag) : ('电视剧,' + tag);
  const sectionLabel = type === 'movie' ? '电影' : '热剧';

  console.log('\n【获取 ' + tag + ' - ' + sectionLabel + '】');

  const yearCount = Math.min(20, targetCount);
  const hotCount = targetCount;

  const allItems = [];
  const seenIds = new Set();

  const results = await parallelLimit(
    [() => fetchWithCurrentYearPriority(searchTag, hotCount, { yearCount, logLabel: tag + sectionLabel })],
    RATE_LIMIT.maxConcurrent
  );

  for (const items of results) {
    for (const item of items) {
      if (!seenIds.has(item.id)) {
        seenIds.add(item.id);
        allItems.push({ ...item, _type: type });
      }
    }
  }

  console.log('共获取 ' + tag + sectionLabel + ' ' + allItems.length + ' 条');
  if (allItems.length === 0) return { items: [], index: {} };

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
  console.log(sectionLabel + '详情获取完成: ' + newResults.length + ' 条');

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

  const allResults = [];
  for (const [doubanId, item] of indexMap) {
    const hotScore = calculateHotScore(item.rate, item.year);
    allResults.push({
      ...item,
      doubanId: doubanId,
      hotScore: hotScore
    });
  }

  allResults.sort((a, b) => b.hotScore - a.hotScore);
  const finalItems = allResults.slice(0, DISPLAY_COUNT);

  const rawIndex = {};
  for (const [doubanId, item] of indexMap) {
    rawIndex['douban_' + doubanId] = item;
  }

  console.log(tag + sectionLabel + ': 展示 ' + finalItems.length + ' 条, 索引 ' + Object.keys(rawIndex).length + ' 条');

  return { items: finalItems, index: rawIndex };
}

async function processGenre(genreConfig, args) {
  const { tag } = genreConfig;
  console.log('\n========================================');
  console.log('开始处理类型: ' + tag);
  console.log('========================================');

  const { data: allData } = loadExistingData();
  const { movieMap, dramaMap } = loadGenreIndex(tag, allData);

  const movieResult = await fetchGenreSection(tag, 'movie', genreConfig.movieCount, movieMap, args);
  const dramaResult = await fetchGenreSection(tag, 'drama', genreConfig.dramaCount, dramaMap, args);

  const genreIndex = allData.genreIndex || {};
  genreIndex[tag] = {
    movie: movieResult.items,
    drama: dramaResult.items,
    movieRawIndex: movieResult.index,
    dramaRawIndex: dramaResult.index,
    updatedAt: new Date().toISOString()
  };

  const dataToSave = {
    ...allData,
    genreIndex: genreIndex
  };

  fs.writeFileSync(DATA_FILE, JSON.stringify(dataToSave, null, 2));

  console.log('\n类型 [' + tag + '] 已保存到 data.json');
  console.log('电影展示: ' + movieResult.items.length + ' 条, 索引: ' + Object.keys(movieResult.index).length + ' 条');
  console.log('热剧展示: ' + dramaResult.items.length + ' 条, 索引: ' + Object.keys(dramaResult.index).length + ' 条');

  if (movieResult.items.length > 0) {
    console.log('\n电影前5:');
    movieResult.items.slice(0, 5).forEach((item, i) =>
      console.log('  ' + (i + 1) + '. ' + item.title + ' (' + (item.year || '未知') + ') - 评分' + item.rate + ' 热力' + item.hotScore)
    );
  }
  if (dramaResult.items.length > 0) {
    console.log('\n热剧前5:');
    dramaResult.items.slice(0, 5).forEach((item, i) =>
      console.log('  ' + (i + 1) + '. ' + item.title + ' (' + (item.year || '未知') + ') - 评分' + item.rate + ' 热力' + item.hotScore)
    );
  }
}

async function main() {
  const args = parseGenreArgs();

  if (args.help) {
    printGenreHelp();
    return;
  }

  const tagsToProcess = args.genre
    ? GENRE_TAGS.filter(g => g.tag === args.genre)
    : args.all
      ? GENRE_TAGS
      : null;

  if (!tagsToProcess || tagsToProcess.length === 0) {
    console.log('请指定 --genre <类型> 或 --all');
    printGenreHelp();
    return;
  }

  console.log('========================================');
  console.log('类型榜单抓取: ' + (args.full ? '全量' : '增量') + '更新');
  console.log('目标类型: ' + tagsToProcess.map(g => g.tag).join(', '));
  console.log('========================================');

  for (const genreConfig of tagsToProcess) {
    await processGenre(genreConfig, args);
  }

  console.log('\n========================================');
  console.log('全部类型处理完成');
  console.log('总请求次数: ' + getRequestCount());
  console.log('========================================');
}

module.exports = { main };

if (require.main === module) {
  main().catch(e => console.error('错误:', e.message));
}
