# Bug修复计划

## 问题分析

### 1. 电影/韩剧/日剧为空
**原因**：TMDB API请求失败时返回null，代码没有处理这种情况
- `tmdb.getPopularMovies()` 返回null时，后续操作会报错
- `tmdb.getPopularTV()` 返回null时，filter操作会失败

### 2. 韩剧/日剧筛选逻辑问题
**原因**：`origin_country`可能为空数组或undefined
- TMDB返回的数据中，`origin_country`可能是`[]`或`undefined`
- 导致`region`默认为`'cn'`，韩剧日剧都被错误分类

### 3. 综艺只有两三部
**原因**：豆瓣API过滤太严格
- `isForeign()`过滤了大量内容
- 豆瓣API可能返回空数据或被限制

### 4. 子分类统计不显示
**原因**：WXML条件`subCategoryCounts[index] > 0`
- 如果统计数字为0就不显示
- 需要改为始终显示

---

## 修复方案

### 步骤1：修复TMDB数据获取
- 添加空值检查
- 添加错误日志
- 确保返回数组

### 步骤2：修复韩剧/日剧筛选
- 使用`original_language`字段辅助判断
- 放宽筛选条件

### 步骤3：修复豆瓣综艺获取
- 减少过滤关键词
- 添加更多数据源标签
- 添加调试日志

### 步骤4：修复子分类统计显示
- WXML改为始终显示数字
- 默认显示0

---

## 执行顺序

1. 修复 `miniprogram/utils/tmdb.js` - 添加空值检查和错误处理
2. 修复 `miniprogram/pages/index/index.js` - 处理API返回null的情况
3. 修复 `cloudfunctions/douban/index.js` - 优化过滤逻辑
4. 修复 `miniprogram/pages/index/index.wxml` - 统计数字始终显示
