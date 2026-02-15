<div align="center">

# Campus Student Exchanges App

校园二手交易与任务互助小程序  
`uni-app + Vue 3 + Pinia + WeChat Cloud`

![uni-app](https://img.shields.io/badge/uni--app-3.x-42b883)
![Vue](https://img.shields.io/badge/Vue-3.4-4FC08D)
![Pinia](https://img.shields.io/badge/Pinia-2.x-F6C343)
![Platform](https://img.shields.io/badge/Platform-WeChat%20Mini%20Program-07C160)
![License](https://img.shields.io/badge/License-MIT-blue)

</div>

---

## 项目简介

这是一个面向校园场景的交易与互助平台，目标是把三条高频链路做顺：

- 二手交易（发布 -> 浏览 -> 联系）
- 任务互助（发单 -> 接单 -> 状态流转）
- 即时沟通（会话 -> 消息 -> 实时同步）

项目采用 **云优先 + 本地回退** 设计：云能力可用时走云，不可用时自动降级到本地存储，保证开发与演示稳定。

## 亮点

- 业务闭环清晰：商品、任务、聊天三大模块贯通
- 实时能力可回退：watch + polling 双通道兜底
- 交互细节持续优化：消息状态、未读、左滑操作、回底提示
- 工程文档完整：计划、周日志、Review 记录持续沉淀

## 当前进度

| 阶段 | 状态 | 内容 |
|---|---|---|
| Week 1 | Done | 项目骨架、登录、首页、商品列表基础能力 |
| Week 2 | Done (待最终验收) | 商品发布/详情/筛选/我的商品 + UI 收口 |
| Week 3 | In Progress | 任务与聊天增强，当前进入稳定性收口 |
| Week 4~8 | Planned | 求购、订单、动态、积分、维基、提审上线 |

## 功能总览

### 已完成（当前可用）

- 商品模块：列表、详情、发布、收藏、我的商品
- 任务模块：任务大厅、发布、详情、我的任务、快递专区
- 聊天模块：会话列表、聊天详情、文字/图片/卡片消息
- 工程能力：静态资源修复、全局 UI 语义样式、日志与 Review 机制

### 正在进行

- Week3 收口：任务实时提示、快递状态一致性、聊天体验稳定性

## 技术架构

```text
pages/*.vue
   -> utils/*-service.js
      -> cloud first (WeChat Cloud)
      -> fallback local storage
```

## 技术栈

| 类别 | 技术 |
|---|---|
| 前端 | `uni-app`、`Vue 3` |
| 状态管理 | `Pinia` |
| UI | `uview-plus`、`SCSS` |
| 构建 | `Vite`、`@dcloudio/vite-plugin-uni` |
| 平台 | 微信小程序（`mp-weixin`） |
| 后端能力 | 微信云开发（云数据库/云函数/云存储） |

## 项目结构

```text
.
├─ pages/              # 页面（商品/任务/聊天/个人中心）
├─ components/         # 公共组件
├─ utils/              # 业务服务层（云优先 + 本地回退）
├─ store/              # Pinia 状态
├─ cloudfunctions/     # 云函数模板
├─ static/             # 静态资源
├─ docs/               # 计划、工作日志、Review
├─ pages.json
├─ manifest.json
└─ vite.config.js
```

## 快速开始

### 1) 环境要求

- Node.js >= 18
- npm >= 9
- 微信开发者工具

### 2) 安装依赖

```bash
npm install
```

### 3) 启动开发（微信小程序）

```bash
npm run dev:mp-weixin
```

### 4) 构建

```bash
npm run build:mp-weixin
```

### 5) 微信开发者工具导入

- 导入目录：`dist/dev/mp-weixin`
- 在开发者工具中配置云开发环境

## 文档导航

- 执行总计划：`development-plan.md`
- 后续全周计划：`docs/all-weeks-detailed-plan.md`
- Week3 计划：`docs/week3-execution-plan.md`
- Week2 工作记录：`docs/week2-work-log.md`
- Week3 工作记录：`docs/week3-work-log.md`

## 社区与协作

- 贡献指南：`CONTRIBUTING.md`
- 安全策略：`SECURITY.md`
- 变更日志：`CHANGELOG.md`
- Issue 模板：`.github/ISSUE_TEMPLATE/`
- PR 模板：`.github/pull_request_template.md`

## 路线图

- [ ] Week3 收口：任务实时提示 + 快递链路一致性 + 聊天稳定性
- [ ] Week4：求购广场 + 到货提醒 + 订单系统
- [ ] Week5：校园动态 + 积分体系 + 举报流程
- [ ] Week6：校园维基 + 活动专题 + 个人中心增强
- [ ] Week7：性能优化 + 安全治理 + 信任体系
- [ ] Week8：全量测试 + 提审上线

## 常见问题

### tabbar 图标在微信开发者工具不显示？

项目已在 `vite.config.js` 增加静态资源复制插件，构建时会同步 `static/` 到 `dist/*/mp-weixin/static`。

### Sass deprecation warning 影响开发吗？

当前属于已知非阻塞告警，不影响主要开发与联调流程。

## License

本项目采用 `MIT` 许可证，详见 `LICENSE`。
