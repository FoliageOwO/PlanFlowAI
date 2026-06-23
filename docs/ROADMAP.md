# 🗺️ PlanFlow AI 开发排期

> 版本：v1.0 | 总工期：7 天  

---

## 阶段总览

| 阶段 | 名称 | 天数 | 状态 |
|------|------|------|------|
| **P1** | 基础工程搭建 | 1 天 | ⏳ 待开始 |
| **P2** | 输入源与文件上传 | 1 天 | ⏳ 待开始 |
| **P3** | OCR 与文档解析 | 1 天 | ⏳ 待开始 |
| **P4** | AI 解析与结构化落库 | 1 天 | ⏳ 待开始 |
| **P5** | 前端核心页面 | 1 天 | ⏳ 待开始 |
| **P6** | 通知能力 | 1 天 | ⏳ 待开始 |
| **P7** | 完善与答辩准备 | 1 天 | ⏳ 待开始 |

---

## P1 — 基础工程搭建（第 1 天）

**目标**：打通前后端链路，能注册登录，APK 可运行

### 后端

- [ ] 初始化 Spring Boot 项目（Java 17 + Maven）
- [ ] 配置 MyBatis Plus + MySQL 连接
- [ ] 创建 `user` 表，实现 User 实体 + Mapper
- [ ] 实现注册接口 `POST /api/auth/register`（BCrypt 加密）
- [ ] 实现登录接口 `POST /api/auth/login`（JWT 生成）
- [ ] 实现 `GET /api/auth/me` 当前用户查询
- [ ] 配置 Spring Security + JWT 鉴权过滤器
- [ ] 添加全局异常处理 + 统一响应格式 `ApiResponse`
- [ ] 配置 CORS 跨域（开发环境）

### 前端

- [ ] 初始化 React + TypeScript + Vite 项目
- [ ] 安装 Ant Design、Axios、Zustand、React Router
- [ ] 实现登录页 UI（表单 + 校验）
- [ ] 实现注册页 UI
- [ ] 封装 Axios 实例（baseURL + JWT 拦截器 + 401 处理）
- [ ] 实现 `authStore`（Zustand：保存 token/user）
- [ ] 实现路由守卫（未登录跳转登录页）
- [ ] 实现首页骨架（Layout：顶栏 + 侧栏/底部导航）

### Android

- [ ] 安装 @capacitor/core @capacitor/android
- [ ] 配置 capacitor.config.ts
- [ ] `npx cap add android` 初始化 Android 项目
- [ ] 验证 APK 能运行并显示 React 页面

### 产出物

```
✅ Web 能登录 / 注册
✅ 后端 JWT 鉴权可用
✅ APK 能运行 React 页面
```

---

## P2 — 输入源与文件上传（第 2 天）

**目标**：支持文本输入和文件上传，创建解析任务

### 后端

- [ ] 创建 `source_input` 表 + 实体 + Mapper
- [ ] 创建 `parse_job` 表 + 实体 + Mapper
- [ ] 实现 `POST /api/inputs/text` 文本输入接口
- [ ] 实现 `POST /api/inputs/upload` 文件上传接口（MultipartFile）
- [ ] 实现文件类型校验（jpg/png/webp/pdf/docx）
- [ ] 实现文件大小限制（20MB）
- [ ] 保存文件到 `uploads/{userId}/{inputId}/` 目录
- [ ] 实现 `GET /api/inputs` 输入源列表（分页）
- [ ] 实现 `GET /api/inputs/{id}` 输入源详情

### 前端

- [ ] 实现 InputPage：文本输入框 + 提交按钮
- [ ] 实现 UploadPanel：文件选择 + 上传按钮 + 进度提示
- [ ] 提交后跳转解析进度页（携带 jobId）

### 产出物

```
✅ 用户提交文本后生成 source_input + parse_job
✅ 用户上传文件后保存到磁盘 + 生成 job
✅ 文件类型/大小校验生效
```

---

## P3 — OCR 与文档解析（第 3 天）

**目标**：图片能 OCR 识别文字，PDF/Word 能提取文本

### OCR 服务

- [ ] 搭建 FastAPI 项目（uvicorn）
- [ ] 集成 PaddleOCR（支持中文）
- [ ] 实现 `POST /ocr/image` 接口（接收图片，返回文字 + 置信度）
- [ ] 实现 `GET /health` 健康检查
- [ ] 编写 requirements.txt

### 后端

- [ ] 实现 `OcrClient`（RestTemplate 调用 OCR 服务）
- [ ] 实现 `PdfExtractService`（PDFBox 提取文本）
- [ ] 实现 `DocxExtractService`（Apache POI 提取文本）
- [ ] 实现 `TextExtractService`（统一入口+文本清洗）
- [ ] 清洗规则：去多余空白、合并断行、限制 8000 字符

### 前端

- [ ] 实现 ParseProgressPage：轮询 `GET /api/jobs/{id}`
- [ ] 展示阶段名称和进度条
- [ ] 成功后展示"查看生成结果"按钮
- [ ] 失败后展示错误信息和"重试"按钮

### 产出物

```
✅ 上传图片 → OCR 识别 → 返回文字
✅ 上传 PDF → PDFBox 提取 → 返回文字
✅ 前端实时展示解析进度
```

---

## P4 — AI 解析与结构化落库（第 4 天）

**目标**：用 AI 模型解析文本，自动生成任务、检查清单、时间轴事件、提醒规则

### 后端

- [ ] 实现 `AiPromptBuilder`（注入当前时间、时区、原文）
- [ ] 实现 `DeepSeekClient`（HTTP 调用 DeepSeek API）
- [ ] 实现 `AiResultParser`（JSON 提取、校验、标准化时间）
- [ ] 创建 `ai_analysis_result` 表，保存解析记录
- [ ] 实现 `TaskGenerateService`
  - [ ] 从 AI JSON 生成 `task` 记录
  - [ ] 从 AI JSON 生成 `task_checklist_item` 记录
  - [ ] 从 AI JSON 生成 `timeline_event` 记录
  - [ ] 从 AI JSON 生成 `reminder_rule` 记录
- [ ] 实现 `ParseJobWorker`（@Scheduled，扫描 PENDING → COMPLETED）
- [ ] JSON 解析失败时自动重试一次
- [ ] 创建 `device_sync_record` 表

### 前端

- [ ] 对接 AI 解析结果展示

### 产出物

```
✅ 一段公告文本 → AI 解析 → 生成完整任务体系
✅ JSON 解析失败自动重试
✅ 结构化数据落库（task / checklist / timeline / reminder）
```

---

## P5 — 前端核心页面（第 5 天）

**目标**：用户能完整管理任务、查看时间轴、操作检查清单

### 任务模块

- [ ] 实现 TaskListPage：状态/优先级/日期筛选
- [ ] 实现 TaskCard 组件（标题、截止时间、优先级、状态标签）
- [ ] 实现 TaskDetailPage：完整信息展示
- [ ] 实现状态修改（TODO → DOING → DONE）
- [ ] 实现手动创建任务
- [ ] 实现编辑任务
- [ ] 实现删除任务
- [ ] 实现 ChecklistPanel：新增、勾选、删除检查项

### 时间轴模块

- [ ] 实现 TimelinePage：按天分组展示
- [ ] 实现今天/明天/本周/更晚 分组
- [ ] 不同事件类型不同图标
- [ ] 点击事件跳转任务详情

### Dashboard

- [ ] 今日待办卡片
- [ ] 即将截止列表
- [ ] 已过期列表
- [ ] 快速输入框
- [ ] 文件上传入口
- [ ] 未读通知角标

### 设置页

- [ ] 修改昵称
- [ ] 提醒偏好设置
- [ ] 通知开关
- [ ] 退出登录

### 产出物

```
✅ 任务列表、详情、状态流转
✅ 检查清单完整操作
✅ 时间轴分组展示
✅ Dashboard 概览
✅ 设置页
```

---

## P6 — 通知能力（第 6 天）

**目标**：站内通知定时触发，Android 本地通知可用

### 后端

- [ ] 实现 `ReminderScheduler`（@Scheduled，每分钟扫描到期提醒）
- [ ] 实现 `InAppReminderPlugin`（创建 notification 记录）
- [ ] 创建 `notification` 表
- [ ] 实现 `NotificationService`（CRUD + 未读计数）
- [ ] 实现通知相关 API
- [ ] 实现 `GET /api/reminders/pending-local`（Android 拉取）
- [ ] 实现 `POST /api/reminders/local-sync`（上报注册结果）

### 前端

- [ ] 实现 NotificationPage：通知列表
- [ ] 实现未读数量角标
- [ ] 标记已读 / 全部已读
- [ ] 点击通知跳转任务详情

### Android

- [ ] 安装 @capacitor/local-notifications
- [ ] 实现 `localNotificationService.ts`
  - [ ] `requestPermission()`
  - [ ] `scheduleReminder()`
  - [ ] `cancelReminder()`
  - [ ] `syncReminders()`
- [ ] App 启动时同步提醒规则
- [ ] App 恢复前台时同步
- [ ] 任务完成时取消关联本地通知

### 产出物

```
✅ 站内通知到期触发
✅ Android 本地通知弹窗
✅ 通知同步、取消
```

---

## P7 — 完善与答辩准备（第 7 天）

**目标**：代码完善、演示数据、文档、部署

### 完善

- [ ] 全局错误处理优化（前端友好提示）
- [ ] 空状态展示（无任务、无通知）
- [ ] 加载状态展示（Skeleton）
- [ ] 输入校验加强（空文本禁止提交）
- [ ] 页面自适应/移动端适配

### 演示数据

- [ ] 3 组自然语言演示数据
- [ ] 1 张通知截图（OCR 演示）
- [ ] 1 个 PDF 示例文件
- [ ] 1 个测试账号（含多个来源的任务）
- [ ] 1 条即将触发的提醒规则

### 文档

- [ ] 更新 README.md
- [ ] 更新 ROADMAP.md 完成状态
- [ ] 编写答辩 PPT 提纲
- [ ] 准备演示脚本（5 个场景）

### 部署

- [ ] Nginx 配置（静态文件 + API 反向代理）
- [ ] 配置 HTTPS（Let's Encrypt）
- [ ] docker-compose.yml 完整验证
- [ ] 部署到公网服务器
- [ ] 构建 APK 并分发

### 产出物

```
✅ 可演示完整闭环（5 个场景）
✅ 部署到公网可访问
✅ Android APK 可用
✅ 文档齐全可提交
```

---

## 进度跟踪

| 日期 | 计划任务 | 实际完成 | 备注 |
|------|----------|----------|------|
| D1 | P1 基础工程搭建（前后端同步推进） | - | - |
| D2 | P2 输入源 + 文件上传 | - | - |
| D3 | P3 OCR 服务 + 文档解析 | - | - |
| D4 | P4 AI 接入 + Prompt + 任务生成 | - | - |
| D5 | P5 前端核心页面 | - | - |
| D6 | P6 通知 + Android 本地通知 | - | - |
| D7 | P7 完善 + 部署 + 答辩准备 | - | - |

---

## 延期风险与应对

| 风险 | 影响 | 应对 |
|------|------|------|
| AI API 调用不稳定 | P4 延期 | 提前备好 API Key + 余额，准备 fallback 提示 |
| PaddleOCR 环境问题 | P3 延期 | 先用 Docker 镜像，GPU 非必需 |
| Capacitor 兼容性问题 | P1/P6 延期 | Web 端优先保证，APK 可降级为纯 Web 包装 |
| 范围膨胀 | 整体延期 | 严格按 MVP 清单，增强功能全部标记 optional |
