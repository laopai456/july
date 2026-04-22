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

let _dataCache = null;
let _dataCacheMtime = null;

function loadLocalData() {
  try {
    const stat = fs.statSync(DATA_FILE);
    const mtime = stat.mtimeMs;
    if (_dataCache && _dataCacheMtime === mtime) {
      return _dataCache;
    }
    const data = fs.readFileSync(DATA_FILE, 'utf8');
    _dataCache = JSON.parse(data);
    _dataCacheMtime = mtime;
    return _dataCache;
  } catch (error) {
    console.error('读取本地数据失败:', error.message);
    return _dataCache;
  }
}

const summaryCache = new Map();
const SUMMARY_CACHE_TTL = 24 * 60 * 60 * 1000;
const SUMMARY_CACHE_MAX = 500;

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

function formatItem(item) {
  return {
    id: item.id,
    doubanId: item.doubanId || '',
    title: item.title,
    cover: (item.cover || item.poster || '').replace(/[\s`'"''""]/g, '').trim(),
    rate: item.rate || item.rating || '0',
    year: item.year || '',
    genres: item.genres || [],
    summary: item.abstract || item.description || item.summary || '',
    directors: item.directors || (item.director ? [item.director] : []),
    casts: item.casts || item.cast || [],
    subCategory: item.subCategory || '',
    hotScore: item.hotScore || 0,
    airMonth: item.airMonth || 0,
    region: item.region || ''
  };
}

app.get('/api/variety', async (req, res) => {
  const localData = loadLocalData();

  if (localData && localData.variety && localData.variety.length > 0) {
    const filtered = localData.variety.filter(item => isChineseVariety(item.title, item.genres, item.region));
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

  if (localData) {
    if (localData.movie && localData.movie.length > 0) {
      const filtered = localData.movie.filter(item => item.subCategory === typeMap[type]);
      const subjects = filtered.map(formatItem);

      return res.json({
        subjects,
        total: subjects.length,
        source: 'local'
      });
    }
    return res.json({ subjects: [], total: 0, source: 'local-empty' });
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

  if (localData) {
    if (localData.drama && localData.drama.length > 0) {
      const filtered = localData.drama.filter(item => item.subCategory === typeMap[type]);
      const subjects = filtered.map(formatItem);

      return res.json({
        subjects,
        total: subjects.length,
        source: 'local'
      });
    }
    return res.json({ subjects: [], total: 0, source: 'local-empty' });
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

app.get('/api/genre/:name', async (req, res) => {
  const { name } = req.params;
  const { section, limit } = req.query;
  const localData = loadLocalData();

  if (!localData || !localData.genreIndex || !localData.genreIndex[name]) {
    return res.json({ subjects: [], total: 0, source: 'local-empty' });
  }

  const genreData = localData.genreIndex[name];
  const sliceCount = limit ? parseInt(limit) : 0;

  if (section === 'movie') {
    const all = (genreData.movie || []).map(formatItem);
    const subjects = sliceCount > 0 ? all.slice(0, sliceCount) : all;
    return res.json({ subjects, total: all.length, source: 'local' });
  }

  if (section === 'drama') {
    const all = (genreData.drama || []).map(formatItem);
    const subjects = sliceCount > 0 ? all.slice(0, sliceCount) : all;
    return res.json({ subjects, total: all.length, source: 'local' });
  }

  const movieAll = (genreData.movie || []).map(formatItem);
  const dramaAll = (genreData.drama || []).map(formatItem);
  res.json({
    movie: sliceCount > 0 ? movieAll.slice(0, sliceCount) : movieAll,
    drama: sliceCount > 0 ? dramaAll.slice(0, sliceCount) : dramaAll,
    movieTotal: movieAll.length,
    dramaTotal: dramaAll.length,
    updatedAt: genreData.updatedAt,
    source: 'local'
  });
});

app.get('/api/subject/:id', async (req, res) => {
  const { id } = req.params;

  if (!id) {
    return res.status(400).json({ error: '缺少ID' });
  }

  const cached = summaryCache.get(id);
  if (cached && Date.now() - cached.time < SUMMARY_CACHE_TTL) {
    return res.json(cached.data);
  }

  try {
    let doubanId = id;

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
        const emptyResult = { id, summary: '' };
        summaryCache.set(id, { data: emptyResult, time: Date.now() });
        return res.json(emptyResult);
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

    const result = { id, doubanId, summary };

    if (summaryCache.size >= SUMMARY_CACHE_MAX) {
      const oldestKey = summaryCache.keys().next().value;
      summaryCache.delete(oldestKey);
    }
    summaryCache.set(id, { data: result, time: Date.now() });

    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/subjects/batch', async (req, res) => {
  const { titles } = req.body;
  if (!Array.isArray(titles) || titles.length === 0) {
    return res.json({});
  }

  const limit = Math.min(titles.length, 30);
  const batch = titles.slice(0, limit);

  const results = {};
  const concurrency = 5;
  for (let i = 0; i < batch.length; i += concurrency) {
    const chunk = batch.slice(i, i + concurrency);
    const promises = chunk.map(async (title) => {
      try {
        const suggestRes = await axios.get('https://movie.douban.com/j/subject_suggest', {
          params: { q: title },
          headers: { 'User-Agent': 'Mozilla/5.0', 'Referer': 'https://movie.douban.com/' },
          timeout: 5000
        });
        const items = suggestRes.data;
        if (!Array.isArray(items) || items.length === 0 || !items[0].id) return;

        const doubanId = items[0].id;
        const response = await axios.get(`https://m.douban.com/subject/${doubanId}/`, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15',
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
          if (metaMatch) summary = metaMatch[1];
        }
        if (summary) {
          summary = summary.replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&#39;/g, "'").replace(/&nbsp;/g, ' ').trim();
        }
        if (summary) results[title] = summary;
      } catch (e) {}
    });
    await Promise.all(promises);
  }

  res.json(results);
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
    _dataCache = null;
    _dataCacheMtime = null;

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
