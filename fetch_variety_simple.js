const axios = require('axios');
const fs = require('fs');

const DOUBAN_API = 'https://movie.douban.com/j';

async function fetchList() {
  const response = await axios.get(`${DOUBAN_API}/new_search_subjects`, {
    params: {
      sort: 'U',
      range: '0,10',
      tags: '综艺',
      start: 0,
      limit: 100
    },
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      'Referer': 'https://movie.douban.com/'
    },
    timeout: 15000
  });
  return response.data.data || [];
}

async function fetchYearBySuggest(title) {
  try {
    const response = await axios.get(`${DOUBAN_API}/subject_suggest`, {
      params: { q: title },
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Referer': 'https://movie.douban.com/'
      },
      timeout: 10000
    });
    
    const items = response.data || [];
    if (items.length > 0 && items[0].year) {
      return items[0].year;
    }
    return '';
  } catch (e) {
    return '';
  }
}

async function main() {
  console.log('获取综艺列表...');
  const list = await fetchList();
  console.log(`找到 ${list.length} 条综艺\n`);

  const results = [];
  for (let i = 0; i < list.length; i++) {
    const item = list[i];
    process.stdout.write(`\r获取详情 ${i + 1}/${list.length}...`);
    
    const year = await fetchYearBySuggest(item.title);
    results.push({
      id: item.id,
      title: item.title,
      rate: item.rate || '0',
      cover: item.cover || '',
      year: year,
      directors: item.directors || [],
      casts: item.casts || []
    });
    
    await new Promise(r => setTimeout(r, 300));
  }

  console.log(`\n完成，共获取 ${results.length} 条综艺`);
  console.log('\n年份分布:');
  const years = {};
  results.forEach(r => {
    const y = r.year || '未知';
    years[y] = (years[y] || 0) + 1;
  });
  console.log(JSON.stringify(years, null, 2));

  const sorted = results.sort((a, b) => {
    if (a.year && b.year) return b.year - a.year;
    if (a.year) return -1;
    if (b.year) return 1;
    return 0;
  });

  fs.writeFileSync('/opt/movie-api/data.json', JSON.stringify({ variety: sorted }, null, 2));
  console.log('\n数据已保存到 /opt/movie-api/data.json');
  
  console.log('\n前10条数据预览:');
  sorted.slice(0, 10).forEach((item, i) => {
    console.log(`${i + 1}. ${item.title} (${item.year || '未知'}) - 评分: ${item.rate}`);
  });
}

main().catch(e => console.error('错误:', e.message));
