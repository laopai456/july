# 影视排行榜 - 开发任务

## 当前状态

- ✅ 项目框架搭建完成
- ✅ 新拟态 UI 风格应用
- ✅ 云函数爬虫开发完成
- ⏳ 待导入数据并测试

---

## 云函数使用说明

由于免费版云函数超时限制为 3 秒，采用**分批抓取**策略。

### 调用方式

```javascript
// 初始化综艺数据（一次性）
wx.cloud.callFunction({ name: 'crawler', data: { type: 'init' } })

// 抓取电影第 1 页
wx.cloud.callFunction({ name: 'crawler', data: { type: 'movie', page: 1 } })

// 抓取电影第 2 页
wx.cloud.callFunction({ name: 'crawler', data: { type: 'movie', page: 2 } })

// 抓取热剧第 1 页
wx.cloud.callFunction({ name: 'crawler', data: { type: 'drama', page: 1 } })

// 抓取热剧第 2 页
wx.cloud.callFunction({ name: 'crawler', data: { type: 'drama', page: 2 } })
```

### 数据量

| 类型 | 每次数量 | 调用次数 | 总数 |
|------|----------|----------|------|
| 综艺 | 20 部 | 1 次 | 20 部 |
| 电影 | 10 部 | 5 次 | 50 部 |
| 热剧 | 10 部 | 5 次 | 50 部 |

---

## 下一步

1. 重新上传云函数：右键 `cloudfunctions/crawler` → 「上传并部署」
2. 在云开发控制台依次调用：
   - `{ type: 'init' }` - 初始化综艺
   - `{ type: 'movie', page: 1 }` - 电影第 1 页
   - `{ type: 'movie', page: 2 }` - 电影第 2 页
   - ... 依此类推
3. 测试小程序功能
