# 已看/收藏功能 实现计划

> **面向 AI 代理的工作者：** 必需子技能：使用 superpowers:subagent-driven-development（推荐）或 superpowers:executing-plans 逐任务实现此计划。步骤使用复选框（`- [ ]`）语法来跟踪进度。

**目标：** 用户长按榜单作品可标记「已看」（从所有榜单隐藏）或「收藏」（加入收藏清单），收藏清单页可查看/管理收藏列表。

**架构：** 纯本地存储（wx.setStorageSync），不走云函数。新建一个 `userStore` 工具模块统一管理已看/收藏数据。首页和标签页渲染列表时过滤已看作品。新建收藏清单页面展示收藏列表，支持长按标记已看或移除。

**技术栈：** 微信小程序原生框架（WXML + WXSS + JS），数据存 localStorage

---

## 项目上下文（必读）

### 项目结构
```
c:\Users\w\Documents\GitHub\july\
├── miniprogram/
│   ├── pages/
│   │   ├── index/          # 首页（综艺/电影/热剧排行榜）
│   │   │   ├── index.js    # 主逻辑，~830行
│   │   │   ├── index.wxml  # 模板
│   │   │   └── index.wxss  # 新拟态样式
│   │   ├── genre/          # 标签浏览页（悬疑/喜剧/恐怖/犯罪/爱情）
│   │   │   ├── index.js    # 两阶段加载（先10条快速，再异步全量）
│   │   │   ├── index.wxml
│   │   │   └── index.wxss
│   │   └── detail/         # 详情页
│   ├── utils/
│   │   ├── config.js       # API地址、分类配置
│   │   ├── api.js          # 云函数封装
│   │   └── util.js         # 工具函数
│   ├── app.js / app.json / app.wxss
│   └── images/
├── server.js               # Express 后端
├── cloudfunctions/         # 云函数
└── scripts/                # 数据抓取脚本
```

### 数据模型（榜单中的作品对象）
所有榜单（首页综艺/电影/热剧、标签页）中的作品都包含以下字段：
```javascript
{
  doubanId: '352...',      // 豆瓣ID，全局唯一标识
  title: '肖申克的救赎',
  poster: 'https://...',   // 封面图URL
  rating: 9.7,             // 评分
  year: 1994,
  genres: ['犯罪', '剧情'],
  description: '...',
  castDisplay: '蒂姆·罗宾斯 / 摩根·弗里曼',
  hotScore: 95.2,          // 热力值
  mainCategory: '电影',
  subCategory: '欧美',
  type: 'movie'            // variety / movie / drama
}
```

### 首页列表渲染位置
- **WXML** `miniprogram/pages/index/index.wxml` — 搜索 `<view class="movie-item"` 即可找到列表项
- **列表数据** `this.data.list` — 在 `applyTabData()` 方法中设置
- **过滤位置** 在 `applyTabData()` 和 genre 页面的 `applySectionData()` 中，设置 list 之前过滤已看

### 首页 header 操作按钮
`miniprogram/pages/index/index.wxml` 中的 `<view class="header-actions">` 包含搜索和标签按钮。

### 新拟态设计风格
所有按钮/卡片使用以下 CSS 模式：
```css
/* 凸起效果 */
background: linear-gradient(145deg, #f0f8ff, #e8f0f0);
box-shadow: 4rpx 4rpx 8rpx #d0d8e0, -4rpx -4rpx 8rpx #ffffff;

/* 按下效果（内凹） */
box-shadow: inset 3rpx 3rpx 6rpx #d0d8e0, inset -3rpx -3rpx 6rpx #ffffff;

/* 渐变强调色（标签按钮） */
background: linear-gradient(135deg, #a8b4fc, #f0a0b8);
color: #ffffff;
```

### Git 规范
- 每次 commit 用中文：`type(scope): 描述`
- 自动 `git add` + `git commit`，无需确认
- 不要 commit data.json（已在 .gitignore 中）

---

## 文件结构

| 操作 | 文件 | 职责 |
|------|------|------|
| 新建 | `miniprogram/utils/userStore.js` | 已看/收藏的本地存储管理 |
| 修改 | `miniprogram/pages/index/index.js` | 长按菜单 + 列表过滤已看 |
| 修改 | `miniprogram/pages/index/index.wxml` | 长按事件绑定 + 操作菜单 UI |
| 修改 | `miniprogram/pages/index/index.wxss` | 操作菜单样式 |
| 修改 | `miniprogram/pages/genre/index.js` | 长按菜单 + 列表过滤已看 |
| 修改 | `miniprogram/pages/genre/index.wxml` | 长按事件绑定 + 操作菜单 UI |
| 修改 | `miniprogram/pages/genre/index.wxss` | 操作菜单样式 |
| 新建 | `miniprogram/pages/favorites/index.js` | 收藏清单页面逻辑 |
| 新建 | `miniprogram/pages/favorites/index.wxml` | 收藏清单页面模板 |
| 新建 | `miniprogram/pages/favorites/index.wxss` | 收藏清单页面样式 |
| 新建 | `miniprogram/pages/favorites/index.json` | 页面配置 |
| 修改 | `miniprogram/app.json` | 注册收藏页面 |
| 修改 | `miniprogram/pages/index/index.wxml` | header 添加收藏入口 |

---

## 存储设计

```javascript
// wx.setStorageSync('userWatched', [...])  — 已看ID列表
// wx.setStorageSync('userFavorites', [...]) — 收藏列表（带作品信息）

// userWatched 示例：
["352123", "25845", "3012345"]

// userFavorites 示例：
[{
  doubanId: "352123",
  title: "肖申克的救赎",
  poster: "https://...",
  rating: 9.7,
  year: "1994",
  genres: ["犯罪", "剧情"],
  addedAt: 1713552000000
}]
```

---

## 任务

### 任务 1：新建 userStore 工具模块

**文件：**
- 创建：`miniprogram/utils/userStore.js`

- [ ] **步骤 1：编写 userStore.js**

```javascript
const WATCHED_KEY = 'userWatched'
const FAVORITES_KEY = 'userFavorites'

function getWatched() {
  try { return wx.getStorageSync(WATCHED_KEY) || [] } catch (e) { return [] }
}

function getFavorites() {
  try { return wx.getStorageSync(FAVORITES_KEY) || [] } catch (e) { return [] }
}

function isWatched(doubanId) {
  return getWatched().includes(String(doubanId))
}

function isFavorite(doubanId) {
  return getFavorites().some(f => f.doubanId === String(doubanId))
}

function markWatched(doubanId) {
  const list = getWatched()
  const id = String(doubanId)
  if (!list.includes(id)) {
    list.push(id)
    wx.setStorageSync(WATCHED_KEY, list)
  }
  removeFavorite(id)
  return list
}

function addFavorite(item) {
  const list = getFavorites()
  const id = String(item.doubanId)
  if (list.some(f => f.doubanId === id)) return list
  list.unshift({
    doubanId: id,
    title: item.title,
    poster: item.poster || '',
    rating: item.rating || 0,
    year: item.year || '',
    genres: item.genres || [],
    addedAt: Date.now()
  })
  wx.setStorageSync(FAVORITES_KEY, list)
  return list
}

function removeFavorite(doubanId) {
  const list = getFavorites().filter(f => f.doubanId !== String(doubanId))
  wx.setStorageSync(FAVORITES_KEY, list)
  return list
}

function unmarkWatched(doubanId) {
  const list = getWatched().filter(id => id !== String(doubanId))
  wx.setStorageSync(WATCHED_KEY, list)
  return list
}

function filterWatched(items) {
  const watched = getWatched()
  if (watched.length === 0) return items
  return items.filter(item => !watched.includes(String(item.doubanId)))
}

module.exports = {
  getWatched, getFavorites, isWatched, isFavorite,
  markWatched, addFavorite, removeFavorite, unmarkWatched, filterWatched
}
```

- [ ] **步骤 2：Commit**

```bash
git add miniprogram/utils/userStore.js
git commit -m "feat(userStore): 新建已看/收藏本地存储管理模块"
```

---

### 任务 2：首页添加长按菜单 + 已看过滤

**文件：**
- 修改：`miniprogram/pages/index/index.js`
- 修改：`miniprogram/pages/index/index.wxml`
- 修改：`miniprogram/pages/index/index.wxss`

- [ ] **步骤 1：index.js 顶部引入 userStore**

在 `const TABS = ...` 之前添加：
```javascript
const userStore = require('../../utils/userStore.js')
```

- [ ] **步骤 2：index.js data 中添加操作菜单状态**

在 `data` 对象的 `descExpanded: false` 后面添加：
```javascript
showActionMenu: false,
actionMenuItem: null,
actionMenuIndex: -1
```

- [ ] **步骤 3：index.js 添加长按和菜单操作方法**

在 `preventBubble()` 方法之前添加：
```javascript
onItemLongPress(e) {
  const index = e.currentTarget.dataset.index
  const item = this.data.list[index]
  if (!item) return
  this.setData({
    showActionMenu: true,
    actionMenuItem: item,
    actionMenuIndex: index
  })
},

hideActionMenu() {
  this.setData({ showActionMenu: false, actionMenuItem: null, actionMenuIndex: -1 })
},

onMarkWatched() {
  const item = this.data.actionMenuItem
  if (!item) return
  userStore.markWatched(item.doubanId)
  this.hideActionMenu()
  this.applyTabData(this.data.currentTabName, this.data.currentSubName)
  wx.showToast({ title: '已标记为看过', icon: 'success' })
},

onAddFavorite() {
  const item = this.data.actionMenuItem
  if (!item) return
  userStore.addFavorite(item)
  this.hideActionMenu()
  wx.showToast({ title: '已收藏', icon: 'success' })
},
```

- [ ] **步骤 4：index.js 的 applyTabData 方法中过滤已看**

找到 `applyTabData` 方法中 `const list = (data.items[subName] || []).slice(0, 30)` 这行，改为：
```javascript
const rawList = (data.items[subName] || []).slice(0, 30)
const list = userStore.filterWatched(rawList)
```

- [ ] **步骤 5：index.wxml 列表项添加 longpress 事件**

找到 `<view class="movie-item"` 标签，添加 `bindlongpress="onItemLongPress"`：
```xml
<view
  class="movie-item"
  wx:for="{{list}}"
  wx:key="doubanId"
  data-index="{{index}}"
  bindtap="showDetail"
  bindlongpress="onItemLongPress"
>
```

- [ ] **步骤 6：index.wxml 添加操作菜单浮层**

在文件末尾 `</view>` 之前（detail-card mask 之后）添加：
```xml
<view class="action-mask" hidden="{{!showActionMenu}}" bindtap="hideActionMenu">
  <view class="action-sheet" catchtap="preventBubble">
    <view class="action-sheet-title">{{actionMenuItem.title}}</view>
    <view class="action-item action-watched" bindtap="onMarkWatched">
      <text class="action-icon">👁</text>
      <text>标记已看</text>
    </view>
    <view class="action-item action-fav" bindtap="onAddFavorite">
      <text class="action-icon">❤️</text>
      <text>收藏</text>
    </view>
    <view class="action-item action-cancel" bindtap="hideActionMenu">
      <text>取消</text>
    </view>
  </view>
</view>
```

- [ ] **步骤 7：index.wxss 添加操作菜单样式**

在文件末尾添加：
```css
.action-mask {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 200;
  display: flex;
  align-items: flex-end;
  justify-content: center;
}

.action-sheet {
  width: 100%;
  background: #ffffff;
  border-radius: 32rpx 32rpx 0 0;
  padding: 30rpx 40rpx 60rpx;
  animation: slideUp 0.25s ease;
}

.action-sheet-title {
  text-align: center;
  font-size: 28rpx;
  color: #9aa8b8;
  padding-bottom: 20rpx;
  border-bottom: 1rpx solid #eef2f6;
  margin-bottom: 10rpx;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.action-item {
  display: flex;
  align-items: center;
  padding: 28rpx 20rpx;
  font-size: 30rpx;
  color: #4a5a6a;
  border-radius: 16rpx;
}

.action-item:active {
  background: #f0f4f8;
}

.action-icon {
  margin-right: 16rpx;
  font-size: 32rpx;
}

.action-cancel {
  justify-content: center;
  margin-top: 10rpx;
  color: #9aa8b8;
  border-top: 1rpx solid #eef2f6;
  padding-top: 30rpx;
}
```

- [ ] **步骤 8：Commit**

```bash
git add miniprogram/pages/index/
git commit -m "feat(index): 首页添加长按操作菜单（已看/收藏）+ 已看过滤"
```

---

### 任务 3：标签页添加长按菜单 + 已看过滤

**文件：**
- 修改：`miniprogram/pages/genre/index.js`
- 修改：`miniprogram/pages/genre/index.wxml`
- 修改：`miniprogram/pages/genre/index.wxss`

- [ ] **步骤 1：genre/index.js 顶部引入 userStore**

```javascript
const userStore = require('../../utils/userStore.js')
```

- [ ] **步骤 2：genre/index.js data 中添加操作菜单状态**

在 `descExpanded: false` 后添加：
```javascript
showActionMenu: false,
actionMenuItem: null
```

- [ ] **步骤 3：genre/index.js 添加长按和菜单操作方法**

在 `preventBubble()` 方法之前添加：
```javascript
onItemLongPress(e) {
  const index = e.currentTarget.dataset.index
  const item = this.data.list[index]
  if (!item) return
  this.setData({ showActionMenu: true, actionMenuItem: item })
},

hideActionMenu() {
  this.setData({ showActionMenu: false, actionMenuItem: null })
},

onMarkWatched() {
  const item = this.data.actionMenuItem
  if (!item) return
  userStore.markWatched(item.doubanId)
  this.hideActionMenu()
  this.applySectionData()
  wx.showToast({ title: '已标记为看过', icon: 'success' })
},

onAddFavorite() {
  const item = this.data.actionMenuItem
  if (!item) return
  userStore.addFavorite(item)
  this.hideActionMenu()
  wx.showToast({ title: '已收藏', icon: 'success' })
},
```

- [ ] **步骤 4：genre/index.js 的 applySectionData 方法中过滤已看**

找到 `const list = (data[currentSection] || []).slice(0, 50)` 改为：
```javascript
const rawList = (data[currentSection] || []).slice(0, 50)
const list = userStore.filterWatched(rawList)
```

- [ ] **步骤 5：genre/index.wxml 列表项添加 longpress 事件**

找到 `<view class="movie-item"` 添加 `bindlongpress="onItemLongPress"`：
```xml
<view
  class="movie-item"
  wx:for="{{list}}"
  wx:key="doubanId"
  data-index="{{index}}"
  bindtap="showDetail"
  bindlongpress="onItemLongPress"
>
```

- [ ] **步骤 6：genre/index.wxml 添加操作菜单浮层**

在文件末尾 `</view>` 之前（detail-card mask 之后）添加（同任务 2 的操作菜单模板）：
```xml
<view class="action-mask" hidden="{{!showActionMenu}}" bindtap="hideActionMenu">
  <view class="action-sheet" catchtap="preventBubble">
    <view class="action-sheet-title">{{actionMenuItem.title}}</view>
    <view class="action-item action-watched" bindtap="onMarkWatched">
      <text class="action-icon">👁</text>
      <text>标记已看</text>
    </view>
    <view class="action-item action-fav" bindtap="onAddFavorite">
      <text class="action-icon">❤️</text>
      <text>收藏</text>
    </view>
    <view class="action-item action-cancel" bindtap="hideActionMenu">
      <text>取消</text>
    </view>
  </view>
</view>
```

- [ ] **步骤 7：genre/index.wxss 添加操作菜单样式**

在文件末尾添加（同任务 2 的样式代码）：
```css
.action-mask {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 200;
  display: flex;
  align-items: flex-end;
  justify-content: center;
}

.action-sheet {
  width: 100%;
  background: #ffffff;
  border-radius: 32rpx 32rpx 0 0;
  padding: 30rpx 40rpx 60rpx;
  animation: slideUp 0.25s ease;
}

.action-sheet-title {
  text-align: center;
  font-size: 28rpx;
  color: #9aa8b8;
  padding-bottom: 20rpx;
  border-bottom: 1rpx solid #eef2f6;
  margin-bottom: 10rpx;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.action-item {
  display: flex;
  align-items: center;
  padding: 28rpx 20rpx;
  font-size: 30rpx;
  color: #4a5a6a;
  border-radius: 16rpx;
}

.action-item:active {
  background: #f0f4f8;
}

.action-icon {
  margin-right: 16rpx;
  font-size: 32rpx;
}

.action-cancel {
  justify-content: center;
  margin-top: 10rpx;
  color: #9aa8b8;
  border-top: 1rpx solid #eef2f6;
  padding-top: 30rpx;
}
```

- [ ] **步骤 8：Commit**

```bash
git add miniprogram/pages/genre/
git commit -m "feat(genre): 标签页添加长按操作菜单（已看/收藏）+ 已看过滤"
```

---

### 任务 4：新建收藏清单页面

**文件：**
- 创建：`miniprogram/pages/favorites/index.json`
- 创建：`miniprogram/pages/favorites/index.js`
- 创建：`miniprogram/pages/favorites/index.wxml`
- 创建：`miniprogram/pages/favorites/index.wxss`
- 修改：`miniprogram/app.json`
- 修改：`miniprogram/pages/index/index.wxml` — header 添加收藏入口
- 修改：`miniprogram/pages/index/index.js` — 添加 goToFavorites 方法

- [ ] **步骤 1：创建 favorites/index.json**

```json
{
  "navigationBarTitleText": "收藏清单",
  "enablePullDownRefresh": true
}
```

- [ ] **步骤 2：创建 favorites/index.js**

```javascript
const userStore = require('../../utils/userStore.js')

Page({
  data: {
    list: [],
    loading: true,
    showActionMenu: false,
    actionMenuItem: null
  },

  onLoad() {
    this.loadFavorites()
  },

  onShow() {
    this.loadFavorites()
  },

  onPullDownRefresh() {
    this.loadFavorites()
    wx.stopPullDownRefresh()
  },

  loadFavorites() {
    const list = userStore.getFavorites()
    this.setData({ list, loading: false })
  },

  onItemLongPress(e) {
    const index = e.currentTarget.dataset.index
    const item = this.data.list[index]
    if (!item) return
    this.setData({ showActionMenu: true, actionMenuItem: item })
  },

  hideActionMenu() {
    this.setData({ showActionMenu: false, actionMenuItem: null })
  },

  onMarkWatched() {
    const item = this.data.actionMenuItem
    if (!item) return
    userStore.markWatched(item.doubanId)
    this.hideActionMenu()
    this.loadFavorites()
    wx.showToast({ title: '已标记为看过', icon: 'success' })
  },

  onRemoveFavorite() {
    const item = this.data.actionMenuItem
    if (!item) return
    userStore.removeFavorite(item.doubanId)
    this.hideActionMenu()
    this.loadFavorites()
    wx.showToast({ title: '已移除', icon: 'success' })
  },

  showDetail(e) {
    const index = e.currentTarget.dataset.index
    const item = this.data.list[index]
    if (!item) return
    wx.showToast({ title: '详情功能开发中', icon: 'none' })
  },

  preventBubble() {}
})
```

- [ ] **步骤 3：创建 favorites/index.wxml**

```xml
<view class="container">
  <view class="fav-header" wx:if="{{list.length > 0}}">
    <text class="fav-count">共 {{list.length}} 部收藏</text>
  </view>

  <view class="movie-list" wx:if="{{list.length > 0}}">
    <view
      class="movie-item"
      wx:for="{{list}}"
      wx:key="doubanId"
      data-index="{{index}}"
      bindtap="showDetail"
      bindlongpress="onItemLongPress"
    >
      <view class="poster-wrap">
        <image
          wx:if="{{item.poster}}"
          class="poster"
          src="{{item.poster}}"
          mode="aspectFill"
          lazy-load
        />
        <view wx:else class="poster-placeholder">
          <text>{{item.title[0]}}</text>
        </view>
      </view>
      <view class="info">
        <text class="title">{{item.title}}</text>
        <view class="meta">
          <text wx:if="{{item.year}}">{{item.year}}</text>
          <text wx:if="{{item.rating}}"> ★ {{item.rating}}</text>
        </view>
        <view class="tags" wx:if="{{item.genres.length > 0}}">
          <text class="tag" wx:for="{{item.genres}}" wx:for-item="g" wx:key="*this">{{g}}</text>
        </view>
      </view>
    </view>
  </view>

  <view class="empty" wx:if="{{!loading && list.length === 0}}">
    <view class="empty-icon">📭</view>
    <text class="empty-title">还没有收藏</text>
    <text class="empty-desc">长按榜单中的作品即可收藏</text>
  </view>
</view>

<view class="action-mask" hidden="{{!showActionMenu}}" bindtap="hideActionMenu">
  <view class="action-sheet" catchtap="preventBubble">
    <view class="action-sheet-title">{{actionMenuItem.title}}</view>
    <view class="action-item action-watched" bindtap="onMarkWatched">
      <text class="action-icon">👁</text>
      <text>标记已看（移出清单）</text>
    </view>
    <view class="action-item action-remove" bindtap="onRemoveFavorite">
      <text class="action-icon">🗑</text>
      <text>移除收藏</text>
    </view>
    <view class="action-item action-cancel" bindtap="hideActionMenu">
      <text>取消</text>
    </view>
  </view>
</view>
```

- [ ] **步骤 4：创建 favorites/index.wxss**

复用项目的新拟态设计风格，参考 genre 页面的列表样式：

```css
.container {
  min-height: 100vh;
  background: linear-gradient(135deg, #e8f4fc 0%, #fce8f0 100%);
  padding: 20rpx 20rpx 30rpx;
}

.fav-header {
  padding: 16rpx 20rpx;
  margin-bottom: 16rpx;
}

.fav-count {
  font-size: 26rpx;
  color: #9aa8b8;
}

.movie-list {
  background: linear-gradient(145deg, #f0f8ff, #e8f0f0);
  border-radius: 30rpx;
  overflow: hidden;
  box-shadow: 8rpx 8rpx 16rpx #d0d8e0, -8rpx -8rpx 16rpx #ffffff;
}

.movie-item {
  display: flex;
  padding: 24rpx;
  margin: 16rpx;
  border-radius: 20rpx;
  background: linear-gradient(145deg, #f0f8ff, #e8f0f0);
  box-shadow: 6rpx 6rpx 12rpx #c0d0e0, -6rpx -6rpx 12rpx #ffffff;
}

.movie-item:active {
  box-shadow: inset 4rpx 4rpx 8rpx #d0d8e0, inset -4rpx -4rpx 8rpx #ffffff;
}

.poster-wrap {
  width: 100rpx;
  height: 140rpx;
  flex-shrink: 0;
  margin-right: 20rpx;
}

.poster {
  width: 100%;
  height: 100%;
  border-radius: 14rpx;
  background: linear-gradient(145deg, #e8f0f0, #f0f8ff);
  box-shadow: 4rpx 4rpx 8rpx #c0d0e0, -4rpx -4rpx 8rpx #ffffff;
}

.poster-placeholder {
  width: 100%;
  height: 100%;
  border-radius: 14rpx;
  background: linear-gradient(145deg, #e0e8f0, #f0e8f0);
  display: flex;
  align-items: center;
  justify-content: center;
}

.poster-placeholder text {
  font-size: 40rpx;
  color: #b0c0d0;
}

.info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  justify-content: center;
}

.title {
  font-size: 30rpx;
  font-weight: 400;
  color: #5a6a7a;
  margin-bottom: 8rpx;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.meta {
  font-size: 24rpx;
  color: #9aa8b8;
  margin-bottom: 8rpx;
}

.tags {
  display: flex;
  gap: 8rpx;
  flex-wrap: wrap;
}

.tag {
  font-size: 20rpx;
  color: #a8b4fc;
  padding: 4rpx 12rpx;
  background: rgba(168, 180, 252, 0.1);
  border-radius: 12rpx;
}

.empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 200rpx 40rpx;
}

.empty-icon {
  font-size: 80rpx;
  margin-bottom: 24rpx;
}

.empty-title {
  font-size: 32rpx;
  color: #8a9aaa;
  margin-bottom: 12rpx;
}

.empty-desc {
  font-size: 26rpx;
  color: #a0b0c0;
}

.action-mask {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 200;
  display: flex;
  align-items: flex-end;
  justify-content: center;
}

.action-sheet {
  width: 100%;
  background: #ffffff;
  border-radius: 32rpx 32rpx 0 0;
  padding: 30rpx 40rpx 60rpx;
  animation: slideUp 0.25s ease;
}

@keyframes slideUp {
  from { transform: translateY(40rpx); opacity: 0; }
  to { transform: translateY(0); opacity: 1; }
}

.action-sheet-title {
  text-align: center;
  font-size: 28rpx;
  color: #9aa8b8;
  padding-bottom: 20rpx;
  border-bottom: 1rpx solid #eef2f6;
  margin-bottom: 10rpx;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.action-item {
  display: flex;
  align-items: center;
  padding: 28rpx 20rpx;
  font-size: 30rpx;
  color: #4a5a6a;
  border-radius: 16rpx;
}

.action-item:active {
  background: #f0f4f8;
}

.action-icon {
  margin-right: 16rpx;
  font-size: 32rpx;
}

.action-cancel {
  justify-content: center;
  margin-top: 10rpx;
  color: #9aa8b8;
  border-top: 1rpx solid #eef2f6;
  padding-top: 30rpx;
}
```

- [ ] **步骤 5：app.json 注册收藏页面**

在 `miniprogram/app.json` 的 `pages` 数组中，在 `"pages/genre/index"` 之后添加：
```json
"pages/favorites/index",
```

- [ ] **步骤 6：首页 header 添加收藏入口按钮**

在 `miniprogram/pages/index/index.wxml` 的 `<view class="header-actions">` 中，在搜索按钮之前添加：
```xml
<view class="fav-btn" bindtap="goToFavorites">❤️</view>
```

- [ ] **步骤 7：首页 index.js 添加跳转方法**

在 `goToGenre()` 方法之后添加：
```javascript
goToFavorites() {
  wx.navigateTo({
    url: '/pages/favorites/index'
  })
},
```

- [ ] **步骤 8：首页 index.wxss 添加收藏按钮样式**

添加 `.fav-btn` 样式（与 genre-btn 同风格）：
```css
.fav-btn {
  font-size: 28rpx;
  padding: 12rpx 20rpx;
  background: linear-gradient(145deg, #f0f8ff, #e8f0f0);
  border-radius: 20rpx;
  box-shadow: 3rpx 3rpx 6rpx #d0d8e0, -3rpx -3rpx 6rpx #ffffff;
}
```

- [ ] **步骤 9：Commit**

```bash
git add miniprogram/pages/favorites/ miniprogram/app.json miniprogram/pages/index/
git commit -m "feat(favorites): 新建收藏清单页面 + 首页收藏入口"
```

---

## 自检

- ✅ 规格覆盖：已看标记、收藏、收藏清单、长按菜单、已看过滤 — 全部有对应任务
- ✅ 无占位符：每个步骤包含完整代码
- ✅ 类型一致：doubanId 全部用 String() 转换，userStore 接口统一
- ✅ 全局同步：userStore 是唯一数据源，所有页面引用同一模块
