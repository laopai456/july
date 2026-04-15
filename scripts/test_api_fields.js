const axios = require('axios');
const { getHeaders, fetchWithRetry, DOUBAN_API } = require('./lib/douban');

async function test() {
  console.log('=== 测试 subject_suggest API ===');
  console.log('搜索: 流浪地球2\n');

  const data = await fetchWithRetry(DOUBAN_API + '/subject_suggest', { q: '流浪地球2' });
  if (data && data.length > 0) {
    console.log('返回条数:', data.length);
    console.log('\n第1条所有字段:');
    console.log(JSON.stringify(data[0], null, 2));
    if (data.length > 1) {
      console.log('\n第2条所有字段:');
      console.log(JSON.stringify(data[1], null, 2));
    }
  } else {
    console.log('无数据');
  }

  console.log('\n=== 测试 subject_abstract API ===');
  const abstract = await fetchWithRetry(DOUBAN_API + '/subject_abstract', { subject_id: '35267232' });
  if (abstract && abstract.subject) {
    console.log('\n所有字段:');
    console.log(JSON.stringify(abstract.subject, null, 2));
  } else {
    console.log('无数据');
  }
}

test();
