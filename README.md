# 西瓜太浪hd

微信小程序，浏览综艺、电影、热剧排行榜。新拟态（Neumorphism）设计风格。

## 功能一览

| 功能 | 说明 |
|------|------|
| 榜单展示 | 综艺/电影/热剧三个 Tab，综艺为总榜（无子分类），电影按地区分3类，热剧按产地分3类 |
| 标签分类 | 悬疑/喜剧/恐怖/犯罪/爱情，每个标签下分电影/热剧两个分区 |
| 详情卡片 | 点击条目弹出浮层，显示评分/导演/演员/简介 |
| 标记已看 | 长按条目标记已看，从榜单隐藏，进入已看列表 |
| 收藏 | 长按条目收藏，收藏页可查看和管理 |
| 搜索 | 调用豆瓣搜索 API |
| 缓存 | 内存缓存 + 磁盘缓存（30分钟过期）+ 过期缓存兜底，下拉刷新清除 |

## 数据链路

```
抓取脚本 (scripts/fetch_*.js)
  → data.json (本地 JSON 文件)
    → server.js formatItem() (白名单式字段过滤)
      → 云函数 dataService (按需请求，独立缓存 5 分钟)
        → 前端 fetchXxxAll() / loadXxx() (逐字段构造对象)
          → 前端 applyTabData() (airMonth 过滤 + 已看过滤 + 截断)
```

**关键提醒**：`server.js formatItem()` 是白名单式返回，新增字段必须手动加入。前端 `fetchXxx` / `loadXxx` 也是逐字段赋值，漏加任何一层都会导致字段丢失。

## 数据模型

### data.json 中的条目字段

| 字段 | 类型 | 说明 |
|------|------|------|
| id | string | 自增 ID（如 `variety_001`、`chinese_001`） |
| doubanId | string | 豆瓣 ID |
| title | string | 标题 |
| rate | string | 评分（如 `"8.5"`） |
| year | string | 年份 |
| cover | string | 封面 URL |
| directors | string[] | 导演列表 |
| casts | string[] | 演员/嘉宾列表 |
| genres | string[] | 类型标签 |
| subCategory | string | 子分类（电影：中国/日韩/欧美；热剧：韩剧/日剧/国产剧；综艺：空） |
| abstract | string | 简介 |
| hotScore | number | 热力值 |
| airMonth | number | 播出月份（仅综艺，0 表示未知） |
| lastUpdate | string | 最后更新日期 |

### formatItem() 白名单字段（server.js → 前端）

id, doubanId, title, cover, rate, year, genres, summary, directors, casts, subCategory, hotScore, airMonth

## 分类结构

| 主分类 | 子分类 | 说明 |
|--------|--------|------|
| 综艺 | 无 | 单一总榜，按 hotScore 排序，前端按 airMonth 过滤未播出 |
| 电影 | 中国 / 日韩 / 欧美 | 中国=大陆+台湾+香港；日韩=日本+韩国+泰国+印度；欧美=美英法德等 |
| 热剧 | 韩剧 / 日剧 / 国产剧 | 按产地分类 |

### 综艺过滤规则

- 自动过滤韩综、日综、欧美综艺（标题含韩文/英文/特定关键词）
- 自动过滤颁奖典礼（格莱美/奥斯卡等）
- `airMonth` 字段用于前端过滤：当前月份 < airMonth 的条目不显示
- 播出时间表维护在 `scripts/variety_schedule.json`

## 用户数据

用户数据（已看/收藏）存储在微信小程序本地 Storage 中，不上传服务端。

| 存储键 | 数据结构 |
|--------|----------|
| `userWatched` | `[{doubanId, title, poster, rating, year, genres, addedAt}]` |
| `userFavorites` | 同上 |

## 项目结构

```
july/
├── miniprogram/                 # 小程序前端
│   ├── pages/
│   │   ├── index/               # 首页（三大 Tab 榜单）
│   │   ├── detail/              # 详情页
│   │   ├── genre/               # 标签分类页（悬疑/喜剧/恐怖/犯罪/爱情）
│   │   ├── favorites/           # 收藏页
│   │   ├── watched/             # 已看列表页
│   │   └── admin/               # 调试工具页
│   ├── components/              # 组件
│   │   ├── movie-card/          # 影视卡片
│   │   ├── movie-list/          # 列表组件
│   │   ├── filter-bar/          # 筛选栏
│   │   ├── loading/             # 加载组件
│   │   └── empty/               # 空状态组件
│   └── utils/
│       ├── api.js               # API 封装（movieService 云函数）
│       ├── config.js            # 配置文件（API 地址）
│       ├── userStore.js         # 用户数据管理（已看/收藏）
│       ├── imageCache.js        # 图片缓存
│       └── util.js              # 通用工具
├── scripts/                     # 数据抓取脚本
│   ├── fetch_variety.js         # 综艺数据抓取
│   ├── fetch_movie.js           # 电影数据抓取
│   ├── fetch_drama.js           # 热剧数据抓取
│   ├── fetch_genre.js           # 标签索引生成
│   ├── fetch_all.js             # 一键全量更新
│   ├── dedup_genre.js           # 标签去重
│   ├── supplement.json          # 综艺补充搜索列表
│   ├── variety_schedule.json    # 综艺播出时间表（名称→月份映射）
│   └── lib/
│       ├── douban.js            # 豆瓣 API 封装
│       └── incremental.js       # 增量更新工具
├── server.js                    # 后端服务（Express，部署到 43.167.233.80:3000）
├── scripts/daily_update.sh       # 每日定时抓取脚本（crontab 12:00，不含隐秘数据）
├── data.json                    # 数据存储（gitignore，服务器独有）
└── project.config.json
```

## 后端 API

| 端点 | 方法 | 功能 |
|------|------|------|
| `/api/variety` | GET | 综艺列表 |
| `/api/movie/:type` | GET | 电影列表（chinese/asia/western） |
| `/api/drama/:type` | GET | 热剧列表（chinese/korean/japanese） |
| `/api/genre/:name` | GET | 标签分类数据 |
| `/api/subject/:id` | GET | 单条详情（简介） |
| `/api/subjects/batch` | POST | 批量获取简介 |

## 豆瓣 API

| API | 端点 | 返回字段 | 用途 |
|-----|------|----------|------|
| 列表 | `/j/new_search_subjects` | id, title, rate, cover, directors, casts | 基础列表（无年份、无播放平台） |
| 搜索 | `/j/subject_suggest` | id, title, year, type, genres | 获取年份和类型 |
| 摘要 | `/j/subject_abstract` | types, region, directors, actors | 地区和类型 |
| 简介 | `m.douban.com/subject/{id}/` | HTML 解析 | 提取作品简介 |

**注意**：列表 API 不返回年份和播放平台。播放平台信息在豆瓣 API 中不可用。

## 快速开始

### 环境准备

- [微信开发者工具](https://developers.weixin.qq.com/miniprogram/dev/devtools/download.html)
- 微信小程序 AppID
- 云服务器（腾讯云）

### 部署后端

```bash
cd /opt
git clone https://github.com/laopai456/july.git movie-api
cd movie-api
npm install express axios
pm2 start server.js --name movie-api
pm2 save
```

### 更新数据

```bash
# 服务器上执行（合并为一条命令防止遗漏）
cd /opt/movie-api && git pull && node scripts/fetch_variety.js && pm2 restart movie-api

# 或分别执行
node scripts/fetch_variety.js          # 综艺（增量）
node scripts/fetch_variety.js --full   # 综艺（全量）
node scripts/fetch_movie.js            # 电影
node scripts/fetch_drama.js            # 热剧
pm2 restart movie-api                  # 重启服务（必须）
```

### 本地同步

```bash
# 本地修改 → push
git add .; git commit -m "feat(xxx): 描述"; git push origin main

# 服务器拉取（不要从服务器 push）
cd /opt/movie-api && git pull && pm2 restart movie-api
```

## 开发规范

### Commit 规则

格式：`type(scope): 中文描述`

| type | 说明 |
|------|------|
| feat | 新功能 |
| fix | Bug 修复 |
| refactor | 重构 |
| docs | 文档 |
| chore | 杂项 |

### 注意事项

- `data.json` 已加入 `.gitignore`，不要 track 它
- 服务器上操作 `data.json` 前必须先备份
- 涉及服务器更新：`git pull → 跑脚本 → pm2 restart`，三步缺一不可
- 新增字段时必须 grep 全项目确认每层都添加（抓取脚本 → data.json → server.js formatItem → 前端 fetchXxx/loadXxx）

## 技术栈

- 微信小程序原生框架
- Express.js（后端）
- 豆瓣 API（数据源）
- Node.js 数据抓取脚本
- wx-server-sdk（云函数）

## License

MIT
