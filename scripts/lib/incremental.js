const fs = require('fs');
const path = require('path');

const DATA_FILE = path.join(__dirname, '..', '..', 'data.json');

function loadExistingData() {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const content = fs.readFileSync(DATA_FILE, 'utf8');
      const data = JSON.parse(content);
      return {
        data: data,
        index: data.varietyIndex || data.movieIndex || data.dramaIndex || null
      };
    }
  } catch (e) {
    console.log('加载现有数据失败:', e.message);
  }
  return { data: {}, index: null };
}

function loadCategoryData(category) {
  const { data } = loadExistingData();
  const indexKey = category + 'Index';
  const items = data[category] || [];
  const index = data[indexKey] || null;
  
  const indexMap = new Map();
  if (index) {
    for (const [key, item] of Object.entries(index)) {
      const doubanId = key.replace('douban_', '');
      indexMap.set(doubanId, item);
    }
  } else if (items.length > 0) {
    for (const item of items) {
      if (item.doubanId) {
        indexMap.set(item.doubanId, item);
      }
    }
  }
  
  return {
    items: items,
    index: index,
    indexMap: indexMap,
    allData: data
  };
}

function buildIndex(items, idField = 'doubanId') {
  const index = {};
  const now = new Date().toISOString().split('T')[0];
  
  for (const item of items) {
    const id = item[idField] || item.id;
    if (id && !id.includes('_')) {
      index['douban_' + id] = {
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
  
  return index;
}

function buildIndexFromList(listData, idField = 'id') {
  const index = {};
  const now = new Date().toISOString().split('T')[0];
  
  for (const item of listData) {
    const id = item[idField];
    if (id) {
      index['douban_' + id] = {
        title: item.title,
        rate: item.rate,
        year: item.year,
        cover: item.cover,
        directors: item.directors || [],
        casts: item.casts || [],
        subCategory: item.subCategory || '',
        lastUpdate: now,
        hasDetail: false
      };
    }
  }
  
  return index;
}

function compareWithExisting(listData, existingMap, idField = 'id') {
  const newItems = [];
  const existingItems = [];
  
  for (const item of listData) {
    const itemId = item[idField];
    if (existingMap.has(itemId)) {
      existingItems.push(item);
    } else {
      newItems.push(item);
    }
  }
  
  return {
    newItems,
    existingItems,
    stats: {
      newCount: newItems.length,
      existingCount: existingItems.length
    }
  };
}

function mergeData(newItems, existingMap, options = {}) {
  const { onMerge, calculateHotScore } = options;
  const results = [];
  
  for (const item of newItems) {
    const merged = onMerge ? onMerge(item, null) : item;
    results.push(merged);
  }
  
  for (const [id, existingItem] of existingMap) {
    if (calculateHotScore) {
      existingItem.hotScore = calculateHotScore(existingItem);
    }
    results.push(existingItem);
  }
  
  return results;
}

function saveData(category, items, allData, indexKey) {
  const index = buildIndex(items);
  
  const dataToSave = {
    ...allData,
    [category]: items,
    [indexKey]: index,
    [category + 'UpdatedAt']: new Date().toISOString()
  };
  
  fs.writeFileSync(DATA_FILE, JSON.stringify(dataToSave, null, 2));
  
  return { itemCount: items.length, indexCount: Object.keys(index).length };
}

function parseArgs() {
  const args = process.argv.slice(2);
  return {
    full: args.includes('--full'),
    hotOnly: args.includes('--hot-only'),
    help: args.includes('--help') || args.includes('-h')
  };
}

function printHelp(type) {
  console.log(`
用法: node scripts/fetch_${type}.js [选项]

选项:
  --full      强制全量更新，忽略索引
  --hot-only  只更新热力值，不获取详情
  -h, --help  显示帮助信息

示例:
  node scripts/fetch_${type}.js           # 增量更新
  node scripts/fetch_${type}.js --full    # 全量更新
`);
}

module.exports = {
  loadExistingData,
  loadCategoryData,
  buildIndex,
  buildIndexFromList,
  compareWithExisting,
  mergeData,
  saveData,
  parseArgs,
  printHelp,
  DATA_FILE
};
