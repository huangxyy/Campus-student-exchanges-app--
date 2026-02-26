# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project follows [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- 新增风控审计调试页 `pages/admin/audit`，支持审计日志筛选、聚合统计与 JSON/CSV 导出（复制到剪贴板）。
- 新增统一应用错误模型 `utils/app-errors.js`，提供标准错误码与 `createAppError()`。
- 新增上线前验收清单 `docs/acceptance-checklist.md`，供测试/自查勾选。
- 到货提醒：`getArrivalAlerts()`、`markArrivalAlertRead()`、云集合 `arrival_alerts` 与本地回退；云函数 `matchAndNotifyWants`（商品上架后匹配求购并为订阅用户写入到货提醒）。

### Changed

- 交易/任务核心链路补强并发一致性：云端状态更新采用条件更新（状态+更新时间）并在冲突时回读判定。
- 增加关键业务审计埋点（下单、订单状态流转、接单、任务状态流转、举报）并提供查询能力。
- 增加统一风控限流策略（短间隔限流 + 时间窗爆发限流），覆盖下单、评论、举报、任务状态操作等高频写入场景。
- 页面错误提示统一收敛到 `showError()`，提升提示一致性与可维护性；积分页签到失败分支改为使用 `showError()`。
- Week 4：求购列表云端过滤过期（`validUntil`）；商品发布成功后触发 `fireMatchAndNotifyWants(productId)`；到货提醒页新增「匹配到你的新商品」列表与已读跳转。

### Added (Week 5–6 收口)

- 积分等级与进度条（getLevel / getLevelProgress）、积分兑换页（置顶/加急/头像框）、排行榜多维度 Tab（积分榜/交易达人/好评之星/热心帮手）。
- 维基详情页评论区（listComments / addComment）、投稿审核状态（getStatusText）。
- 个人中心积分等级展示（pointsLevel）。

### Added (Week 7 收口)

- 信任徽章规则与展示：`getTrustBadge()`，支持「诚信卖家 / 热心帮手 / 靠谱之星」在个人页、用户主页展示。
- 商品列表查询缓存：`queryProducts()` 增加 30s 本地缓存；商品发布、状态变更、删除后自动失效缓存。
- 商品列表与动态列表新增首屏骨架屏，优化弱网场景首屏感知体验。

### Planned

- Week8：全量测试 + 提审上线

### Week8 Progress

- 生产构建验证通过：`npm run build:mp-weixin`。
- 新增提审发布清单：`week8-release-checklist.md`（构建、回归、云环境、审核材料、发布收口）。

## [0.1.0] - 2026-02-15

### Added

- 初始化 uni-app 小程序工程与核心页面路由
- 商品模块基础能力：列表、详情、发布、我的商品、收藏
- 任务模块基础能力：大厅、发布、详情、我的任务、快递专区
- 聊天模块基础能力：会话列表、聊天详情、消息发送与状态展示
- 全局样式语义类与 UI 基线
- 周执行计划、工作日志、Review 记录体系

### Changed

- 小程序静态资源构建复制策略，修复 tabbar 图标在产物中缺失问题
- 多模块服务层统一为“云优先 + 本地回退”模式

### Fixed

- 若干任务状态流与聊天实时刷新一致性问题
- 位置权限拒绝等场景的交互提示与回退行为
