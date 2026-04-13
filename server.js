const express = require('express');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
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
    cover: (item.cover || '').replace(/[\s`'"''""]/g, '').trim(),
    rate: item.rate || '0',
    year: item.year || '',
    genres: item.genres || [],
    summary: '',
    directors: item.directors || [],
    casts: item.casts || [],
    subCategory: item.subCategory || '',
    hotScore: item.hotScore || 0
  };
}

const FOREIGN_KEYWORDS = [
  '韩国', '日本', '美国', '英国', 'Korean', 'Japanese', 'American',
  'Running Man', '无限挑战', '新西游记', '我独自生活', '认识的哥哥',
  '爬梯子', 'EXO', 'exo', 'Exo',
  'Happy Together', 'Radio Star', '音乐银行', '人气歌谣', 'M COUNTDOWN',
  '蒙面歌王', '我家的熊孩子', '同床异梦', '妻子的味道', '三时三餐',
  '尹食堂', '姜食堂', '两天一夜', '超人回来了', '人生酒馆', '黄金渔场',
  '白钟元', '林中小屋', '暑假', '露营', '地球娱乐室', '海妖的呼唤',
  'The Zone', '犯罪现场', '女高推理', '魔鬼的计谋', '四个愿望',
  'Hacks', 'Netflix', 'HBO', 'BBC',
  '绝望写手',
  '请回答', '豆豆笑笑', '搞笑演唱会', 'Gag Concert', '寻笑人',
  'SNL Korea', '全知干预视角', '玩什么好呢', '闲着干嘛呢', '刘QUIZ',
  'You Quiz', '文明特急', '爱豆房', 'idol Room', '一周的偶像', 'After School Club',
  '单身即地狱', '地狱', '李瑞镇', '达拉达拉', '体能之巅', 'Physical',
  '换乘恋爱', 'heart signal', 'Heart Signal', '黑话律师', 'Big Mouth',
  '异能', 'Moving', '鱿鱼游戏', 'Squid Game', '黑暗荣耀', 'Glory',
  '小镇魔发师', '怪奇谜案', '天机试炼场', '天下烘焙', '给我钱',
  '朴宝剑', '李相二', '郭东延', '郑智薰', '李龙真', '朴成奎', '李惠利',
  '全炫茂', '申东熙', '姜智荣', '朴娜莱', '朴河宣', '李多熙', '金美贤',
  '禹智皓', '申效涉', '李星和', '权爀禹', '朴宰范',
  'Biong Biong', '黑白厨师', '思想验证区域'
];

function isChineseVariety(title) {
  if (!title) return true;
  
  for (const keyword of FOREIGN_KEYWORDS) {
    if (title.toLowerCase().includes(keyword.toLowerCase())) {
      return false;
    }
  }
  
  const koreanPattern = /[\uAC00-\uD7AF]/;
  if (koreanPattern.test(title)) {
    return false;
  }
  
  return true;
}

app.get('/api/variety', async (req, res) => {
  const localData = loadLocalData();
  
  if (localData && localData.variety && localData.variety.length > 0) {
    const filtered = localData.variety.filter(item => isChineseVariety(item.title));
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
