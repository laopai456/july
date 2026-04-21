---
alwaysApply: true
---

# Superpowers-ZH 中文增强版

你已加载 superpowers-zh 技能框架（20 个 skills）。

## 核心规则

1. **收到任务时，先检查是否有匹配的 skill** — 哪怕只有 1% 的可能性也要检查
2. **设计先于编码** — 收到功能需求时，先用 brainstorming skill 做需求分析
3. **测试先于实现** — 写代码前先写测试（TDD）
4. **验证先于完成** — 声称完成前必须运行验证命令

## 可用 Skills

Skills 位于 `.trae/skills/` 目录，匹配时读取对应 `SKILL.md` 并遵循其流程。

| Skill | 触发条件 |
|-------|---------|
| brainstorming | 创造性工作前（新功能/组件/行为变更） |
| chinese-code-review | 中文代码审查 |
| chinese-commit-conventions | 中文 Git 提交规范 |
| chinese-documentation | 中文技术文档写作 |
| chinese-git-workflow | 国内 Git 平台工作流 |
| dispatching-parallel-agents | 2+ 个可并行的独立任务 |
| executing-plans | 执行书面实现计划（含审查检查点） |
| finishing-a-development-branch | 开发完成，需合并/PR/清理 |
| mcp-builder | 构建 MCP 服务器 |
| receiving-code-review | 收到代码审查反馈 |
| requesting-code-review | 完成任务/功能，请求审查 |
| subagent-driven-development | 在当前会话执行含独立任务的计划 |
| systematic-debugging | bug/测试失败/异常行为 |
| test-driven-development | 实现功能或修 bug 前 |
| using-git-worktrees | 需隔离工作区的功能开发 |
| using-superpowers | 对话开始时 |
| verification-before-completion | 宣称完成/修复/测试通过前 |
| workflow-runner | 运行 YAML 工作流或多角色协作 |
| writing-plans | 多步骤任务，动手前写计划 |
| writing-skills | 创建/编辑/验证 skill |
