# 🏗️ PlanFlow AI 系统架构设计

> 版本：v1.0 | 更新日期：2026-06-23

---

## 1. 总体架构

PlanFlow AI 采用**四层架构**：客户端层 → API 服务层 → AI/OCR 能力层 → 数据存储层。各层职责清晰，通过 REST API 通信。

```
┌──────────────────────────────────────────────────────────────────┐
│                        客户端层 (Client Layer)                     │
│                                                                    │
│  ┌─────────────────────────────┐  ┌───────────────────────────┐  │
│  │         React Web           │  │    Capacitor Android APK  │  │
│  │                             │  │                            │  │
│  │  · Ant Design 组件库        │  │  · 复用 React 页面        │  │
│  │  · FullCalendar 时间轴       │  │  · Local Notifications    │  │
│  │  · PWA 可选增强              │  │  · Camera / File System   │  │
│  │  · 浏览器通知 (可选)         │  │  · 平台检测 isNative()    │  │
│  └──────────────┬──────────────┘  └─────────────┬─────────────┘  │
└─────────────────┼───────────────────────────────┼────────────────┘
                  │           HTTPS / REST         │
┌─────────────────┼───────────────────────────────┼────────────────┐
│                 ▼                               ▼                │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │                    API 服务层                              │  │
│  │                                                           │  │
│  │  ┌─────────┐ ┌──────────┐ ┌─────────┐ ┌──────────────┐   │  │
│  │  │ 认证模块 │ │ 输入源模块 │ │ 任务模块 │ │ 时间轴模块   │   │  │
│  │  ├─────────┤ ├──────────┤ ├─────────┤ ├──────────────┤   │  │
│  │  │ · 注册  │ │ · TEXT   │ │ · CRUD  │ │ · 时间线     │   │  │
│  │  │ · 登录  │ │ · IMAGE  │ │ · 状态  │ │ · 日历视图   │   │  │
│  │  │ · JWT   │ │ · PDF    │ │ · 筛选  │ │ · 事件聚合   │   │  │
│  │  └─────────┘ │ · DOCX   │ │ · 检查  │ └──────────────┘   │  │
│  │              └──────────┘ └─────────┘                     │  │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────────┐ ┌─────────┐  │  │
│  │  │ 提醒模块  │ │ 通知模块  │ │ 任务队列模块 │ │ 设置模块 │  │  │
│  │  ├──────────┤ ├──────────┤ ├──────────────┤ ├─────────┤  │  │
│  │  │ · 规则   │ │ · 站内   │ │ · ParseJob   │ │ · 偏好  │  │  │
│  │  │ · 调度   │ │ · 未读   │ │ · Worker     │ └─────────┘  │  │
│  │  │ · 本地同步│ │ · 已读   │ │ · 重试       │              │  │
│  │  └──────────┘ └──────────┘ └──────────────┘              │  │
│  └────────────────────────────┬───────────────────────────────┘  │
└───────────────────────────────┼──────────────────────────────────┘
                                │
┌───────────────────────────────┼──────────────────────────────────┐
│              AI / OCR 能力层   │                                  │
│                               ▼                                  │
│  ┌────────────────────────┐  ┌───────────────────────────────┐  │
│  │    PaddleOCR 服务       │  │     AI 模型服务                │  │
│  │                        │  │                               │  │
│  │  · FastAPI + uvicorn   │  │  · DeepSeek API               │  │
│  │  · 图片文字识别         │  │  · Qwen API                   │  │
│  │  · 返回文本 + 置信度    │  │  · 统一调用接口               │  │
│  └───────────┬────────────┘  └──────────────┬────────────────┘  │
└───────────────┼─────────────────────────────┼────────────────────┘
                │                             │
┌───────────────┼─────────────────────────────┼────────────────────┐
│               ▼                             ▼                    │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │                  数据存储层                                │  │
│  │                                                           │  │
│  │  ┌─────────────────┐  ┌──────────────────┐               │  │
│  │  │      MySQL       │  │  本地文件存储     │               │  │
│  │  │                 │  │                  │               │  │
│  │  │  · 用户数据      │  │  · uploads/      │               │  │
│  │  │  · 任务数据      │  │  · 图片           │               │  │
│  │  │  · 解析结果      │  │  · PDF           │               │  │
│  │  │  · 提醒规则      │  │  · DOCX          │               │  │
│  │  └─────────────────┘  └──────────────────┘               │  │
│  └────────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────┘
```

---

## 2. 核心数据流

### 2.1 文本输入解析流程

```
用户输入文本
    │
    ▼
前端 POST /api/inputs/text  { content: "..." }
    │
    ▼
后端 SourceInputService
    ├── 创建 source_input (status=CREATED)
    └── 创建 parse_job (status=PENDING)
    │
    ▼ (立即返回 inputId + jobId)
前端展示 jobId，开始轮询进度
    │
    ▼
ParseJobWorker (@Scheduled)
    ├── 扫描 PENDING job
    ├── status → RUNNING
    │
    ├── Call AiClient
    │   ├── 构建 Prompt (含当前时间、时区、原文)
    │   ├── 调用 DeepSeek / Qwen API
    │   └── 获取 JSON 响应
    │
    ├── Call AiResultParser
    │   ├── 提取并校验 JSON
    │   └── 转换为结构化 DTO
    │
    ├── Call TaskGenerateService
    │   ├── 创建 task 记录
    │   ├── 创建 checklist_item 记录
    │   ├── 创建 timeline_event 记录
    │   └── 创建 reminder_rule 记录
    │
    ├── 更新 parse_job → COMPLETED
    └── 创建 notification (PARSE_COMPLETED)
    │
    ▼
前端轮询到 COMPLETED
    ├── 跳转到任务详情页
    └── 展示时间轴
```

### 2.2 图片输入解析流程

```
用户上传图片
    │
    ▼
前端 POST /api/inputs/upload (multipart)
    │
    ▼
后端 SourceInputService
    ├── 保存文件到 uploads/
    ├── 创建 source_input (status=CREATED)
    └── 创建 parse_job (status=PENDING)
    │
    ▼
ParseJobWorker
    ├── 更新 stage=EXTRACTING_TEXT
    │
    ├── Call OcrClient
    │   ├── HTTP POST 到 PaddleOCR 服务
    │   └── 获取识别文本
    │
    ├── 保存 raw_text 到 source_input
    │
    ├── 更新 stage=AI_ANALYZING
    ├── Call AiClient (同上)
    ├── Call AiResultParser
    ├── Call TaskGenerateService
    │
    └── 更新 parse_job → COMPLETED
```

### 2.3 PDF/Word 输入解析流程

```
用户上传 PDF
    │
    ▼
后端 SourceInputService (同上)
    │
    ▼
ParseJobWorker
    ├── Call PdfExtractService / DocxExtractService
    │   ├── PDFBox / Apache POI 提取文本
    │   ├── 清洗文本（去空白、合并断行）
    │   └── 保存 raw_text
    │
    ├── Call AiClient (同上)
    ├── Call TaskGenerateService
    └── 更新 parse_job → COMPLETED
```

### 2.4 提醒通知触发流程

```
ReminderScheduler (@Scheduled，每分钟扫描)
    │
    ▼
查询 reminder_rule
    ├── status=PENDING
    └── remind_at <= 当前时间
    │
    ▼
创建 notification (type=DEADLINE_SOON)
    │
    ▼
更新 reminder_rule → status=SENT
    │
    ▼
Android 端：
    ├── App 启动 / 恢复前台
    ├── GET /api/reminders/pending-local
    ├── 调用 LocalNotifications.schedule()
    └── 上报 localNotificationId
```

---

## 3. 模块设计

### 3.1 模块依赖关系

```
Auth ──→ User
  │
  ├──→ SourceInput ──→ ParseJob ──→ Extract ──→ OcrClient
  │                                          └──→ AiClient
  │                                                    │
  │                                                    ▼
  │                                              AiResultParser
  │                                                    │
  │                                                    ▼
  │                                              TaskGenerateService
  │                                              ├──→ Task
  │                                              ├──→ TimelineEvent
  │                                              └──→ ReminderRule
  │                                                         │
  │                                                         ▼
  │                                                   ReminderScheduler
  │                                                         │
  │                                                         ▼
  │                                                   Notification
  │
  └──→ Setting
```

### 3.2 核心模块职责

| 模块 | 包名 | 核心职责 |
|------|------|----------|
| **Auth** | `auth` | 注册、登录、JWT 颁发与校验 |
| **User** | `user` | 用户信息管理 |
| **Input** | `input` | 接受多种类型输入，保存原始数据 |
| **Job** | `job` | 异步解析任务的生命周期管理 |
| **Extract** | `extract` | PDF/Word 文本提取与清洗 |
| **OCR** | `ocr` | 封装 PaddleOCR HTTP 调用 |
| **AI** | `ai` | Prompt 构建、模型调用、结果解析 |
| **Task** | `task` | 任务 CRUD、状态流转、检查清单 |
| **Timeline** | `timeline` | 时间轴事件聚合与查询 |
| **Reminder** | `reminder` | 提醒规则管理与定时触发 |
| **Notification** | `notification` | 站内通知的生成与管理 |
| **Setting** | `setting` | 用户偏好设置 |
| **Common** | `common` | 统一响应、异常处理、工具类 |

---

## 4. 提醒模块设计（插件化方案）

> 提醒模块采用 **插件化架构**，用户可以按需选择和配置提醒渠道。

### 4.1 架构

```
┌──────────────────────────────────────────────┐
│              ReminderService                  │
│  (核心：规则管理、调度、插件注册)               │
└──────┬────────┬────────┬──────────┬──────────┘
       │        │        │          │
       ▼        ▼        ▼          ▼
┌─────────┐ ┌─────────┐ ┌────────┐ ┌─────────┐
│ InApp   │ │ LocalApp│ │Browser │ │ Email    │
│ Plugin  │ │ Plugin  │ │Plugin  │ │ Plugin   │
├─────────┤ ├─────────┤ ├────────┤ ├─────────┤
│ · 站内  │ │ · 本地  │ │ · 通知 │ │ · 邮件  │
│   通知  │ │   通知  │ │   API  │ │   发送   │
└─────────┘ └─────────┘ └────────┘ └─────────┘
```

### 4.2 插件接口定义

```java
public interface ReminderChannelPlugin {
    String channelType();              // "IN_APP", "LOCAL_APP", "BROWSER", "EMAIL"
    boolean isEnabled(Long userId);    // 检查用户是否启用
    void send(ReminderRule rule);      // 执行提醒发送
    default int getOrder() { return 0; } // 优先级排序
}
```

### 4.3 插件注册机制

```java
@Component
public class ReminderPluginRegistry {
    private final List<ReminderChannelPlugin> plugins = new ArrayList<>();

    @Autowired
    public void registerPlugins(List<ReminderChannelPlugin> pluginList) {
        plugins.addAll(pluginList);
    }

    public List<ReminderChannelPlugin> getEnabledPlugins(Long userId) {
        return plugins.stream()
            .filter(p -> p.isEnabled(userId))
            .sorted(Comparator.comparingInt(ReminderChannelPlugin::getOrder))
            .collect(Collectors.toList());
    }
}
```

### 4.4 用户配置提醒渠道

用户可以在设置页中选择开启或关闭特定提醒渠道，系统根据配置动态调用对应插件。

### 4.5 扩展新渠道

只需实现 `ReminderChannelPlugin` 接口并注册为 Spring Bean，无需修改核心代码。

---

## 5. 异步任务队列设计

### 5.1 基于 MySQL + @Scheduled 的实现

```
┌──────────┐   scan PENDING   ┌──────────────┐
│  MySQL   │◄────────────────│  Scheduler   │
│ parse_job│                  │  (5秒间隔)   │
│  table   │────────────────►│              │
└──────────┘  update status   │  Worker      │
                              │  (单线程池)   │
                              └──────┬───────┘
                                      │
                   ┌──────────────────┼──────────────────┐
                   ▼                  ▼                  ▼
             ┌──────────┐     ┌──────────┐     ┌──────────┐
             │ 文本解析  │     │ OCR解析   │     │ PDF解析  │
             └──────────┘     └──────────┘     └──────────┘
```

### 5.2 状态机

```
PENDING ──► RUNNING ──► COMPLETED
               │
               ▼
            FAILED ──► (重试) ──► RUNNING
               │
               ▼
          CANCELLED
```

### 5.3 可升级路径

| 当前方案 | 升级方案 | 迁移收益 |
|----------|----------|----------|
| MySQL job 表 | Redis Stream | 更高吞吐、更少 DB 压力 |
| @Scheduled | RabbitMQ | 可靠投递、延迟队列 |
| 单线程 Worker | 线程池 + 分片 | 并行处理 |

---

## 6. 安全设计

```
┌─────────────────────────────────────────────┐
│                安全架构                       │
├─────────────────────────────────────────────┤
│ 1. 传输安全                                  │
│    · HTTPS 传输（生产环境）                   │
│    · API 统一前缀 /api                       │
│                                             │
│ 2. 认证与授权                                │
│    · Spring Security + JWT                  │
│    · 密码 BCrypt 加密存储                     │
│    · 用户数据隔离（user_id 绑定）              │
│                                             │
│ 3. 输入安全                                  │
│    · 文件类型校验（白名单）                    │
│    · 文件大小限制（20MB）                     │
│    · 路径穿越防护                             │
│                                             │
│ 4. API 安全                                  │
│    · JWT 过期机制                             │
│    · 敏感接口需鉴权                           │
│    · AI API Key 仅存服务端环境变量            │
└─────────────────────────────────────────────┘
```

---

## 7. 部署架构

### 7.1 开发环境

```
┌─────────┐     ┌──────────┐     ┌──────────┐
│ React   │────►│ Spring   │────►│ MySQL    │
│ Vite Dev│     │ Boot Dev │     │ Local    │
└─────────┘     └────┬─────┘     └──────────┘
                     │
                     ▼
              ┌──────────────┐
              │ PaddleOCR    │
              │ FastAPI      │
              └──────────────┘
```

### 7.2 生产环境

```
┌──────────┐     ┌──────────────┐     ┌──────────┐
│ Nginx    │────►│ Spring Boot  │────►│ MySQL    │
│ (Static) │     │ (JAR)        │     └──────────┘
│ React    │     └──────┬───────┘
└──────────┘            │
                        ▼
                 ┌──────────────┐
                 │ PaddleOCR    │
                 │ (Docker)     │
                 └──────────────┘
```

---

## 8. 技术决策记录

| 决策 | 方案 | 理由 |
|------|------|------|
| **前端框架** | React + Vite | 课程主流、社区活跃、Capacitor 支持好 |
| **UI 库** | Ant Design | 组件丰富、文档完善、适合中后台系统 |
| **状态管理** | Zustand | 轻量、无模板代码、TypeScript 友好 |
| **后端框架** | Spring Boot | 课程主流、生态成熟 |
| **ORM** | MyBatis Plus | 灵活性高于 JPA，复杂查询可控 |
| **数据库** | MySQL | 关系型数据、ACID 保证、广泛使用 |
| **鉴权** | JWT | 无状态、跨平台友好 |
| **OCR** | PaddleOCR | 开源、准确度高、支持中文 |
| **AI 模型** | DeepSeek / Qwen | 国产模型、API 成本低、效果稳定 |
| **异步任务** | MySQL + @Scheduled | 无需额外中间件，课程项目够用 |
| **移动端** | Capacitor | 复用 React 代码，避免开发两套 |
| **本地通知** | Capacitor Local Notifications | 与 Capacitor 原生集成 |

---

## 9. 模块化/插件化扩展点

| 扩展点 | 接口/抽象 | 现有实现 | 扩展方式 |
|--------|-----------|----------|----------|
| **提醒渠道** | `ReminderChannelPlugin` | IN_APP, LOCAL_APP | 实现接口 + @Component |
| **AI 模型** | `AiClient` | DeepSeekClient, QwenClient | 实现接口 + 配置切换 |
| **文档解析** | `DocumentExtractor` | PdfExtractor, DocxExtractor | 实现接口 + 注册 |
| **任务队列** | `JobQueue` | MysqlJobQueue | 实现接口 + 配置切换 |

---

> *架构设计应遵循 YAGNI 原则，第一版仅实现 MVP 所需，后续按需扩展。*
