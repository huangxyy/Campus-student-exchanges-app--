# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project follows [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Planned

- Week3 收口：任务实时提示、快递链路一致性、聊天稳定性
- Week4：求购广场 + 到货提醒 + 订单系统
- Week5：校园动态 + 积分体系 + 举报流程
- Week6：校园维基 + 活动专题 + 个人中心增强
- Week7：性能优化 + 安全治理 + 信任体系
- Week8：全量测试 + 提审上线

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
