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

function formatItem(item) {
  return {
    id: item.id,
    title: item.title,
    cover: (item.cover || item.poster || '').replace(/[\s`'"''""]/g, '').trim(),
    rate: item.rate || item.rating || '0',
    year: item.year || '',
    genres: item.genres || [],
    summary: item.abstract || item.description || item.summary || '',
    directors: item.directors || (item.director ? [item.director] : []),
    casts: item.casts || item.cast || [],
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
        cover: (item.cover || '').replace(/[\s`'"''""]/g, '').trim()
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
        cover: (item.cover || '').replace(/[\s`'"''""]/g, '').trim()
      }));
    }

    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/subject/:id', async (req, res) => {
  const { id } = req.params;
  let doubanId = id;

  if (!id) {
    return res.status(400).json({ error: '缺少ID' });
  }

  try {
    if (!/^\d+$/.test(id)) {
      const title = decodeURIComponent(id);
      const suggestRes = await axios.get('https://movie.douban.com/j/subject_suggest', {
        params: { q: title },
        headers: {
          'User-Agent': 'Mozilla/5.0',
          'Referer': 'https://movie.douban.com/'
        },
        timeout: 5000
      });
      const results = suggestRes.data;
      if (Array.isArray(results) && results.length > 0 && results[0].id) {
        doubanId = results[0].id;
      } else {
        return res.json({ id, summary: '' });
      }
    }

    const response = await axios.get(`https://m.douban.com/subject/${doubanId}/`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1',
        'Accept': 'text/html',
        'Referer': 'https://m.douban.com/'
      },
      timeout: 8000
    });

    const html = typeof response.data === 'string' ? response.data : '';
    let summary = '';

    const sectionMatch = html.match(/<section\s+class="subject-intro">[\s\S]*?<p[^>]*>\s*([\s\S]*?)<\/p>/);
    if (sectionMatch) {
      summary = sectionMatch[1].replace(/<[^>]+>/g, '').trim();
    }

    if (!summary) {
      const metaMatch = html.match(/<meta\s+name="description"\s+content="[^"]*简介[：:]([^"]+)"/);
      if (metaMatch) {
        summary = metaMatch[1];
      }
    }

    if (!summary) {
      const metaMatch2 = html.match(/<meta\s+name="description"\s+content="([^"]+)"/);
      if (metaMatch2) {
        const content = metaMatch2[1];
        const colonIdx = content.indexOf('：');
        summary = colonIdx > -1 ? content.substring(colonIdx + 1) : content;
      }
    }

    if (summary) {
      summary = summary.replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&#39;/g, "'").replace(/&nbsp;/g, ' ').trim();
    }

    res.json({ id, doubanId, summary });
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
