# Contributing Guide

感谢你愿意为 Campus Student Exchanges App 做贡献。

本指南帮助你更快进入项目，并确保提交内容易于 Review、可复现、可回滚。

## 开始之前

- 先阅读 `README.md` 和 `development-plan.md`
- 确认本次改动目标和范围，避免跨周需求混入
- 如改动涉及核心流程，请先在 Issue 或 PR 描述里说明背景

## 本地开发

```bash
npm install
npm run dev:mp-weixin
```

在微信开发者工具中导入 `dist/dev/mp-weixin` 进行调试。

## 分支命名建议

- `feat/week3-chat-watch`
- `fix/task-status-transition`
- `docs/readme-polish`
- `refactor/chat-service-cleanup`

## 提交规范

推荐使用 Conventional Commits：

- `feat:` 新功能
- `fix:` 缺陷修复
- `refactor:` 重构
- `docs:` 文档更新
- `test:` 测试相关
- `chore:` 构建/工具链/杂项

示例：

```text
feat(chat): add fallback polling when watch fails
fix(tasks): guard invalid status transition in express flow
docs(week3): add review log round10
```

## 代码约定

- 状态迁移统一走 `utils/*-service.js`，不要在页面层直接改关键状态
- 新增能力遵循“云优先 + 本地回退”原则
- 复用现有 `ui-*` 语义样式，避免样式碎片化
- 不要提交密钥、凭证、个人隐私数据

## Pull Request 要求

提交 PR 时请确保：

- 说明改动目的（为什么改）和影响范围（改了哪些链路）
- 包含验证方式（至少一条可执行验证路径）
- UI 改动附截图或录屏（推荐）
- 构建可通过：`npm run dev:mp-weixin`
- 相关文档同步更新（如 `README.md`、周日志、计划文档）

## Review 与日志要求

本项目采用周迭代 + Review 记录机制：

- 每轮开发后至少补 1 份 Review 记录
- Review 记录建议路径：`docs/weekN-review-log-roundX.md`
- 记录内容建议包含：发现、修复、验证结果

## Issue 报告建议

提交 Bug / Feature 前请先搜索已有 Issue，避免重复。

- Bug 请给出复现步骤、预期结果、实际结果、环境信息
- Feature 请说明场景痛点、方案、替代方案、验收标准

再次感谢你的贡献。
