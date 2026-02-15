# Campus Student Exchanges App

校园二手交易与任务互助小程序（`uni-app + Vue 3 + 微信云开发`）。

![uni-app](https://img.shields.io/badge/uni--app-3.x-42b883)
![Vue3](https://img.shields.io/badge/Vue-3.4-4fc08d)
![Pinia](https://img.shields.io/badge/Pinia-2.x-f7c942)
![WeChat](https://img.shields.io/badge/WeChat-MiniProgram-07c160)
![Status](https://img.shields.io/badge/Status-Week3%20In%20Progress-2f6bff)

## Why This Project

这个项目面向校园真实场景，目标是把「二手交易 + 任务互助 + 即时沟通」做成一个顺滑、可信、可持续迭代的小程序：

- 发布快：商品与任务都支持低门槛发布
- 沟通快：会话与聊天打通业务上下文
- 可降级：云不可用时自动回退本地，开发演示不断链
- 可追踪：每周有计划、日志和 Review 记录

## Current Progress

| 周次 | 状态 | 说明 |
|---|---|---|
| Week1 | Done | 项目骨架、登录、首页、商品列表基础能力 |
| Week2 | Done (待最终验收) | 商品发布/详情/我的商品、筛选与 UI 收口 |
| Week3 | In Progress | 任务与聊天持续增强，当前进入稳定性收口 |
| Week4~Week8 | Planned | 求购、订单、动态、积分、维基、上线计划已落盘 |

## Core Features (Implemented)

### 商品模块
- 商品列表、详情、发布（极简/详细模式）
- 搜索筛选与状态管理
- 我的商品与收藏管理

### 任务模块
- 任务大厅、任务发布、任务详情、我的任务
- 快递代取专区入口与基础链路
- 任务状态流转与权限约束

### 聊天模块
- 会话列表与聊天详情
- 文字/图片消息 + 卡片消息（商品卡/任务卡）
- 消息状态（发送中/已发送/已读/失败）
- 实时 watch + 轮询兜底

### 工程能力
- 云优先 + 本地回退服务层设计
- 全局 `ui-*` 语义样式体系
- 静态资源复制插件（避免 tabbar 资源丢失）

## Tech Stack

| 类别 | 技术 |
|---|---|
| 前端 | `uni-app`、`Vue 3` |
| 状态管理 | `Pinia` |
| UI | `uview-plus`、`SCSS` |
| 构建 | `Vite`、`@dcloudio/vite-plugin-uni` |
| 后端能力 | 微信云开发（云函数/云数据库/云存储） |

## Architecture (Simplified)

```text
pages/*.vue  <->  utils/*-service.js  <->  微信云开发
   |                  |                     |
   |                  |                     +-- 云函数 / 云数据库
   |                  |
   |                  +-- 云不可用时回退本地 storage
   |
   +-- 统一 UI 语义类（App.vue / uni.scss）
```

## Project Structure

```text
.
├─ pages/              # 页面（商品/任务/聊天/个人中心等）
├─ components/         # 公共组件
├─ utils/              # 业务服务与工具（云优先 + 本地回退）
├─ store/              # Pinia 状态
├─ cloudfunctions/     # 云函数模板
├─ static/             # 静态资源
├─ docs/               # 周计划、工作日志、Review 记录
├─ pages.json
├─ manifest.json
└─ vite.config.js
```

## Quick Start

### 1) Install

```bash
npm install
```

### 2) Run (WeChat Mini Program)

```bash
npm run dev:mp-weixin
```

### 3) Build

```bash
npm run build:mp-weixin
```

### 4) Debug in WeChat DevTools

- 导入目录：`dist/dev/mp-weixin`
- 在微信开发者工具中配置云开发环境

## Key Configs

- 小程序与权限配置：`manifest.json`
- 页面与 tabbar 配置：`pages.json`
- 静态资源复制逻辑：`vite.config.js`

## Docs Index

- 总执行计划：`development-plan.md`
- 后续全周详细计划：`docs/all-weeks-detailed-plan.md`
- Week3 执行计划：`docs/week3-execution-plan.md`
- Week2 工作记录：`docs/week2-work-log.md`
- Week3 工作记录：`docs/week3-work-log.md`

## Development Rules

- 每轮开发后必须记录 Review（发现 + 修复 + 验证）
- 每日收尾至少执行一次 `npm run dev:mp-weixin`
- 所有新能力都要明确云优先与本地回退行为

## FAQ

### Q1: 微信开发者工具里 tabbar 图标不显示？

- 项目已在 `vite.config.js` 增加静态资源复制插件，确保 `static/` 同步到 `dist/*/mp-weixin/static`

### Q2: Sass deprecation warning 需要立刻处理吗？

- 当前属于已知非阻塞告警，不影响主要开发与联调流程

## Roadmap

- [ ] Week3 收口：任务实时提示、快递链路一致性、聊天体验稳定
- [ ] Week4：求购广场 + 到货提醒 + 订单系统
- [ ] Week5：校园动态 + 积分体系 + 举报流程
- [ ] Week6：校园维基 + 活动专题 + 个人中心增强
- [ ] Week7：性能优化 + 安全治理 + 信任体系
- [ ] Week8：全量测试 + 提审上线

## License

仓库暂未声明开源许可证。若计划公开开源，建议优先补充 `LICENSE`（推荐 `MIT` 或 `Apache-2.0`）。
