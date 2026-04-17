# 类型榜单系统设计

## 日期
2026-04-17

## 背景

现有小程序是按地区分类的榜单体系（综艺/电影/热剧），用户希望增加按类型标签（悬疑、喜剧等）浏览高分高热度内容的能力。类型维度与地区维度正交，需要独立页面承载。

## 需求

- 独立页面，从首页入口进入
- 类型下拉选择器，首批 6 个标签：**悬疑 / 喜剧 / 恐怖 / 犯罪 / 动作 / 爱情**
- 电影/热剧双板块 Tab 切换，热度排序
- 前端每板块显示 50 部
- 后端每标签抓取：电影 150 部 + 热剧 50 部
- 现有 data.json 作为基础数据库，类型榜单为增量抓取
- 复用现有 douban.js / incremental.js 基础设施

## 方案

**方案 A：类型榜单作为独立数据段**（已选定）

复刻 fetch_movie.js 模式，创建 fetch_genre.js，用豆瓣 `tags: '电影,悬疑'` / `tags: '电视剧,悬疑'` 抓取。每个类型在 data.json 中独立存储。

## 数据结构

data.json 新增 `genreIndex` 字段：

```json
{
  "genreIndex": {
    "悬疑": {
      "movie": [ ...150部按热度排序 ],
      "drama": [ ...50部按热度排序 ],
      "movieRawIndex": { "douban_xxx": { title, rate, year, cover, directors, casts, genres, hotScore, abstract } },
      "dramaRawIndex": { "douban_xxx": { ... } },
      "updatedAt": "2026-04-17T..."
    },
    "喜剧": { ... },
    "恐怖": { ... },
    "犯罪": { ... },
    "动作": { ... },
    "爱情": { ... }
  }
}
```

每条数据结构与现有 movie[] / drama[] 一致。

## API 设计

### server.js 新增路由

```
GET /api/genre/:name?section=movie|drama&page=1&pageSize=50
```

- section=movie → 返回电影列表
- section=drama → 返回热剧列表
- 不传 section → 返回 { movie: [...], drama: [...] }

### 云函数 dataService 新增 action

```
getGenre → { action: 'getGenre', name: '悬疑', section: 'movie' }
```

## 前端页面设计

### 页面布局

```
┌─────────────────────────────┐
│  [悬疑 ▼]  ← 下拉选择标签    │
├─────────────────────────────┤
│  [电影] [热剧]  ← 板块切换    │
├─────────────────────────────┤
│  1. 消失的她  7.5  热度 180  │
│  2. 调音师    8.3  热度 165  │
│  3. ...                     │
│  （复用现有 movie-card）      │
└─────────────────────────────┘
```

### 入口

首页顶部或导航区域加「分类」入口按钮，跳转到 `/pages/genre/index`

## 抓取脚本设计

### scripts/fetch_genre.js

```
用法:
  node scripts/fetch_genre.js --genre 悬疑    # 抓取单个类型
  node scripts/fetch_genre.js --all           # 抓取全部6个类型
  node scripts/fetch_genre.js --full          # 强制全量更新
```

核心逻辑（复用 fetchWithCurrentYearPriority + incremental.js）：

```
对每个类型标签：
  1. 加载 genreIndex 中该标签的现有索引
  2. 抓取电影列表：tags='电影,悬疑'，当年优先20 + 往年补齐130，目标150条
  3. 抓取热剧列表：tags='电视剧,悬疑'，当年优先20 + 往年补齐30，目标50条
  4. 比对索引，增量获取详情
  5. 合并数据，计算热力分，按热度排序
  6. 保存到 data.json 的 genreIndex.<标签名>
```

首批标签配置：

```javascript
const GENRE_TAGS = [
  { tag: '悬疑', movieCount: 150, dramaCount: 50 },
  { tag: '喜剧', movieCount: 150, dramaCount: 50 },
  { tag: '恐怖', movieCount: 150, dramaCount: 50 },
  { tag: '犯罪', movieCount: 150, dramaCount: 50 },
  { tag: '动作', movieCount: 150, dramaCount: 50 },
  { tag: '爱情', movieCount: 150, dramaCount: 50 }
];
```

## 实现任务清单

### 阶段一：抓取脚本

- [ ] 新建 `scripts/fetch_genre.js` — 类型标签抓取脚本
- [ ] 验证：`node scripts/fetch_genre.js --genre 悬疑` 抓取成功，data.json 正确写入

### 阶段二：服务端

- [ ] 修改 `server.js` — 新增 `/api/genre/:name` 路由
- [ ] 修改 `cloudfunctions/dataService/index.js` — 新增 `getGenre` action
- [ ] 验证：`curl http://localhost:3000/api/genre/悬疑` 返回正确数据

### 阶段三：前端页面

- [ ] 新建 `miniprogram/pages/genre/index.*` — 类型浏览页面（js/wxml/wxss/json）
- [ ] 修改 `miniprogram/app.json` — 注册新页面
- [ ] 修改 `miniprogram/pages/index/index.wxml` — 首页加「分类」入口
- [ ] 修改 `miniprogram/pages/index/index.js` — 入口跳转逻辑
- [ ] 验证：小程序中点击入口 → 分类页面 → 切换标签 → 切换电影/热剧 → 查看详情

## 文件变更清单

| 操作 | 文件 | 说明 |
|------|------|------|
| 新建 | `scripts/fetch_genre.js` | 类型标签抓取脚本 |
| 修改 | `server.js` | 新增 `/api/genre/:name` 路由 |
| 修改 | `cloudfunctions/dataService/index.js` | 新增 `getGenre` action |
| 修改 | `miniprogram/app.json` | 注册 genre 页面 |
| 修改 | `miniprogram/pages/index/index.wxml` | 首页加「分类」入口 |
| 修改 | `miniprogram/pages/index/index.js` | 入口跳转 |
| 新建 | `miniprogram/pages/genre/index.js` | 页面逻辑 |
| 新建 | `miniprogram/pages/genre/index.wxml` | 页面模板 |
| 新建 | `miniprogram/pages/genre/index.wxss` | 页面样式 |
| 新建 | `miniprogram/pages/genre/index.json` | 页面配置 |

## 不需要改的

- 现有综艺/电影/热剧抓取脚本（fetch_variety.js / fetch_movie.js / fetch_drama.js）
- 现有 data.json 中已有数据
- scripts/lib/douban.js / scripts/lib/incremental.js（直接复用不修改）

## 后续扩展

- 新增类型标签只需在 GENRE_TAGS 配置中加一行 + 跑一次脚本
- 可考虑「热门类型」排序（按该类型下内容的热度总和排序）
- 可考虑类型标签的图标/封面（取该类型热度最高的电影海报）
