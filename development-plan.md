# 校园跳蚤市场开发执行计划

## 目标

基于 `campus-market-app-plan.md`，按周拆解并落地代码，优先实现可运行的 MVP，再逐周补齐功能。

## 开发规范

1. 每次开发变更后必须执行至少 1 次代码 Review。
2. Week 1 验收前累计完成不少于 14 次 Review（当前已完成 21 次，详见 `docs/week1-review-log.md`、`docs/week1-review-log-round2.md`、`docs/week1-review-log-round3.md`、`docs/week1-review-log-round4.md`、`docs/week1-review-log-round5.md`、`docs/week1-review-log-round6.md`、`docs/week1-review-log-round7.md`、`docs/week1-review-log-round8.md`、`docs/week1-review-log-round9.md`、`docs/week1-review-log-round10.md`、`docs/week1-review-log-round11.md`）。
3. Review 记录必须落盘，包含“发现 + 修复 + 验证结果”。

## 里程碑拆解

- [ ] 阶段 1（Week 1）：项目骨架 + 登录页 + 首页 + 商品列表（基础查询）（待云联调验收）
- [ ] 阶段 2（Week 2）：商品发布、商品详情、我的商品、搜索筛选完善（收口完成，待验收，见 `docs/week2-work-log.md`）
- [ ] 阶段 3（Week 3）：任务大厅、任务发布、会话列表、聊天详情（进行中，进入收口）
- [ ] 阶段 4（Week 4）：求购广场 + 到货提醒 + 订单系统（双确认 + 评价）
- [ ] 阶段 5（Week 5）：校园动态广场 + 积分体系 + 举报流程
- [ ] 阶段 6（Week 6）：校园维基 + 活动专题 + 个人中心增强
- [ ] 阶段 7（Week 7）：性能优化 + 安全治理 + 信任体系完善
- [ ] 阶段 8（Week 8）：全量测试 + 提审上线 + 发布收口

## 本轮完成内容（阶段 1 + 阶段 2 部分）

1. 初始化 uni-app 目录结构与核心配置（`pages.json`、`manifest.json`、`main.js`）
2. 实现登录流程（前端 + 本地 auth 存储 mock）
3. 实现首页与商品流（列表、分类、排序、分页）
4. 提供商品详情与发布页（含 AI 生成 mock 按钮）
5. 打通本地发布流程：发布商品后可在“我的商品”查看，并进入详情
6. 提供任务页、消息页、个人页基础框架
7. 增加云函数优先登录、商品发布云写入（失败回退本地）
8. 增加我的商品状态管理（在售/已售/下架/删除）
9. 增加“联系卖家 -> 聊天详情”沟通链路
10. 增加任务发布页与任务接单状态流转
11. 增加我的收藏页与收藏状态持久化
12. 增加我的任务页（历史记录 + 筛选 + 排序）
13. 启动 Week 1 验收清单并输出自动验收报告

## Week 1 待完成项

1. 在微信开发者工具中完成云环境联调验收（`docs/week1-cloud-checklist.md`）
2. 在微信开发者工具验证云数据库写入链路（代码已完成）
3. 完成 Week 1 人工验收勾选并确认里程碑达成（CLI 报告见 `docs/week1-acceptance-report.md`）

## Week 2 工作记录

1. 进度总览：`docs/week2-work-log.md`
2. UI 美化专项：`docs/week2-ui-beautification-work.md`
3. 代码 Review：`docs/week2-review-log-round1.md`、`docs/week2-review-log-round2.md`、`docs/week2-review-log-round3.md`、`docs/week2-review-log-round4.md`、`docs/week2-review-log-round5.md`、`docs/week2-review-log-round6.md`

## Week 3 工作记录

0. 执行总计划：`docs/week3-execution-plan.md`
1. 进度总览：`docs/week3-work-log.md`
2. 代码 Review：`docs/week3-review-log-round1.md`、`docs/week3-review-log-round2.md`、`docs/week3-review-log-round3.md`、`docs/week3-review-log-round4.md`、`docs/week3-review-log-round5.md`、`docs/week3-review-log-round6.md`、`docs/week3-review-log-round7.md`、`docs/week3-review-log-round8.md`、`docs/week3-review-log-round9.md`

## 后续全周详细计划

1. 总计划（Week3 收口 + Week4~Week8）：`docs/all-weeks-detailed-plan.md`

## 下一阶段默认推进顺序

1. 完成商品发布真实上传流程（本地选择 + 云存储）
2. 完成商品详情到联系卖家的闭环
3. 完善“我的商品”状态管理（在售/已售/下架）
4. 进入任务模块与聊天模块
