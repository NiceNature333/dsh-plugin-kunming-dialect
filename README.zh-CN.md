# 昆明方言文本后处理插件

[English](README.md)

实验性的独立 DeepSeek Harness Bundle：将已完成的普通话回复，通过本地词典检索及 DeepSeek Flash 二次生成，改写为昆明口语。

**仓库不提供词典 PDF、OCR 文本、原书释义、例句或数字化词典数据库。MIT 仅适用于本项目原创代码和文档。** 详见 [版权声明](NOTICE.md)。

## 工作流与架构

普通话草稿 → 模型调用 `kunming_rewrite` → 本地 SQLite 批量反向检索及轻量排序 → Flash 改写 → 输出校验 → Agent 最终回复 → 原有 QQ 发送器。

插件独立注册工具和提示规则，可以与官方 QQ Bot、长期记忆插件并列运行，不替换原有消息路由或记忆存储。

## 实际完成程度

已在私有开发环境验证词典检索、真实 Harness / Flash 调用、Agent 工具链及 QQ 发送模块模拟。公开自动测试仅使用原创虚构数据和模拟云响应，不依赖第三方词典。真实群聊/私聊的全面验收及昆明母语者审校尚待完成。

工具依赖 Agent 主动调用。提示规则不能保证每轮调用，也无法强制拦截所有提前输出。OCR 解析仍是启发式方案，词义、例句归属、中文专名及整体语义需要人工检查，不宣称所有生成结果均自然地道。

## 环境与依赖

Node.js >=22.13，推荐 Node 24；Python 3.11+；PDF 导入依赖见 requirements.txt。Node 运行时仅使用标准模块，Python SQLite 使用标准库。需要可用的 Harness 模型服务或 OpenAI 兼容接口，以及具有合法使用权限的本地词典；无需本地 GPU 或向量数据库。

## 安装与启用

克隆仓库，在目录中执行：

```powershell
python -m venv .venv
.venv\Scripts\python -m pip install -r requirements.txt
```

通过 Harness 插件管理器安装本目录的本地包，启用该 Profile 的 Bundle。桌面版自带 dsh.cmd，可能不在 PATH 中。修改前备份 Profile，合并现有配置行：

```yaml
- id: kunming-dialect
  config:
    dbPath: /absolute/path/to/local/kunming.sqlite
    transport: harness
    provider: deepseek-account
    model: deepseek-flash
    intensity: heavy
    includeUnreviewed: false
```

数据库路径可指向仓库外，不依赖随包提供的版权数据。请保留现有 QQ 凭据和人格配置。详见 [安装说明](docs/INSTALLATION.md)。

## 本地导入与建库

原始资料放在已忽略的 source/ 或仓库之外；程序不会移动、删除原始 PDF。环境变量 KUNMING_SOURCE_PDF 可选择 PDF。先检查版面，再按实际情况指定正文页范围、印刷页偏移及上下边距：

```powershell
.venv\Scripts\python scripts/inspect_pdf.py
.venv\Scripts\python scripts/parse_entries.py --start-page 1 --header 195 --footer 75
.venv\Scripts\python scripts/build_database.py
.venv\Scripts\python scripts/validate_database.py
```

原始页、候选、报告和数据库均保留在被忽略的 data/、tmp/ 中。可在建库前执行 `scripts/build_seed.py --input <你有权使用的JSON>` 导入本地审核种子；仓库不附带种子。默认仅使用 verified 条目；includeUnreviewed=true 可让全部候选参与检索，但不会伪造人工核验状态。见 [OCR 流程](docs/OCR_PIPELINE.md)。

## API 配置与隐私

harness 模式复用宿主认证，不复制凭据。openai 模式配置 apiBase、apiKeyEnv、model，并在启动环境中设置对应 Key；模型名称以服务实际支持为准。.env.example 仅为模板，插件不自动加载 .env。

默认每次请求超时 30 秒、重试一次、输出上限 2048 token、检索 10 条（最多 12）、草稿上限 6000 字符、上下文上限 500 字符。超长草稿和多数运行故障返回原草稿。context 只应包含当前回复必需的信息，不传完整群历史。生产日志不保存消息正文；显式评估会产生本地私有报告。

## 与 QQ Bot 并列运行

保留官方 QQ Bot。根据其实际版本和本地定制，确认会话工具允许列表包含 kunming_rewrite。Windows scripts/install_profile.py 只读检查现状；QQ 0.5.3 可用 groupExtraTools 授权三个方言工具，scripts/qq_compat.py 提供带版本、Hash、备份和恢复检查的迁移。将 QQ 的 showToolResults 设为 false、streaming 设为 false，可避免成功工具结果另行展示和流式草稿泄露，但不能保证没有独立的提前消息。

V0.2 新增 kunming_lookup、受控 kunming_feedback、独立反馈 Overlay 和改写采用统计。多群共享实例在可信会话范围未接通前禁用反馈保存；长期记忆的项目隔离不能视作群隔离。见 [安装说明](docs/INSTALLATION.md)。

## 测试与开发

```powershell
npm test
python scripts/audit_public.py
```

公开测试使用临时 SQLite 和原创虚构样例；没有安装 QQ 时，针对已安装 QQ 的可选测试会跳过。npm run evaluate 为可选 Windows/Harness 真实模型评估，会使用账号额度及本地词库，结果不得自动上传。

每次提交、Push、npm 发布或建立 Release 前都检查暂存区、历史和发布附件，遵守 [发布约定](docs/PUBLISHING.md)。

## 已知问题与路线

继续完善跨栏跨页解析、义项拆分、OCR 复核；进行昆明母语者审校和真实 QQ 群/私聊验收；探索宿主或发送器支持的强制缓冲改写接口；未来社区原创词库使用独立、明确的数据许可证和来源记录。

## 第三方版权声明

开发背景涉及本地《昆明方言词典》（张华文、毛玉玲，云南人民出版社，2014）。本项目不附带该出版物及其数字化数据库，未获得作者或出版社的官方背书或授权。用户须自行取得所用资料及其云端处理所需权限。MIT 代码许可证不授予第三方数据的使用或再分发权。
