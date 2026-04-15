# 性能优化待办

## 更新时间
2026-04-16

---

## 待修复问题

### BUG-1 - 简介截断，无法获取完整内容

### 问题
电影、热剧、综艺的简介只显示约 80 字就截断了。抓取脚本从豆瓣移动版 meta description 获取的简介本身就不完整。

### 已完成的工作
- server.js 已有 `/api/subject/:id` 接口，支持通过标题搜索获取完整简介
- 前端 `fetchFullSummary` 已实现后台静默获取
- `_summaryCache` 已实现内存缓存

### 待解决
- 云函数超时只有 3 秒，获取完整简介链路（云函数→服务器→豆瓣搜索→豆瓣页面解析）容易超时
- 需要在微信云开发控制台将 dataService 云函数超时时间改为 20 秒
- 或者考虑在抓取脚本中直接获取完整简介，避免运行时补全

### 涉及文件
- `cloudfunctions/dataService/index.js` - 云函数超时配置
- `scripts/lib/douban.js` - 抓取脚本简介获取逻辑
- `server.js` - `/api/subject/:id` 接口

---

### BUG-2 - 点击简介卡片关闭后回到榜单顶部

### 问题
用户滚动到列表中间，点击某个条目查看简介卡片，关闭卡片后页面自动回到顶部，应该停留在原来的位置。

### 已尝试的方案（均未生效）
1. `hidden` 替代 `wx:if` — 无效
2. `opacity` + `pointer-events` CSS 控制 — 导致模拟器崩溃（detailItem 为 null 时模板报错）
3. `onPageScroll` 记录 + `wx.pageScrollTo` 恢复 — 无效
4. `wx.nextTick` + `setTimeout` 延迟恢复 — 无效

### 可能的方向
- 小程序 `setData` 可能会触发页面重排导致滚动位置丢失
- 考虑用 `scroll-view` 包裹整个列表，用 `scroll-top` 属性控制滚动位置
- 或者排查 `setData` 中哪些字段变化导致了页面重排

### 涉及文件
- `miniprogram/pages/index/index.js` - hideDetail 方法
- `miniprogram/pages/index/index.wxml` - card-mask 模板
- `miniprogram/pages/index/index.wxss` - card-mask 样式

---

## 已完成的优化（2026-04-15）

### P0 - 并行预加载 ✅
### P1 - 综艺一次加载缓存 ✅
### P3 - setData 优化 ✅
### P4 - 请求合并 ✅
### data.json 自动备份 ✅
### 详情卡片 UI 重构 ✅
### 电影/热剧演员显示 ✅
