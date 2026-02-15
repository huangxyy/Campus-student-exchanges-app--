# Security Policy

感谢你帮助项目提升安全性。

## Supported Versions

| Version | Supported |
|---|---|
| `main` | Yes |
| `0.1.x` | Yes |
| `< 0.1.0` | No |

## Reporting a Vulnerability

请不要在公开 Issue 中披露安全漏洞细节。

推荐流程：

1. 使用 GitHub 的私密漏洞通道（`Security` -> `Report a vulnerability`）
2. 如果仓库未启用该功能，请联系仓库维护者并提供最小复现信息

建议报告内容：

- 漏洞类型与影响范围
- 复现步骤（PoC）
- 受影响文件/模块
- 可能的修复建议（可选）

## Response Timeline

- 48 小时内：确认收到并给出初步分级
- 7 天内：给出修复计划或临时缓解方案
- 修复发布后：在变更日志中标注安全修复（不泄露利用细节）

## Scope

优先关注以下高风险点：

- 输入校验与 XSS 注入
- 权限绕过（任务/订单/会话状态越权）
- 敏感信息泄露（密钥、隐私数据）
- 云函数与数据库访问控制

感谢你的负责任披露。
