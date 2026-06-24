# 🎯 PlanFlow AI — 设计文档

> **将非结构化信息自动转化为结构化任务体系**
>
> 版本: v1.0 | 更新日期: 2026-06-24

---

## 目录

1. [系统概述](#1-系统概述)
2. [整体架构](#2-整体架构)
3. [核心管线设计](#3-核心管线设计)
4. [模块设计](#4-模块设计)
5. [数据模型](#5-数据模型)
6. [API 设计](#6-api-设计)
7. [安全设计](#7-安全设计)
8. [关键设计决策](#8-关键设计决策)
9. [错误处理策略](#9-错误处理策略)

---

## 1. 系统概述

### 1.1 定位

PlanFlow AI 是一个**智能任务规划系统**，用户可以通过文本、图片（OCR）、PDF 或 DOCX 等任意形式输入信息，系统自动提取关键内容、分析任务要素，输出一套完整的结构化任务体系（含任务、检查清单、时间轴、提醒规则、风险提示）。

### 1.2 核心能力

| 能力 | 说明 |
|------|------|
| **多源输入** | 支持 Text / Image / PDF / DOCX 四种输入源 |
| **智能解析** | 调用 DeepSeek API 进行自然语言理解，提取任务、事件、约束等结构化信息 |
| **任务生成** | 根据 AI 解析结果自动创建任务、检查清单、时间轴事件和提醒规则 |
| **进度跟踪** | 提供任务列表、看板筛选、时间轴视图 |
| **智能提醒** | 支持站内通知 + Capacitor 本地通知（Android），到期自动推送 |
| **跨端覆盖** | Web 端 + Android APK（Capacitor 封装） |

---

## 2. 整体架构

### 2.1 系统分层

```
┌──────────────────────────────────────────────────────────┐
│                    用户界面层                             │
│  React + shadcn/ui     Capacitor (Android)               │
│  Zustand 状态管理        Axios HTTP 客户端               │
└───────────────────────┬──────────────────────────────────┘
                        │ HTTPS / JSON
┌───────────────────────▼──────────────────────────────────┐
│                    API 网关层                             │
│  Nginx (反向代理 + 静态文件)                               │
└───────────────────────┬──────────────────────────────────┘
                        │
┌───────────────────────▼──────────────────────────────────┐
│                   后端服务层  (Spring Boot)                │
│                                                          │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐ │
│  │ 认证模块  │  │ 输入模块  │  │ 任务模块  │  │ 提醒模块  │ │
│  ├──────────┤  ├──────────┤  ├──────────┤  ├──────────┤ │
│  │ 用户模块  │  │ 解析模块  │  │ 时间轴   │  │ 通知模块  │ │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘ │
│                                                          │
│  公共服务: 全局异常处理 · 统一响应 · JWT 鉴权 · 日志      │
└───────┬──────────────────────────────┬───────────────────┘
        │                              │
┌───────▼──────────┐     ┌─────────────▼──────────────────┐
│   OCR 服务       │     │    AI 服务                     │
│   (FastAPI +     │     │    (DeepSeek API)              │
│    PaddleOCR)    │     │    HTTPS 调用                   │
└──────────────────┘     └────────────────────────────────┘
        │
┌───────▼──────────────────────────────────────────────────┐
│                    数据层                                 │
│  MySQL 8.0 · MyBatis-Plus · 连接池 HikariCP               │
└──────────────────────────────────────────────────────────┘
```

### 2.2 组件职责

| 层 | 组件 | 职责 |
|----|------|------|
| **前端** | React + shadcn/ui | 用户交互界面，路由管理，状态管理 |
| | Capacitor | 将 Web 应用封装为 Android APK，提供本地通知能力 |
| **网关** | Nginx | 静态资源托管，API 反向代理，HTTPS 终止 |
| **后端** | Spring Boot | 业务逻辑处理，REST API 提供，异步 Job Worker |
| **OCR** | FastAPI + PaddleOCR | 图片文字识别，独立部署可水平扩展 |
| **AI** | DeepSeek API | 自然语言理解、信息结构化抽取 |
| **数据** | MySQL 8.0 | 持久化存储，通过 parse_job 表实现队列 |

### 2.3 关键交互流程

```
用户输入 ──→ 生成 SourceInput + ParseJob ──→ ParseJobWorker 轮询
    │                                               │
    │          ┌─── 文本 ──→ 直接使用原文             │
    │          │                                     │
    ├─── 图片 ──┤                                     │
    │          ├─── OCR ──→ 识别文本                   │
    │          │                                     │
    │          └─── PDF/DOCX ──→ 文档提取 ──→ 文本    │
    │                                               ▼
    └──────────────────────────────→ DeepSeek API 分析
                                           │
                                           ▼
                                    任务/检查清单/事件/提醒 生成
                                           │
                                           ▼
                                    站内通知推送 · Android 本地通知同步
```

---

## 3. 核心管线设计

### 3.1 Pipeline 阶段

解析任务（ParseJob）的完整生命周期包含以下阶段：

```
CREATED ──→ PENDING ──→ RUNNING ──→ COMPLETED
                            │
                            └──→ FAILED (可重试)
```

RUNNING 状态下的详细阶段演进：

| 阶段 | 进度 | 说明 |
|------|------|------|
| `PENDING` | 0% | 等待 Worker 调度 |
| `RUNNING` | 5% | Worker 开始处理 |
| `EXTRACTING` | 10-30% | 文本提取（OCR/PDF/直接使用） |
| `AI_ANALYZING` | 40-70% | 调用 DeepSeek API |
| `GENERATING_TASKS` | 80-95% | 任务、清单、事件、提醒入库 |
| `COMPLETED` | 100% | 结束，发送完成通知 |

### 3.2 队列机制

基于 **MySQL 表驱动队列**实现轻量级异步任务处理，无需引入 MQ 等外部中间件：

```
ParseJobWorker (@Scheduled fixedDelay=5000ms)
    │
    ├── SELECT * FROM parse_job
    │   WHERE status = 'PENDING'
    │   ORDER BY created_at ASC
    │   LIMIT batch_size
    │
    ├── 逐个处理，每条执行：
    │   1. UPDATE status = 'RUNNING'
    │   2. 执行管线各阶段
    │   3. UPDATE status = 'COMPLETED' | 'FAILED'
    │
    └── 失败处理：
        - 首次失败 → status = FAILED, retry_count++
        - 用户手动重试 → status = PENDING
        - 超过 max_retry (3次) → 禁止重试
```

**设计理由**：项目初期负载可预测，MySQL 表驱动足够满足需求；避免引入 Redis/RabbitMQ 等额外基础设施复杂度。

### 3.3 文本提取策略

根据 `source_input.source_type` 选择处理策略：

| 类型 | 策略 |
|------|------|
| `TEXT` | 直接使用 `original_text` 字段 |
| `IMAGE` | 调用 PaddleOCR 服务识别，回退：若 OCR 未启用或失败则报错 |
| `PDF` | PDFBox 库提取文本 |
| `DOCX` | Apache POI 库提取文本 |

---

## 4. 模块设计

### 4.1 后端模块划分

```
com.planflow/
│
├── auth/           # 认证模块：注册、登录、JWT 令牌管理
├── user/           # 用户模块：基本信息管理
├── input/          # 输入源模块：文本提交、文件上传、输入源管理
├── job/            # 解析任务模块：Job 状态管理、Worker 调度
├── extract/        # 文档文本提取：PDF、DOCX 解析
├── ocr/            # OCR 客户端：远程调用 PaddleOCR 服务
├── ai/             # AI 模块：Prompt 构建、AI 客户端、结果解析
├── task/           # 任务模块：任务 CRUD、AI 结果→任务生成
├── timeline/       # 时间轴模块：事件管理
├── reminder/       # 提醒模块：提醒规则管理、到期扫描
├── notification/   # 通知模块：站内通知生成与管理
├── setting/        # 用户设置模块
├── admin/          # 管理后台：数据统计、用户管理
├── dashboard/      # 首页数据聚合
├── config/         # 全局配置：PlanFlowProperties、文件存储等
├── common/         # 公共基础设施：ApiResponse、异常处理、安全工具
├── entity/         # 数据实体（MyBatis-Plus 映射）
└── mapper/         # 数据访问接口（MyBatis-Plus Mapper）
```

### 4.2 核心模块详述

#### 4.2.1 AI 模块 (`ai/`)

AI 模块采用**策略模式**设计，支持多模型切换：

```
┌───────────────────────────────────────────────────┐
│                  AiClient (接口)                    │
│  + analyze(rawText, sourceType): AiAnalysisResultDTO │
└───────────────────────────────────────────────────┘
        ▲                   ▲
        │                   │
┌───────┴────────────┐  ┌──┴──────────────────────┐
│   DeepSeekClient   │  │   QwenClient (预留)       │
│   调用 DeepSeek API│  │   调用通义千问 API         │
└────────────────────┘  └──────────────────────────┘
        │
        ▼
┌───────────────────────────────────────────────────┐
│                AiPromptBuilder                      │
│  + buildPrompt(text, type): String                 │
│  职责：组装包含当前时间、上下文、Schema 的 Prompt   │
└───────────────────────────────────────────────────┘
        │
        ▼
┌───────────────────────────────────────────────────┐
│                AiResultParser                      │
│  + parse(jsonString): AiAnalysisResultDTO          │
│  职责：提取 JSON、校验字段、标准化时间格式          │
└───────────────────────────────────────────────────┘
```

**Prompt 设计要点**：
- 包含当前时间和时区，用于相对时间推断（"下周五"、"三天后"）
- 输出限制为纯 JSON 格式（使用 `response_format: json_object`）
- 文本长度超过 8000 字符时自动截断
- temperature 设为 0.3 以保证输出稳定性

#### 4.2.2 任务生成模块 (`task/TaskGenerateService`)

接收 AI 解析结果 DTO，在一个事务内完成所有生成操作：

```
AiAnalysisResultDTO
    │
    ├── tasks[] ──────────→ task 表（每条任务一条记录）
    │       ├── checklist[] ──→ task_checklist_item 表
    │       └── suggestedReminders[] ──→ reminder_rule 表
    │
    ├── events[] ──────────→ timeline_event 表
    │
    └── 无 deadline 的任务：跳过自动提醒生成
        有 deadline 的任务：自动生成 3 个默认提醒
            - 截止前 1 天
            - 截止前 3 小时
            - 截止当天 08:00
```

#### 4.2.3 提醒与通知模块

采用**独立扫描** + **渠道分发**模式：

```
ReminderService (业务 CRUD)      ReminderScheduler (@Scheduled 60s)
    │                                   │
    │                                   ├── 查询到期 PENDING 提醒
    │                                   ├── 状态更新为 SENT
    │                                   └── 写入 notification 表
    │
    └── Android 同步 API
        ├── GET /reminders/pending-local  ── 拉取待注册本地提醒
        └── POST /reminders/local-sync     ── 上报本地通知注册结果
```

**通知类型**：

| 类型 | 触发时机 | 说明 |
|------|----------|------|
| `PARSE_COMPLETED` | 解析任务完成 | 来源输入解析成功 |
| `PARSE_FAILED` | 解析任务失败 | 来源输入解析失败 |
| `DEADLINE_SOON` | 提醒触发 | 任务即将到截止时间 |
| `TASK_OVERDUE` | 提醒触发时已过期 | 任务已超期 |
| `SYSTEM` | 手动/系统 | 系统通知 |

### 4.3 前端模块

#### 4.3.1 页面与路由

```
/login                 登录
/register              注册
/                       首页 Dashboard（快速输入、今日任务、待办概览）
/input                  输入源提交（文本 / 文件上传）
/jobs/:id               解析进度追踪
/tasks                  任务列表（筛选、排序、搜索）
/tasks/:id              任务详情（检查清单、提醒）
/timeline               时间轴视图
/notifications          通知中心
/settings               用户设置
/admin                  管理后台仪表盘
/admin/users            管理后台用户管理
```

#### 4.3.2 状态管理

采用 **Zustand** 轻量状态管理，核心 Store：

| Store | 职责 |
|-------|------|
| `authStore` | 登录态、JWT Token、用户信息 |
| `taskStore` | 任务列表、筛选条件、当前任务 |
| `notificationStore` | 通知列表、未读数 |

#### 4.3.3 平台服务封装

```
platformService.ts      平台检测（Web / Android Native）
localNotificationService.ts    Capacitor 本地通知封装
```

平台检测用于条件性启用 Android 本地通知功能，Web 端仅使用站内通知。

---

## 5. 数据模型

### 5.1 实体关系

```
user (1) ──── (N) source_input (1) ──── (1) parse_job
  │                                          │
  │  (1 ── N)                                 │
  │    ├── ai_analysis_result                 │
  │    ├── task ──── (N) task_checklist_item  │
  │    ├── timeline_event                     │
  │    ├── reminder_rule                      │
  │    ├── notification                       │
  │    ├── user_setting                       │
  │    └── device_sync_record                 │
```

### 5.2 核心表设计

| 表 | 主键关联 | 核心字段 | 用途 |
|----|----------|----------|------|
| **user** | — | username, password_hash, nickname, email, role, status | 用户认证与基本信息 |
| **source_input** | user_id | source_type, original_text, raw_text, file_path, status | 记录用户每次输入的原始内容 |
| **parse_job** | user_id, source_input_id | status, stage, progress, retry_count, error_message | 解析任务的生命周期跟踪 |
| **ai_analysis_result** | user_id, source_input_id | model_name, summary, parsed_json | AI 解析结果的持久化存档 |
| **task** | user_id, source_input_id | title, priority, status, deadline, estimated_minutes, constraints_json, source_evidence | AI 提取或用户手动创建的任务 |
| **task_checklist_item** | user_id, task_id | content, checked, sort_order | 每个任务下的检查清单 |
| **timeline_event** | user_id, task_id, source_input_id | title, event_type, start_time, end_time, location | 时间轴上的事件（截止、活动等） |
| **reminder_rule** | user_id, task_id | title, content, remind_at, channel, status, local_notification_id | 提醒规则（含 Android 本地通知 ID 记录） |
| **notification** | user_id, task_id, reminder_rule_id | title, content, type, read_status | 站内通知记录 |
| **user_setting** | user_id（唯一） | default_reminder_json, enable_in_app_notification, enable_local_notification | 用户偏好设置 |
| **device_sync_record** | user_id, device_id | last_sync_at, app_platform, app_version | 多设备同步记录 |

### 5.3 状态枚举

| 实体 | 状态字段 | 可选值 |
|------|----------|--------|
| source_input | status | CREATED, EXTRACTING, ANALYZING, COMPLETED, FAILED |
| parse_job | status | PENDING, RUNNING, COMPLETED, FAILED, CANCELLED |
| parse_job | stage | PENDING, EXTRACTING, AI_ANALYZING, GENERATING_TASKS, COMPLETED |
| task | status | TODO, DOING, DONE, CANCELLED |
| task | priority | LOW, MEDIUM, HIGH, URGENT |
| reminder_rule | status | PENDING, SENT, FAILED, CANCELLED |
| notification | read_status | UNREAD, READ |

### 5.4 关键设计细节

- **任务来源追溯**：每个 task 通过 `source_input_id` 关联到原始输入，`source_evidence` 字段记录 AI 提取的证据原文
- **提醒去重**：对于含 deadline 的任务，自动生成的默认提醒会检查 `remind_at` 是否在当前时间之后
- **级联删除**：task_checklist_item、reminder_rule 在 task 删除时级联删除（`ON DELETE CASCADE`）
- **硬删除 vs 软删除**：核心业务表不使用逻辑删除，确保数据可追溯

---

## 6. API 设计

### 6.1 设计准则

- **统一前缀**：所有 API 以 `/api/` 开头
- **统一响应**：`{ code, data, message }` 三层结构
- **认证方式**：Bearer JWT Token，通过 `Authorization` 头传递
- **分页格式**：统一使用 `page` + `size` 参数
- **数据隔离**：所有接口基于当前登录用户进行数据过滤

### 6.2 API 域划分

| 域 | 前缀 | 控制器 | 说明 |
|----|------|--------|------|
| **认证** | `/api/auth` | AuthController | 注册、登录、当前用户信息 |
| **输入源** | `/api/inputs` | SourceInputController | 文本输入、文件上传、输入源列表/详情 |
| **解析任务** | `/api/jobs` | ParseJobController | 任务状态查询、进度跟踪、重试 |
| **任务** | `/api/tasks` | TaskController | 任务 CRUD、状态流转、今日/即将/已过期 |
| **检查清单** | `/api/tasks/{taskId}/checklist` | —（复用 TaskController） | 检查项增删改 |
| **时间轴** | `/api/timeline` | TimelineController | 事件查询 |
| **提醒** | `/api/reminders` | ReminderController | 提醒 CRUD、Android 同步 |
| **通知** | `/api/notifications` | NotificationController | 通知列表、未读数、标记已读 |
| **设置** | `/api/settings` | SettingController | 用户偏好 |
| **管理后台** | `/api/admin` | AdminController | 统计数据、用户管理 |
| **首页** | `/api/dashboard` | DashboardController | 首页统计数据聚合 |

### 6.3 HTTP 方法语义

| 操作 | HTTP 方法 | 示例 |
|------|-----------|------|
| 查询列表 | GET | `/api/tasks?status=TODO&page=1` |
| 查询详情 | GET | `/api/tasks/{id}` |
| 创建 | POST | `/api/tasks` |
| 更新部分字段 | PATCH | `/api/tasks/{id}` |
| 状态变更 | PATCH | `/api/tasks/{id}/status` |
| 删除 | DELETE | `/api/tasks/{id}` |

### 6.4 响应码规范

| code | 含义 | 说明 |
|------|------|------|
| 200 | 成功 | 正常返回数据 |
| 400 | 参数错误 | 请求参数校验失败 |
| 401 | 未认证 | Token 缺失或过期 |
| 403 | 无权限 | 角色权限不足 |
| 404 | 资源不存在 | 查询的资源未找到 |
| 500 | 服务器错误 | 内部异常 |

---

## 7. 安全设计

### 7.1 认证流程

```
注册 ──→ BCrypt 加密密码 ──→ 存入 user 表
登录 ──→ 验证密码 ──→ 生成 JWT Token ──→ 返回前端
请求 ──→ Authorization: Bearer <token>
        ──→ JwtAuthenticationFilter 解析 Token
        ──→ 设置 SecurityContext
        ──→ Controller 通过 SecurityUtils 获取当前用户
```

### 7.2 JWT 设计

| 参数 | 值 |
|------|-----|
| 签名算法 | HS256 |
| Secret | 通过 `planflow.jwt.secret` 配置，生产环境使用强随机字符串 |
| 有效期 | 24 小时（86400000 ms） |
| Payload | 包含 username 和 role |

### 7.3 数据隔离

所有业务表的查询均通过 `SecurityUtils.getCurrentUserId()` 追加 `WHERE user_id = ?` 条件，确保用户间数据完全隔离。管理员可通过 `/api/admin` 域下的接口管理所有用户数据。

---

## 8. 关键设计决策

### 8.1 为什么选择 MySQL 表驱动队列而非 MQ？

| 方案 | 优势 | 劣势 |
|------|------|------|
| MySQL 表驱动 | 无额外依赖，部署简单，事务一致 | 不适合高吞吐、复杂路由 |
| Redis Stream / RabbitMQ | 高吞吐，成熟的消息机制 | 增加系统复杂度，部署成本 |

**决策**：项目初期负载低（个人/小团队使用），MySQL 表驱动队列配合 `@Scheduled` 轮询即可满足需求。Worker 在事务内更新 Job 状态，天然保证数据一致性。若未来需要更高吞吐量，可将 ParseJobWorker 替换为消息队列消费者。

### 8.2 为什么选择 PaddleOCR 独立部署而非嵌入式？

- PaddleOCR 依赖的 PaddlePaddle 框架体积大（~1GB），与 Spring Boot 应用解耦可独立扩缩容
- OCR 请求量大时可单独增加 OCR 服务实例
- 通过 `planflow.ocr.enabled` 配置可动态开关，无 OCR 需求时可完全跳过

### 8.3 为什么选择 DeepSeek API 而非本地模型？

- **成本**：个人项目无需承担本地 GPU 服务器成本
- **质量**：DeepSeek 的 JSON 结构化输出能力强，`response_format` 参数可强制输出合法 JSON
- **延迟**：API 响应通常在 2-5 秒内，对非实时场景可接受
- **替代方案**：AiClient 接口可切换为 Qwen 或其他兼容 API

### 8.4 为什么选择 Capacitor 而非 React Native / Flutter？

- 项目已有成熟的 React Web 前端，Capacitor 可直接复用
- 仅需 Android 端本地通知能力，无需修改 UI 层
- Capacitor 的 LocalNotifications 插件开箱即用

### 8.5 AI 解析失败时的降级策略

- AI 服务不可达 → Job 标记 FAILED，用户可点击重试
- AI 返回非合法 JSON → AiResultParser 抛出异常，标记失败
- 部分字段缺失（如 deadline 为 null）→ 仅生成有数据的字段，不阻塞整体流程
- 文本过长 → PromptBuilder 自动截断至 8000 字符

---

## 9. 错误处理策略

### 9.1 后端错误处理链

```
Controller
    ↓ 参数校验失败 → 400 BAD_REQUEST
Service
    ↓ 业务逻辑异常 → 400 / 404 （含具体错误信息）
Job Worker
    ↓ 管线阶段异常 → FAILED + error_message 记录
                      + notification 生成 + retry_count++
GlobalExceptionHandler
    ↓ 未捕获异常 → 500 INTERNAL_ERROR + 日志记录
```

### 9.2 前端错误处理链

```
Axios 拦截器
    ├── 401 → 清除 Token，跳转登录页
    └── 其他 → 全局错误提示（ErrorBoundary 兜底）

API 调用层
    └── 业务错误 → 组件级 Toast/提示

React ErrorBoundary
    └── 渲染异常 → 降级 UI + 刷新按钮
```

### 9.3 重试与幂等

- ParseJob 使用 `retry_count` 字段控制重试次数上限（3 次）
- Job 状态更新使用乐观写（`UPDATE ... WHERE status = 'PENDING'`），防止重复调度
- 文件上传使用 UUID 命名防止覆盖
