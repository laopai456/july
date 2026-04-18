# 项目规则

## Git 提交
- 每次代码修改完成后，自动执行 `git add` + `git commit`，无需用户确认。
- commit message 使用中文，格式：`type(scope): 描述`。

## 数据安全（血的教训）
- **永远不要在服务器上执行 `git checkout -- data.json`**，会丢失抓取数据
- 服务器上操作 data.json 前，必须先备份：`cp data.json data.json.bak`
- `data.json` 已加入 `.gitignore`，不要重新 track 它
- 涉及服务器 git pull 时，用 `git stash` 而非 `git checkout` 处理冲突

## 功能修改必须全局同步
- 改前端显示列表（如去掉某个标签），必须同步修改所有相关位置：
  - 前端 GENRE_LIST
  - 抓取脚本 GENRE_TAGS
  - 去重脚本 GENRE_TAGS
  - server.js / 云函数中的硬编码列表
- 改完一个文件后，grep 检查所有相关引用是否同步更新

## 服务器操作规范
- 长时间运行的抓取脚本用 `nohup` + 后台执行
- 跑脚本前先确认服务器代码是最新版（git pull）
- 不要从服务器 push 到 GitHub，只从本地 push，服务器只 pull

## 计划/规格文档规范
- 写入 `docs/superpowers/plans/` 或 `docs/superpowers/specs/`
- 必须自包含：新会话的 AI 无需读取任何其他文件即可理解并执行
- 必须包含以下章节：
  - **项目上下文**：项目结构、数据模型、关键文件路径、设计风格、Git 规范
  - **文件结构**：列出所有要创建/修改的文件及其职责
  - **任务分解**：每个步骤包含完整代码，禁止占位符（TODO/TBD/待定）
  - **自检清单**：规格覆盖度、占位符扫描、类型一致性
- 引用文件时用绝对路径，引用代码时标注行号范围
