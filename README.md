# 影视排行榜

一款采用新拟态（Neumorphism）设计风格的微信小程序，用于浏览综艺、电影、热剧排行榜。

## 项目特点

- **新拟态设计**：柔和的渐变背景、软质凸起的光影效果、大圆角设计
- **简洁架构**：单页面应用，三个主分类（综艺/电影/热剧）及子分类
- **云开发**：基于微信云开发，无需服务器部署

## 项目结构

```
july/
├── miniprogram/                 # 小程序前端
│   ├── pages/                   # 页面
│   │   ├── index/               # 首页（排行榜列表）
│   │   └── detail/              # 详情页
│   ├── components/              # 组件
│   │   ├── empty/               # 空状态组件
│   │   ├── filter-bar/          # 筛选栏组件
│   │   ├── loading/             # 加载组件
│   │   ├── movie-card/          # 影视卡片组件
│   │   └── movie-list/          # 影视列表组件
│   ├── utils/                   # 工具函数
│   │   ├── api.js               # 云函数调用封装
│   │   ├── config.js            # 配置文件
│   │   └── util.js              # 通用工具
│   ├── images/                  # 图片资源
│   ├── app.js                   # 小程序入口
│   ├── app.json                 # 小程序配置
│   └── app.wxss                 # 全局样式
├── cloudfunctions/              # 云函数
│   ├── movieService/            # 影视服务（列表、详情）
│   ├── searchService/           # 搜索服务
│   └── userService/             # 用户服务
├── scripts/                     # 脚本
│   └── data/
│       └── new_data.json        # 初始数据
└── project.config.json          # 项目配置
```

## 快速开始

### 1. 环境准备

- 安装 [微信开发者工具](https://developers.weixin.qq.com/miniprogram/dev/devtools/download.html)
- 注册微信小程序账号，获取 AppID

### 2. 导入项目

1. 打开微信开发者工具
2. 导入项目目录
3. 填写 AppID

### 3. 开通云开发

1. 点击工具栏「云开发」按钮
2. 开通云开发环境，记录环境 ID
3. 修改 `miniprogram/utils/config.js` 中的环境 ID

### 4. 创建数据库集合

在云开发控制台创建以下集合：

- `movies` - 影视数据

### 5. 导入初始数据

1. 进入云开发控制台 → 数据库 → movies 集合
2. 点击「导入」→ 选择 `scripts/data/new_data.json`
3. 文件类型选择「JSON Lines」

### 6. 部署云函数

右键点击 `cloudfunctions` 目录下的每个云函数文件夹，选择「上传并部署：云端安装依赖」

## 分类结构

| 主分类 | 子分类 |
|--------|--------|
| 综艺 | 搞笑、竞技、恋爱 |
| 电影 | 国内、国外 |
| 热剧 | 国内、日剧、韩剧 |

## 设计风格

采用新拟态（Neumorphism）设计：

- **渐变背景**：左上浅天蓝 → 右下浅樱花粉
- **凸起效果**：左上高光阴影 + 右下深色阴影
- **凹陷效果**：激活状态使用内阴影
- **圆角设计**：大圆角，柔和视觉
- **细字重**：低对比度浅灰蓝色文字

## 技术栈

- 微信小程序原生框架
- 微信云开发
- 云函数（Node.js）
- 云数据库

## License

MIT
