const express = require('express');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { isChineseVariety } = require('./scripts/lib/douban');
const app = express();

app.use(express.json());

const DOUBAN_API = 'https://movie.douban.com/j';
const DATA_FILE = path.join(__dirname, 'data.json');
const SYNC_SECRET = 'july2026sync';

async function fetchWithRetry(url, params, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      const response = await axios.get(url, {
        params,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Referer': 'https://movie.douban.com/'
        },
        timeout: 8000
      });
      return response.data;
    } catch (error) {
      if (i === retries - 1) throw error;
      await new Promise(r => setTimeout(r, 300));
    }
  }
}

function loadLocalData() {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const data = fs.readFileSync(DATA_FILE, 'utf8');
      return JSON.parse(data);
    }
  } catch (error) {
    console.error('读取本地数据失败:', error.message);
  }
  return null;
}

function proxyCover(url) {
  if (!url) return ''
  url = url.replace(/[\s`'"''""]/g, '').trim()
  if (url.match(/img\d*\.doubanio\.com/)) {
    const path = url.replace(/https?:\/\//, '')
    return 'https://images.weserv.nl/?url=' + path
  }
  return url
}

function formatItem(item) {
  return {
    id: item.id,
    title: item.title,
    cover: proxyCover((item.cover || item.poster || '') + ''),
    rate: item.rate || '0',
    year: item.year || '',
    genres: item.genres || [],
    summary: item.abstract || '',
    directors: item.directors || [],
    casts: item.casts || [],
    subCategory: item.subCategory || '',
    hotScore: item.hotScore || 0
  };
}

app.get('/api/variety', async (req, res) => {
  const localData = loadLocalData();

  if (localData && localData.variety && localData.variety.length > 0) {
    const filtered = localData.variety.filter(item => isChineseVariety(item.title, item.genres));
    const subjects = filtered.map(formatItem);

    return res.json({
      subjects,
      total: subjects.length,
      config: localData.config || { displayCount: 30, backupCount: 20 },
      source: 'local'
    });
  }

  try {
    const data = await fetchWithRetry(`${DOUBAN_API}/search_subjects`, {
      type: 'tv',
      tag: '综艺',
      sort: 'rank',
      page_limit: 30,
      page_start: 0
    });

    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/movie/:type', async (req, res) => {
  const { type } = req.params;
  const localData = loadLocalData();

  const typeMap = {
    'chinese': '中国',
    'asia': '日韩',
    'western': '欧美'
  };

  if (localData && localData.movie && localData.movie.length > 0) {
    const filtered = localData.movie.filter(item => item.subCategory === typeMap[type]);
    const subjects = filtered.map(formatItem);

    return res.json({
      subjects,
      total: subjects.length,
      source: 'local'
    });
  }

  try {
    const tags = {
      'chinese': '华语电影',
      'asia': '日本电影',
      'western': '欧美电影'
    };

    const data = await fetchWithRetry(`${DOUBAN_API}/search_subjects`, {
      type: 'movie',
      tag: tags[type],
      sort: 'recommend',
      page_limit: 20,
      page_start: 0
    });

    if (data && data.subjects) {
      data.subjects = data.subjects.map(item => ({
        ...item,
        cover: proxyCover(item.cover || '')
      }));
    }

    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/drama/:type', async (req, res) => {
  const { type } = req.params;
  const localData = loadLocalData();

  const typeMap = {
    'chinese': '国产剧',
    'korean': '韩剧',
    'japanese': '日剧'
  };

  if (localData && localData.drama && localData.drama.length > 0) {
    const filtered = localData.drama.filter(item => item.subCategory === typeMap[type]);
    const subjects = filtered.map(formatItem);

    return res.json({
      subjects,
      total: subjects.length,
      source: 'local'
    });
  }

  try {
    const tags = {
      'chinese': '国产剧',
      'korean': '韩剧',
      'japanese': '日剧'
    };

    const data = await fetchWithRetry(`${DOUBAN_API}/search_subjects`, {
      type: 'tv',
      tag: tags[type],
      sort: 'rank',
      page_limit: 20,
      page_start: 0
    });

    if (data && data.subjects) {
      data.subjects = data.subjects.map(item => ({
        ...item,
        cover: proxyCover(item.cover || '')
      }));
    }

    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/variety/sync', (req, res) => {
  try {
    const { secret, variety, config } = req.body;

    if (secret !== SYNC_SECRET) {
      return res.status(403).json({ error: '无权限' });
    }

    if (!variety || !Array.isArray(variety)) {
      return res.status(400).json({ error: '数据格式错误' });
    }

    const dataToSave = {
      variety: variety,
      config: config || { displayCount: 30, backupCount: 20 },
      updatedAt: new Date().toISOString(),
      source: 'miniprogram_sync'
    };

    fs.writeFileSync(DATA_FILE, JSON.stringify(dataToSave, null, 2));

    console.log(`数据已更新: ${variety.length} 条综艺, ${new Date().toLocaleString()}`);

    res.json({
      success: true,
      count: variety.length,
      updatedAt: dataToSave.updatedAt
    });
  } catch (error) {
    console.error('保存数据失败:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/variety/status', (req, res) => {
  const localData = loadLocalData();

  res.json({
    hasData: !!(localData && localData.variety && localData.variety.length > 0),
    count: localData?.variety?.length || 0,
    updatedAt: localData?.updatedAt || null,
    source: localData?.source || 'unknown'
  });
});

app.listen(3000, () => {
  console.log('Server running on port 3000');
});
