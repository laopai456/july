const path = require('path');

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function main() {
  console.log('========================================');
  console.log('开始获取所有数据');
  console.log('========================================\n');
  
  const variety = require('./fetch_variety');
  const movie = require('./fetch_movie');
  const drama = require('./fetch_drama');
  
  console.log('[1/3] 获取综艺数据...');
  console.log('----------------------------------------');
  await variety.main();
  console.log('\n综艺数据获取完成，等待10秒...\n');
  await sleep(10000);
  
  console.log('[2/3] 获取电影数据...');
  console.log('----------------------------------------');
  await movie.main();
  console.log('\n电影数据获取完成，等待10秒...\n');
  await sleep(10000);
  
  console.log('[3/3] 获取热剧数据...');
  console.log('----------------------------------------');
  await drama.main();
  
  console.log('\n========================================');
  console.log('所有数据获取完成！');
  console.log('数据已保存到 data.json');
  console.log('========================================');
}

main().catch(e => console.error('错误:', e.message));
