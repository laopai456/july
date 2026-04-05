# 影视排行榜爬虫 - 技术规格

## 项目概述

开发一个轻量级爬虫系统，从豆瓣和 TMDB 抓取热门影视数据，存储到微信云数据库。

## 数据源

| 数据源 | 用途 | 数据类型 |
|--------|------|----------|
| **豆瓣** | 主数据源 | 综艺、国产电影、国产剧评分 |
| **TMDB** | 补充数据源 | 国外电影、韩剧、日剧海报和详情 |

## 数据结构

```javascript
{
  _id: ObjectId,
  title: String,           // 标题
  titleEn: String,         // 英文标题
  type: String,            // variety/movie/drama
  mainCategory: String,    // 综艺/电影/热剧
  subCategory: String,     // 暂为空，后续细分
  region: String,          // cn/kr/jp/us
  year: Number,
  genres: [String],        // 类型标签
  poster: String,          // 海报URL
  rating: Number,          // 评分
  ratingSource: String,    // 评分来源 douban/tmdb
  description: String,     // 简介
  cast: [String],          // 演员
  director: String,
  episodes: Number,        // 剧集数（仅剧集）
  status: String,          // ongoing/completed
  viewCount: Number,       // 浏览量
  rank: Number,            // 榜单排名
  sourceId: String,        // 来源ID
  sourceUrl: String,       // 来源URL
  createdAt: Date,
  updatedAt: Date
}
```

## 榜单配置

### 综艺榜
- 来源：豆瓣综艺榜
- 数量：50 热门 + 100 备选
- 地区：中国、韩国

### 电影榜
- 来源：豆瓣电影榜 + TMDB
- 数量：50 热门 + 100 备选
- 地区：中国、美国、韩国、日本

### 热剧榜
- 来源：豆瓣剧集榜 + TMDB
- 数量：50 热门 + 100 备选
- 地区：中国、韩国、日本

## 爬虫实现

### 豆瓣爬虫

**目标页面**：
- 综艺：`https://movie.douban.com/chart` + 分类筛选
- 电影：`https://movie.douban.com/chart`
- 剧集：`https://movie.douban.com/chart`

**技术方案**：
- Node.js + axios + cheerio
- 模拟浏览器请求头
- 请求间隔 2-3 秒

### TMDB API

**接口**：
- 热门电影：`/movie/popular`
- 热门剧集：`/tv/popular`
- 详情：`/movie/{id}` / `/tv/{id}`

**技术方案**：
- 官方 API，需要 API Key
- 图片使用 TMDB CDN

## 输出格式

生成 JSON Lines 格式文件，可直接导入云数据库：

```
{"title":"xxx",...}
{"title":"yyy",...}
```

## 文件结构

```
scripts/crawler/
├── config.js          # 配置文件
├── index.js           # 主入口
├── sources/
│   ├── douban.js      # 豆瓣爬虫
│   └── tmdb.js        # TMDB API
├── utils/
│   └── helper.js      # 工具函数
└── output/            # 输出目录
```

## 执行流程

```
1. 豆瓣爬虫抓取综艺榜 → output/variety.json
        ↓
2. 豆瓣爬虫抓取电影榜 → output/movie_raw.json
        ↓
3. TMDB API 获取国外电影 → output/movie_tmdb.json
        ↓
4. 豆瓣爬虫抓取剧集榜 → output/drama_raw.json
        ↓
5. TMDB API 获取韩剧日剧 → output/drama_tmdb.json
        ↓
6. 合并去重 → output/movies.json
        ↓
7. 导入云数据库
```

## 待确认

1. TMDB API Key
2. 云开发环境 ID
