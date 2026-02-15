# Campus Student Exchanges App

基于 uni-app (Vue 3) 的校园二手交易与互助小程序，覆盖商品交易、任务互助、聊天沟通、求购匹配、校园社区、积分体系等完整闭环。

## 当前进度

| 周次 | 主题 | 状态 |
|------|------|------|
| Week 1-2 | 基础架构 + 商品 MVP + UI 基线 | ✅ 完成 |
| Week 3 | 任务/聊天稳定化 + 快递链路 | ✅ 完成 |
| Week 4 | 求购广场 + 到货提醒 + 订单系统 | ✅ 完成 |
| Week 5 | 校园动态 + 积分体系 + 举报系统 | ✅ 完成 |
| Week 6 | 校园维基 + 活动专题 + 个人中心增强 | ✅ 完成 |
| Week 7 | 安全治理 + 信任体系 | ✅ 完成 |
| Week 8 | 入口整合 + 法律页面 + 提审准备 | ✅ 完成 |

## 功能模块

- **商品交易**：发布、浏览、搜索、收藏、AI 描述生成
- **任务互助**：任务大厅、快递专区、实时 watch + 轮询兜底
- **聊天沟通**：文字/图片/商品卡/任务卡消息、实时同步、左滑操作
- **求购广场**：需求发布、分类订阅、上架自动匹配
- **订单系统**：双确认状态机、评价、信用联动
- **校园动态**：图文发布、话题筛选、点赞评论、举报
- **积分体系**：每日签到、行为加分、积分明细、排行榜
- **校园维基**：文章投稿、分类浏览、审核状态
- **活动专题**：倒计时、三态标签（进行中/即将开始/已结束）
- **个人中心**：信誉分展示、设置页、他人主页、快捷入口
- **安全治理**：XSS 防护、敏感词过滤、URL 白名单
- **信任体系**：信用分计算、等级徽章、业务事件联动

## 页面总览（34 页）

```
pages/index/index          首页（11个快捷入口）
pages/products/*           商品列表/详情/发布
pages/tasks/*              任务大厅/详情/发布/我的任务/快递专区
pages/chat/*               会话列表/聊天详情
pages/want/*               求购列表/发布/到货提醒
pages/orders/detail        订单详情
pages/feeds/*              动态列表/发布/详情
pages/points/*             积分中心/排行榜
pages/wiki/*               维基首页/详情/投稿
pages/activity/index       活动专题
pages/profile/*            个人中心/我的商品/收藏/我的任务/我的求购/我的订单/设置/用户主页
pages/legal/*              隐私政策/用户协议
pages/login/login          登录
```

## 项目目录

- `pages/` — 34 个页面
- `components/` — 公共组件（product-card、empty-state 等）
- `utils/` — 服务层（product/task/chat/want/order/feed/points/report/wiki/trust/sanitize/error-handler）
- `store/` — Pinia 状态管理
- `cloudfunctions/` — 云函数模板
- `docs/` — 周工作日志、Review 记录、总计划

## 快速开始

```bash
npm install
npm run dev:mp-weixin
```

在微信开发者工具导入 `dist/dev/mp-weixin` 编译产物进行调试。

## 迭代文档

- 总计划：`docs/all-weeks-detailed-plan.md`
- Week 3：`docs/week3-work-log.md`
- Week 4：`docs/week4-work-log.md`
- Week 5-6：`docs/week5-6-work-log.md`
- Week 7：`docs/week7-work-log.md`
- Week 8：`docs/week8-work-log.md`
- 提审清单：`docs/week8-release-checklist.md`
- 测试报告：`docs/week8-test-report.md`

## 技术栈

- **框架**：uni-app + Vue 3
- **状态管理**：Pinia
- **样式**：SCSS + 自定义语义类
- **后端**：微信云开发（云数据库 + 云函数）
- **降级策略**：云优先 + 本地 Storage 回退
