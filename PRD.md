# 影视排行榜小程序产品需求文档 (PRD)

> 文档版本：v1.0
> 创建日期：2026-04-07
> 最后更新：2026-04-07

---

## 一、项目概述

### 1.1 产品背景

现有影视排行榜微信小程序包含三个主榜单：综艺、电影、热剧，采用微信云开发+TMDB数据源，设计风格为新拟态（Neumorphism）。

### 1.2 本次迭代目标

1. 将三个主榜单拆分为子分类榜单，实现精细化内容展示
2. 确保每个子分类榜单内容质量（30部精品 + 20部递补）
3. 强化时间维度筛选，保证内容时效性
4. 优化图片加载性能，实现本地缓存机制

---

## 二、功能需求详述

### 2.1 榜单结构重构

#### 2.1.1 子分类划分方案

| 主榜单 | 子分类A | 子分类B | 子分类C |
|--------|----------|----------|----------|
| **综艺** | 恋爱 | 搞笑 | 真人秀 |
| **电影** | 悬疑 | 恋爱 | 喜剧 |
| **热剧** | 韩剧 | 日剧 | 国产剧 |

#### 2.1.2 子分类判定规则

**综艺分类逻辑：**
```
genres[0] = '恋爱' OR '情感' → 恋爱类
genres[0] = '搞笑' OR '喜剧' → 搞笑类
genres[0] = '真人秀' → 真人秀类
其他 → 归入上述三类之一（按 genres[1] 或 genres[2] 匹配）
```

**电影分类逻辑：**
```
genres[0] = '悬疑' OR '犯罪' OR '惊悚' → 悬疑类
genres[0] = '爱情' OR '恋爱' → 恋爱类
genres[0] = '喜剧' OR '搞笑' → 喜剧类
其他 → 归入上述三类之一
```

**热剧分类逻辑：**
```
region = 'kr' → 韩剧
region = 'jp' → 日剧
region = 'cn' → 国产剧
其他 → 归入上述三类之一
```

> **说明**：优先依据 `genres[0]`（第一标签）进行分类，确保每部作品有唯一归属。若无法匹配三类，则按第二、第三标签匹配。

#### 2.1.3 时间筛选规则

- **生效范围**：所有子分类榜单
- **筛选条件**：`year > 2020` OR (`year = 2020` AND `month >= 4`)
- **适用字段**：`year` 字段（部分数据仅有年份，忽略月份判断）
- **边界处理**：
  - 2020年作品：按实际数据决定（部分2020年1-3月作品会因无月份数据而被保留）
  - 2021年及之后：全部纳入
  - 2020年之前：全部排除

#### 2.1.4 数量规则

- **前台展示**：每个子分类最多 30 部
- **隐藏递补池**：每个子分类额外存储 20 部作为递补
- **递补触发条件**：
  - 展示作品被下架
  - 作品信息被删除
  - 手动刷新补充
- **递补优先级**：按评分从高到低依次递补

---

### 2.2 数据层设计

#### 2.2.1 数据库字段变更

**新增字段：**

| 字段名 | 类型 | 说明 |
|--------|------|------|
| `subCategory` | String | 子分类归属（真人秀/竞技/恋爱/动作科幻/剧情喜剧/动画奇幻/韩剧/日剧/国产剧/其他） |
| `isReserve` | Boolean | 是否为递补池作品（false=正式，true=递补） |
| `rankScore` | Number | 综合排名得分（用于排序计算） |
| `refreshAt` | Date | 最后一次榜单刷新时间 |

**修改字段：**

| 字段名 | 修改说明 |
|--------|----------|
| `subCategory` | 从原来的 region 维度改为多维度分类 |

#### 2.2.2 索引设计

```javascript
// 复合索引（按子分类 + 时间 + 评分）
db.collection('movies').index([
  { name: 'subCategory_rating', fields: ['subCategory', 'year', 'rating'] },
  { name: 'subCategory_isReserve', fields: ['subCategory', 'isReserve'] }
])
```

---

### 2.3 接口层设计

#### 2.3.1 movieService 新增 action

**getSubCategoryList（获取子分类榜单）**

```javascript
// 请求参数
{
  action: 'getSubCategoryList',
  mainCategory: '综艺' | '电影' | '热剧',
  subCategory: '恋爱' | '搞笑' | '真人秀' | '悬疑' | '喜剧' | '韩剧' | '日剧' | '国产剧',
  page: 1,
  pageSize: 30,  // 默认30，最多30
  showReserve: false  // 是否显示递补池（仅管理员调试用）
}

// 响应结构
{
  code: 0,
  data: {
    list: [...],
    total: 30,
    page: 1,
    pageSize: 30,
    hasMore: false,
    refreshAt: '2026-04-07T12:00:00.000Z'
  }
}
```

**refreshSubCategory（手动刷新指定子分类榜单）**

```javascript
// 请求参数
{
  action: 'refreshSubCategory',
  mainCategory: '综艺' | '电影' | '热剧',
  subCategory: '恋爱' | '搞笑' | '真人秀' | '悬疑' | '喜剧' | '韩剧' | '日剧' | '国产剧'
}

// 响应结构
{
  code: 0,
  data: {
    refreshed: true,
    totalCount: 50,
    primaryCount: 30,
    reserveCount: 20,
    refreshAt: '2026-04-07T12:00:00.000Z'
  }
}
```

**batchRefreshAll（批量刷新全部子分类）**

```javascript
// 请求参数
{
  action: 'batchRefreshAll'
}

// 响应结构
{
  code: 0,
  data: {
    results: [
      { mainCategory: '综艺', subCategory: '恋爱', count: 50 },
      { mainCategory: '综艺', subCategory: '搞笑', count: 50 },
      { mainCategory: '综艺', subCategory: '真人秀', count: 50 },
      { mainCategory: '电影', subCategory: '悬疑', count: 50 },
      { mainCategory: '电影', subCategory: '恋爱', count: 50 },
      { mainCategory: '电影', subCategory: '喜剧', count: 50 },
      { mainCategory: '热剧', subCategory: '韩剧', count: 50 },
      { mainCategory: '热剧', subCategory: '日剧', count: 50 },
      { mainCategory: '热剧', subCategory: '国产剧', count: 50 },
    ],
    refreshAt: '2026-04-07T12:00:00.000Z'
  }
}
```

#### 2.3.2 现有接口兼容性

| 现有接口 | 兼容性处理 |
|----------|------------|
| `getList` | 保持不变，内部逻辑调整为优先查询子分类数据 |
| `getDetail` | 保持不变 |

---

### 2.4 前端交互设计

#### 2.4.1 页面结构

```
首页 (pages/index/index)
├── Tab 切换区（综艺/电影/热剧）
├── 子分类切换区（恋爱/搞笑/真人秀 或 悬疑/恋爱/喜剧 或 韩剧/日剧/国产剧）
└── 影片列表区

详情页 (pages/detail/index) - 保持不变
```

#### 2.4.2 子分类交互

1. **Tab 切换**：点击主 Tab（综艺/电影/热剧）时
   - 重置子分类为第一个
   - 列表滚动到顶部

2. **子分类切换**：
   - 横向滚动支持
   - 切换时显示 loading
   - 加载完成后自动滚动到顶部

3. **下拉刷新**：
   - 触发时显示 "正在刷新榜单..."
   - 刷新成功后显示 "榜单已更新"
   - 刷新失败显示 "刷新失败，请重试"

4. **上拉加载**：
   - 本次需求固定30部，不启用上拉加载
   - 列表底部显示 "— 已加载全部 —"

#### 2.4.3 视觉规范（保持新拟态风格）

**子分类 Tab 样式：**
```css
.sub-tab {
  background: #F0F0F0;  /* 新拟态凸起 */
  box-shadow: 6px 6px 12px #D1D1D1, -6px -6px 12px #FFFFFF;
  border-radius: 20px;
}

.sub-tab.active {
  background: linear-gradient(145deg, #E6E6E6, #FFFFFF);  /* 新拟态凹陷 */
  box-shadow: inset 4px 4px 8px #D1D1D1, inset -4px -4px 8px #FFFFFF;
}
```

**榜单数量标识：**
```
[恋爱]  (30部)
```

---

### 2.5 定时刷新机制

#### 2.5.1 刷新策略

| 刷新类型 | 执行时间 | 内容 |
|----------|----------|------|
| 定时刷新 | 每日 12:00 | 全部子分类重新计算 |
| 定时刷新 | 每日 18:00 | 全部子分类重新计算 |
| 手动刷新 | 用户触发 | 指定单个子分类 |
| 全量刷新 | 管理员触发 | 全部子分类 |

#### 2.5.2 刷新算法

```javascript
async function refreshSubCategory(mainCategory, subCategory) {
  // 1. 获取最近5年内该子分类的全部作品
  const allItems = await db.collection('movies')
    .where({
      mainCategory,
      subCategory,
      year: _.gte(2020)  // 简化判断，实际需更精确
    })
    .orderBy('rating', 'desc')
    .limit(60)  // 多取一些用于筛选
    .get()

  // 2. 按评分排序取前30作为正式榜单
  const primaryList = allItems.data.slice(0, 30)

  // 3. 31-50作为递补池
  const reserveList = allItems.data.slice(30, 50)

  // 4. 更新数据库标记
  // ... 批量更新 isReserve 标记

  // 5. 记录刷新时间
  await db.collection('config').doc(`refresh_${mainCategory}_${subCategory}`).set({
    data: {
      refreshAt: db.serverDate()
    }
  })
}
```

#### 2.5.3 定时任务配置

使用微信云开发的定时触发器（需开通）：

```json
{
  "triggers": [
    {
      "name": "daily-refresh-noon",
      "type": "timer",
      "config": "0 0 12 * * * *"
    },
    {
      "name": "daily-refresh-evening",
      "type": "timer",
      "config": "0 0 18 * * * *"
    }
  ]
}
```

---

### 2.6 图片本地缓存方案

#### 2.6.1 缓存架构

```
┌─────────────────────────────────────────────────────────┐
│                      调用流程                            │
├─────────────────────────────────────────────────────────┤
│  1. 检查 Storage 本地缓存                               │
│         ↓ 命中                                           │
│  2. 返回本地缓存路径                                     │
│         ↓ 未命中                                         │
│  3. 检查云数据库 posterCached 字段                       │
│         ↓ 命中且 poster 有值                             │
│  4. 下载到 Storage，返回云数据库 URL                      │
│         ↓ 未命中                                         │
│  5. 调用 imageCache 云函数获取 TMDB poster               │
│         ↓ 获取成功                                       │
│  6. 更新云数据库 poster + posterCached                    │
│  7. 缓存到 Storage，返回 URL                             │
│         ↓ 获取失败                                       │
│  8. 返回默认占位图                                       │
└─────────────────────────────────────────────────────────┘
```

#### 2.6.2 缓存键设计

```javascript
// Storage Key 格式
const cacheKey = `poster_${item._id}_${item.updatedAt?.substring(0, 10) || 'v1'}`

// 缓存到 Storage 的数据结构
{
  url: 'https://.../poster.jpg',
  cachedAt: 1712467200000,
  itemId: 'xxx'
}
```

#### 2.6.3 缓存策略

| 缓存位置 | 容量限制 | 过期策略 | 清理机制 |
|----------|----------|----------|----------|
| Storage | ≤ 50MB | 7天 | LRU + 总大小监控 |
| 云数据库 | 无限制 | 永久 | posterCached 字段控制 |

#### 2.6.4 工具函数封装

```javascript
// miniprogram/utils/imageCache.js

const POSTER_CACHE_PREFIX = 'poster_'
const DEFAULT_POSTER = 'data:image/svg+xml,...'

async function getCachedPoster(item) {
  if (!item || !item._id) return DEFAULT_POSTER

  // 1. 检查 Storage
  const cacheKey = `${POSTER_CACHE_PREFIX}${item._id}`
  const cached = wx.getStorageSync(cacheKey)

  if (cached && cached.url) {
    // 检查过期（7天）
    if (Date.now() - cached.cachedAt < 7 * 24 * 60 * 60 * 1000) {
      return cached.url
    }
  }

  // 2. 检查云数据库已有 poster
  if (item.poster && item.poster.includes('tmdb.org')) {
    // 缓存到 Storage
    wx.setStorageSync(cacheKey, {
      url: item.poster,
      cachedAt: Date.now(),
      itemId: item._id
    })
    return item.poster
  }

  // 3. 调用云函数获取
  // ... (复用现有 imageCache 逻辑)

  return DEFAULT_POSTER
}

function clearExpiredCache() {
  const keys = wx.getStorageInfoSync().keys
  const now = Date.now()
  const expireTime = 7 * 24 * 60 * 60 * 1000

  keys.forEach(key => {
    if (key.startsWith(POSTER_CACHE_PREFIX)) {
      const cached = wx.getStorageSync(key)
      if (cached && now - cached.cachedAt > expireTime) {
        wx.removeStorageSync(key)
      }
    }
  })
}

module.exports = {
  getCachedPoster,
  clearExpiredCache
}
```

---

## 三、数据统计

### 3.1 榜单规模

| 主分类 | 子分类 | 正式作品 | 递补作品 | 小计 |
|--------|--------|----------|----------|------|
| 综艺 | 恋爱 | 30 | 20 | 50 |
| 综艺 | 搞笑 | 30 | 20 | 50 |
| 综艺 | 真人秀 | 30 | 20 | 50 |
| 电影 | 悬疑 | 30 | 20 | 50 |
| 电影 | 恋爱 | 30 | 20 | 50 |
| 电影 | 喜剧 | 30 | 20 | 50 |
| 热剧 | 韩剧 | 30 | 20 | 50 |
| 热剧 | 日剧 | 30 | 20 | 50 |
| 热剧 | 国产剧 | 30 | 20 | 50 |
| **合计** | **9** | **270** | **180** | **450** |

---

## 四、边界情况处理

### 4.1 数据不足场景

| 场景 | 处理方案 |
|------|----------|
| 某子分类作品不足50部 | 展示全部可用作品，递补池相应减少 |
| 某子分类作品不足20部 | 递补池为空，不显示递补提示 |
| 某子分类作品为0 | 显示空列表 + "暂无数据" |
| 全部数据都不足5年 | 所有作品按实际年份保留，显示提示"榜单数据较少" |

### 4.2 时间边界

| 年份 | 判断逻辑 |
|------|----------|
| 2026 | 纳入（当前年份） |
| 2025 | 纳入 |
| 2024 | 纳入 |
| 2023 | 纳入 |
| 2022 | 纳入 |
| 2021 | 纳入 |
| 2020 | 纳入（忽略月份，保留所有2020年数据） |
| 2019及以前 | 排除 |

### 4.3 图片加载失败

| 场景 | 处理方案 |
|------|----------|
| TMDB API 超时 | 显示默认占位图，不阻塞列表渲染 |
| 图片 URL 404 | 显示默认占位图，标记 posterCached=false |
| Storage 写入失败 | 跳过缓存，使用云数据库 URL |
| Storage 读取失败 | 清除损坏缓存，重新获取 |

### 4.4 并发刷新

| 场景 | 处理方案 |
|------|----------|
| 12:00和18:00同时触发 | 云函数加锁，串行执行 |
| 用户手动刷新时定时触发 | 手动刷新优先，定时任务跳过 |
| 刷新进行中再次触发 | 返回"刷新中，请稍后" |

---

## 五、非功能需求

### 5.1 性能要求

| 指标 | 目标值 |
|------|--------|
| 子分类切换响应时间 | ≤ 500ms |
| 首屏图片加载完成 | ≤ 2s |
| Storage 缓存命中率 | ≥ 80%（针对重复访问） |
| 云函数冷启动 | ≤ 3s |

### 5.2 兼容性要求

- 微信版本：≥ 7.0.0
- 基础库版本：≥ 2.14.0
- 操作系统：iOS 12+，Android 8+

### 5.3 监控指标

| 指标 | 描述 |
|------|------|
| `list_load_time` | 列表加载耗时 |
| `poster_cache_hit_rate` | 海报缓存命中率 |
| `refresh_success_rate` | 定时刷新成功率 |
| `api_error_count` | API 错误次数 |

---

## 六、技术约束（不可变更）

1. **app.js**：不可修改基础逻辑
2. **utils/api.js**：不可修改基础封装
3. **utils/tmdb.js**：不可修改 TMDB 调用逻辑
4. **云开发配置**：env、database、cloudfunction 路径不可变更

---

## 七、待确认事项

- [x] 子分类划分方案（已确认：综艺=恋爱/搞笑/真人秀，电影=悬疑/恋爱/喜剧，热剧=韩剧/日剧/国产剧）
- [x] 正式作品30部 + 递补作品20部（已确认：硬性要求）
- [x] 排序规则（已确认：按评分降序）
- [x] 刷新时间（已确认：每日12:00和18:00）
- [x] 时间窗口（已确认：2020年4月后）
- [x] 递补池是否需要单独页面展示？（已确认：不需要）
- [x] 是否需要展示刷新倒计时？（已确认：不需要）

---

## 八、里程碑计划

| 阶段 | 内容 | 产出物 |
|------|------|--------|
| Phase 1 | 数据层重构 | 数据库字段 + 索引 |
| Phase 2 | 云函数开发 | movieService 新增 action |
| Phase 3 | 前端交互实现 | 页面 + 组件 |
| Phase 4 | 图片缓存实现 | imageCache 增强 |
| Phase 5 | 定时任务配置 | 触发器 + 监控 |
| Phase 6 | 测试与优化 | 边界 case + 性能 |

---

## 九、附录

### 9.1 术语表

| 术语 | 说明 |
|------|------|
| 主分类 | 综艺、电影、热剧（一级 Tab） |
| 子分类 | 恋爱、搞笑、真人秀、悬疑、喜剧、韩剧、日剧、国产剧（二级 Tab） |
| 正式作品 | 前台展示的30部作品 |
| 递补池 | 后台储备的20部递补作品 |
| 榜单刷新 | 重新计算子分类作品列表 |

### 9.2 参考文档

- [微信云开发文档](https://developers.weixin.qq.com/miniprogram/dev/wxcloud/guide/)
- [云数据库索引文档](https://developers.weixin.qq.com/miniprogram/dev/wxcloud/guide/database/index.html)
- [云函数定时触发器](https://developers.weixin.qq.com/miniprogram/dev/wxcloud/guide/functions/triggers.html)

---

*文档结束*
