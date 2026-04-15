# 影视排行榜

一款采用新拟态（Neumorphism)设计风格的微信小程序，用于浏览综艺、电影、热剧排行榜。

## 项目特点

- **新拟态设计**：柔和的渐变背景、软质凸起的光影效果、大圆角设计
- **子分类榜单**：每个主分类下有3个子分类，精细化内容展示
- **服务端数据**：数据由服务端脚本定期抓取，存储在 data.json
- **本地缓存**：30分钟缓存，下拉刷新清除缓存
- **国产综艺**：综艺数据仅包含国产综艺，自动过滤韩综、美综等国外内容
- **作品简介**：点击榜单条目弹出卡片，展示作品内容简介
- **并发抓取**：并行抓取数据，带限速和防封机制
- **非电影过滤**：自动过滤开幕式、晚会等非电影内容

## 数据源

| 分类 | 子分类 | 数据源 | 说明 |
|------|--------|--------|------|
| 综艺 | 真人秀/喜剧/音综 | 豆瓣API | 服务端脚本抓取，过滤国外综艺 |
| 电影 | 中国/日韩/欧美 | 豆瓣API | 服务端脚本抓取，按地区分类 |
| 热剧 | 国产剧/韩剧/日剧 | 豆瓣API | 服务端脚本抓取 |

### 豆瓣API调用说明

数据抓取需要组合调用多个API：

| API | 端点 | 返回字段 | 用途 |
|-----|------|----------|------|
| 列表API | `/j/new_search_subjects` | id, title, rate, cover, directors, casts | 获取基础列表信息（**无年份**） |
| 详情API | `/j/subject_suggest` | id, title, year, type, genres | 获取年份和类型信息 |
| 简介API | `m.douban.com/subject/{id}/` | HTML中的meta description | 解析提取作品简介 |

**注意**：列表API不返回年份字段，必须通过详情API搜索标题获取年份。简介通过解析移动版页面HTML获取。

## 项目结构

```
july/
├── miniprogram/                 # 小程序前端
│   ├── pages/
│   │   ├── index/               # 首页（排行榜列表）
│   │   ├── admin/               # 调试页面
│   │   └── detail/              # 详情页
│   ├── components/              # 组件
│   │   ├── movie-card/          # 影视卡片
│   │   ├── movie-list/          # 列表组件
│   │   ├── filter-bar/          # 筛选栏
│   │   ├── loading/             # 加载组件
│   │   └── empty/               # 空状态组件
│   └── utils/
│       ├── api.js               # API 封装
│       └── config.js            # 配置文件
├── scripts/                     # 数据抓取脚本
│   ├── fetch_variety.js         # 综艺数据抓取
│   ├── fetch_movie.js           # 电影数据抓取
│   └── fetch_drama.js           # 热剧数据抓取
├── server.js                    # 后端服务（部署到云服务器）
├── data.json                    # 数据存储文件
└── project.config.json
```

## 快速开始

### 1. 环境准备

- 安装 [微信开发者工具](https://developers.weixin.qq.com/miniprogram/dev/devtools/download.html)
- 注册微信小程序账号，获取 AppID
- 云服务器（腾讯云等）

### 2. 导入项目

1. 打开微信开发者工具
2. 导入项目目录
3. 填写 AppID

### 3. 部署后端服务

```bash
# 在云服务器上
cd /opt
git clone https://github.com/laopai456/july.git movie-api
cd movie-api
npm install express axios

# 启动服务
node server.js

# 或使用 pm2 守护进程
pm2 start server.js --name movie-api
pm2 save
```

### 4. 更新数据

```bash
# 在服务器上运行
cd /opt/movie-api

# 更新综艺数据
node scripts/fetch_variety.js

# 更新电影数据
node scripts/fetch_movie.js

# 更新热剧数据
node scripts/fetch_drama.js

# 重启服务
pm2 restart movie-api
```

### 5. 通过 Git 同步更新

```bash
# 本地修改后推送到 GitHub
git add .
git commit -m "v1.0.0.6.6"
git push origin main

# 服务器拉取更新
cd /opt/movie-api
git pull origin main
pm2 restart movie-api
```

## 开发规范

### Commit Message 命名规则

格式：`type(scope): 描述`（中文描述）

| type | 说明 |
|------|------|
| feat | 新功能 |
| fix | Bug 修复 |
| refactor | 重构（不改变行为） |
| docs | 文档更新 |
| chore | 杂项（构建、配置等） |

示例：
- `feat(variety): 新增国产综艺过滤功能`
- `fix(movie): 修复年份提取失败的问题`
- `refactor(drama): 重构为统一的8步索引流程`

> AI 辅助编码时，每次代码修改完成后自动执行 `git add` + `git commit`，无需手动确认。

### 数据更新命令

```bash
# 增量更新（默认）
node scripts/fetch_variety.js
node scripts/fetch_movie.js
node scripts/fetch_drama.js

# 强制全量更新
node scripts/fetch_variety.js --full

# 查看帮助
node scripts/fetch_variety.js --help
```

## 分类结构

| 主分类 | 子分类 |
|--------|--------|
| 综艺 | 真人秀 / 喜剧 / 音综 |
| 电影 | 中国 / 日韩 / 欧美 |
| 热剧 | 国产剧 / 韩剧 / 日剧 |

每个子分类展示 **20条** 显示 + **30条** 备用

## 电影分类规则

电影按地区分类：

| 子分类 | 包含地区 |
|--------|----------|
| 中国 | 中国大陆、台湾、香港 |
| 日韩 | 日本、韩国、泰国、印度 |
| 欧美 | 美国、英国、法国、德国、西班牙、意大利、俄罗斯、加拿大、澳大利亚 |

## 综艺分类规则

综艺根据标题关键词自动分类：

| 子分类 | 关键词示例 |
|--------|-----------|
| 音综 | 音乐、歌手、好声音、创造营、乘风、披荆斩棘、街舞、乐队的夏天... |
| 喜剧 | 喜剧、搞笑、脱口秀、吐槽、一年一度喜剧大赛... |
| 真人秀 | 其他所有综艺（默认分类） |

> **注意**：`subCategory` 在每次从索引构建列表时统一重新计算，确保旧条目的分类与最新分类逻辑一致。

## 国产综艺过滤规则

自动过滤以下内容：

| 过滤类型 | 示例 |
|----------|------|
| 韩国综艺 | Running Man、无限挑战、新西游记、认识的哥哥... |
| 日本综艺 | 日本、Japanese... |
| 欧美综艺 | 美国、Netflix、HBO、BBC... |
| 韩文字符 | 标题包含韩文（Unicode范围 \uAC00-\uD7AF） |
| 韩国姓氏 | 演员/嘉宾中40%以上为韩国姓氏 |
| 非综艺类型 | 剧集、电影等非综艺类型 |

## 设计风格

采用新拟态（Neumorphism）设计：

- **渐变背景**：左上浅天蓝 → 右下浅樱花粉
- **凸起效果**：左上高光阴影 + 右下深色阴影
- **凹陷效果**：激活状态使用内阴影
- **圆角设计**：大圆角，柔和视觉

## 技术栈

- 微信小程序原生框架
- Express.js（后端服务）
- 豆瓣API（数据源）
- Node.js 数据抓取脚本

## 当前状态

| 功能 | 状态 |
|------|------|
| 综艺列表 | ✅ 已完成 |
| 综艺分类 | ✅ 已完成 |
| 国产综艺过滤 | ✅ 已完成 |
| 电影列表 | ✅ 已完成 |
| 电影地区分类 | ✅ 已完成 |
| 电影非电影过滤 | ✅ 已完成 |
| 热剧列表 | ✅ 已完成 |
| 增量更新机制 | ✅ 已完成 |
| 并发抓取+防封 | ✅ 已完成 |
| 作品简介弹窗 | ✅ 已完成 |
| 简介数据抓取 | ✅ 已完成 |
| 搜索功能 | ⏳ 待完善 |
| 收藏功能 | ⏳ 待完善 |
| 加载性能优化 | ⏳ 待开发 |

## License

MIT
