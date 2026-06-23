# 🎯 PlanFlow AI 项目详细设计

> 版本：v1.0 | 更新日期：2026-06-23  
> 涵盖：数据库设计 · API 设计 · 前端设计 · 后端设计 · OCR 服务 · AI Prompt · 开发里程碑

---

## 目录

1. [数据库设计](#1-数据库设计)
2. [REST API 文档](#2-rest-api-文档)
3. [前端详细设计](#3-前端详细设计)
4. [后端详细设计](#4-后端详细设计)
5. [OCR 服务设计](#5-ocr-服务设计)
6. [AI Prompt 设计](#6-ai-prompt-设计)
7. [Capacitor 本地通知方案](#7-capacitor-本地通知方案)
8. [异步任务队列方案](#8-异步任务队列方案)
9. [开发里程碑与排期](#9-开发里程碑与排期)
10. [测试方案](#10-测试方案)
11. [部署方案](#11-部署方案)

---

## 1. 数据库设计

### 1.1 ER 图（文字描述）

```
┌───────────┐       ┌──────────────┐       ┌────────────┐
│   user    │ 1──N  │ source_input │ 1──1  │ parse_job  │
└───────────┘       └──────────────┘       └────────────┘
      │ 1                   │ 1                    │
      │                     │                      │
      │                     │ 1                    │
      ├─────────────────────┤                      │
      │                     ▼                      │
      │              ┌──────────────┐              │
      │ 1──N         │ai_analysis   │              │
      ├─────────────►│_result       │              │
      │              └──────────────┘              │
      │                     │                      │
      │ 1──N                │ 1                    │
      ├─────────────────────┤                      │
      │              ┌──────────────┐              │
      │              │    task      │              │
      │              └──────────────┘              │
      │ 1──N               │ 1                     │
      ├────────────────────┤                       │
      │              ┌──────────────┐              │
      │              │task_checklist│              │
      │              │_item         │              │
      │              └──────────────┘              │
      │                                            │
      │ 1──N                                       │
      ├────────────────────────────────────────────┤
      │              ┌──────────────┐              │
      │              │timeline_event│              │
      │              └──────────────┘              │
      │                                            │
      │ 1──N                                       │
      ├────────────────────────────────────────────┤
      │              ┌──────────────┐              │
      │              │reminder_rule │              │
      │              └──────────────┘              │
      │                                            │
      │ 1──N                                       │
      ├────────────────────────────────────────────┤
      │              ┌──────────────┐              │
      │              │ notification │              │
      │              └──────────────┘              │
      │                                            │
      │ 1──N                                       │
      ├────────────────────────────────────────────┤
      │              ┌──────────────┐              │
      │              │user_setting  │              │
      │              └──────────────┘              │
      │                                            │
      │ 1──N                                       │
      └────────────────────────────────────────────┘
                   ┌──────────────┐
                   │device_sync   │
                   │_record       │
                   └──────────────┘
```

### 1.2 建表 SQL

```sql
-- =====================================================
-- PlanFlow AI 数据库建表脚本
-- 数据库：MySQL 8.0+
-- ======================================

CREATE DATABASE IF NOT EXISTS planflow DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE planflow;

-- 1. 用户表
CREATE TABLE `user` (
    `id`          BIGINT       NOT NULL AUTO_INCREMENT,
    `username`    VARCHAR(64)  NOT NULL UNIQUE COMMENT '用户名',
    `password_hash` VARCHAR(255) NOT NULL COMMENT 'BCrypt 加密密码',
    `nickname`    VARCHAR(64)  DEFAULT NULL COMMENT '昵称',
    `email`       VARCHAR(128) DEFAULT NULL COMMENT '邮箱',
    `avatar_url`  VARCHAR(255) DEFAULT NULL COMMENT '头像URL',
    `status`      VARCHAR(32)  DEFAULT 'ACTIVE' COMMENT '状态：ACTIVE, DISABLED',
    `created_at`  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at`  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    INDEX `idx_username` (`username`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='用户表';

-- 2. 用户设置表
CREATE TABLE `user_setting` (
    `id`                        BIGINT      NOT NULL AUTO_INCREMENT,
    `user_id`                   BIGINT      NOT NULL COMMENT '用户ID',
    `default_reminder_json`     JSON        DEFAULT NULL COMMENT '默认提醒规则JSON',
    `enable_in_app_notification` TINYINT    DEFAULT 1 COMMENT '启用站内通知',
    `enable_local_notification`  TINYINT    DEFAULT 1 COMMENT '启用本地通知',
    `enable_browser_notification` TINYINT   DEFAULT 0 COMMENT '启用浏览器通知',
    `created_at`                DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at`                DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_user_id` (`user_id`),
    CONSTRAINT `fk_setting_user` FOREIGN KEY (`user_id`) REFERENCES `user`(`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='用户设置表';

-- 3. 输入源表
CREATE TABLE `source_input` (
    `id`              BIGINT       NOT NULL AUTO_INCREMENT,
    `user_id`         BIGINT       NOT NULL COMMENT '用户ID',
    `source_type`     VARCHAR(32)  NOT NULL COMMENT '类型：TEXT, IMAGE, PDF, DOCX',
    `title`           VARCHAR(255) DEFAULT NULL COMMENT '标题',
    `original_name`   VARCHAR(255) DEFAULT NULL COMMENT '原始文件名',
    `file_path`       VARCHAR(512) DEFAULT NULL COMMENT '文件存储路径',
    `file_size`       BIGINT       DEFAULT NULL COMMENT '文件大小（字节）',
    `mime_type`       VARCHAR(128) DEFAULT NULL COMMENT 'MIME类型',
    `original_text`   LONGTEXT     DEFAULT NULL COMMENT '用户原始输入文本',
    `raw_text`        LONGTEXT     DEFAULT NULL COMMENT 'OCR/文档提取后的文本',
    `status`          VARCHAR(32)  DEFAULT 'CREATED' COMMENT '状态：CREATED, EXTRACTING, ANALYZING, COMPLETED, FAILED',
    `error_message`   TEXT         DEFAULT NULL COMMENT '错误信息',
    `created_at`      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at`      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    INDEX `idx_user_id` (`user_id`),
    INDEX `idx_status` (`status`),
    CONSTRAINT `fk_input_user` FOREIGN KEY (`user_id`) REFERENCES `user`(`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='输入源表';

-- 4. 解析任务表
CREATE TABLE `parse_job` (
    `id`              BIGINT      NOT NULL AUTO_INCREMENT,
    `user_id`         BIGINT      NOT NULL COMMENT '用户ID',
    `source_input_id` BIGINT      NOT NULL COMMENT '关联输入源ID',
    `status`          VARCHAR(32) DEFAULT 'PENDING' COMMENT '状态：PENDING, RUNNING, COMPLETED, FAILED, CANCELLED',
    `stage`           VARCHAR(64) DEFAULT NULL COMMENT '当前阶段：UPLOADED, EXTRACTING_TEXT, OCR_RUNNING, AI_ANALYZING, GENERATING_TASKS, GENERATING_REMINDERS, COMPLETED',
    `progress`        INT         DEFAULT 0 COMMENT '进度百分比 0-100',
    `retry_count`     INT         DEFAULT 0 COMMENT '重试次数',
    `error_message`   TEXT        DEFAULT NULL COMMENT '错误信息',
    `started_at`      DATETIME    DEFAULT NULL COMMENT '开始时间',
    `finished_at`     DATETIME    DEFAULT NULL COMMENT '完成时间',
    `created_at`      DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at`      DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    INDEX `idx_user_id` (`user_id`),
    INDEX `idx_status` (`status`),
    INDEX `idx_source_input_id` (`source_input_id`),
    CONSTRAINT `fk_job_input` FOREIGN KEY (`source_input_id`) REFERENCES `source_input`(`id`),
    CONSTRAINT `fk_job_user` FOREIGN KEY (`user_id`) REFERENCES `user`(`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='解析任务表';

-- 5. AI 解析结果表
CREATE TABLE `ai_analysis_result` (
    `id`              BIGINT       NOT NULL AUTO_INCREMENT,
    `user_id`         BIGINT       NOT NULL COMMENT '用户ID',
    `source_input_id` BIGINT       NOT NULL COMMENT '关联输入源ID',
    `model_name`      VARCHAR(64)  DEFAULT NULL COMMENT '模型名称',
    `prompt_text`     LONGTEXT     DEFAULT NULL COMMENT '发送的Prompt',
    `raw_response`    LONGTEXT     DEFAULT NULL COMMENT '模型原始响应',
    `parsed_json`     JSON         DEFAULT NULL COMMENT '解析后的结构化JSON',
    `summary`         TEXT         DEFAULT NULL COMMENT '摘要',
    `created_at`      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    INDEX `idx_user_id` (`user_id`),
    INDEX `idx_source_input_id` (`source_input_id`),
    CONSTRAINT `fk_ai_input` FOREIGN KEY (`source_input_id`) REFERENCES `source_input`(`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='AI解析结果表';

-- 6. 任务表
CREATE TABLE `task` (
    `id`               BIGINT       NOT NULL AUTO_INCREMENT,
    `user_id`          BIGINT       NOT NULL COMMENT '用户ID',
    `source_input_id`  BIGINT       DEFAULT NULL COMMENT '关联输入源ID',
    `title`            VARCHAR(255) NOT NULL COMMENT '任务标题',
    `description`      TEXT         DEFAULT NULL COMMENT '任务描述',
    `task_type`        VARCHAR(32)  DEFAULT 'AI_EXTRACTED' COMMENT '类型：AI_EXTRACTED, MANUAL',
    `priority`         VARCHAR(32)  DEFAULT 'MEDIUM' COMMENT '优先级：LOW, MEDIUM, HIGH, URGENT',
    `status`           VARCHAR(32)  DEFAULT 'TODO' COMMENT '状态：TODO, DOING, DONE, CANCELLED',
    `deadline`         DATETIME     DEFAULT NULL COMMENT '截止时间',
    `estimated_minutes` INT         DEFAULT NULL COMMENT '预估耗时（分钟）',
    `constraints_json` JSON         DEFAULT NULL COMMENT '约束条件JSON',
    `checklist_json`   JSON         DEFAULT NULL COMMENT '检查清单JSON（冗余）',
    `source_evidence`  TEXT         DEFAULT NULL COMMENT '来源原文证据',
    `created_by`       VARCHAR(32)  DEFAULT 'AI' COMMENT '创建方式',
    `created_at`       DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at`       DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    INDEX `idx_user_id` (`user_id`),
    INDEX `idx_status` (`status`),
    INDEX `idx_priority` (`priority`),
    INDEX `idx_deadline` (`deadline`),
    INDEX `idx_user_status` (`user_id`, `status`),
    CONSTRAINT `fk_task_user` FOREIGN KEY (`user_id`) REFERENCES `user`(`id`),
    CONSTRAINT `fk_task_input` FOREIGN KEY (`source_input_id`) REFERENCES `source_input`(`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='任务表';

-- 7. 检查清单项表
CREATE TABLE `task_checklist_item` (
    `id`         BIGINT       NOT NULL AUTO_INCREMENT,
    `user_id`    BIGINT       NOT NULL COMMENT '用户ID',
    `task_id`    BIGINT       NOT NULL COMMENT '关联任务ID',
    `content`    VARCHAR(255) NOT NULL COMMENT '检查项内容',
    `checked`    TINYINT      DEFAULT 0 COMMENT '是否已勾选',
    `sort_order` INT          DEFAULT 0 COMMENT '排序序号',
    `created_at` DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    INDEX `idx_task_id` (`task_id`),
    CONSTRAINT `fk_checklist_task` FOREIGN KEY (`task_id`) REFERENCES `task`(`id`) ON DELETE CASCADE,
    CONSTRAINT `fk_checklist_user` FOREIGN KEY (`user_id`) REFERENCES `user`(`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='检查清单表';

-- 8. 时间轴事件表
CREATE TABLE `timeline_event` (
    `id`              BIGINT       NOT NULL AUTO_INCREMENT,
    `user_id`         BIGINT       NOT NULL COMMENT '用户ID',
    `source_input_id` BIGINT       DEFAULT NULL COMMENT '关联输入源ID',
    `task_id`         BIGINT       DEFAULT NULL COMMENT '关联任务ID',
    `title`           VARCHAR(255) NOT NULL COMMENT '事件标题',
    `event_type`      VARCHAR(32)  NOT NULL COMMENT '类型：TASK_DEADLINE, EVENT, PLAN_STEP, REMINDER',
    `start_time`      DATETIME     DEFAULT NULL COMMENT '开始时间',
    `end_time`        DATETIME     DEFAULT NULL COMMENT '结束时间',
    `location`        VARCHAR(255) DEFAULT NULL COMMENT '地点',
    `description`     TEXT         DEFAULT NULL COMMENT '描述',
    `created_at`      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at`      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    INDEX `idx_user_id` (`user_id`),
    INDEX `idx_task_id` (`task_id`),
    INDEX `idx_time_range` (`start_time`, `end_time`),
    CONSTRAINT `fk_timeline_user` FOREIGN KEY (`user_id`) REFERENCES `user`(`id`),
    CONSTRAINT `fk_timeline_task` FOREIGN KEY (`task_id`) REFERENCES `task`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='时间轴事件表';

-- 9. 提醒规则表
CREATE TABLE `reminder_rule` (
    `id`                   BIGINT       NOT NULL AUTO_INCREMENT,
    `user_id`              BIGINT       NOT NULL COMMENT '用户ID',
    `task_id`              BIGINT       DEFAULT NULL COMMENT '关联任务ID',
    `event_id`             BIGINT       DEFAULT NULL COMMENT '关联事件ID',
    `title`                VARCHAR(255) DEFAULT NULL COMMENT '提醒标题',
    `content`              TEXT         DEFAULT NULL COMMENT '提醒内容',
    `remind_at`            DATETIME     NOT NULL COMMENT '提醒时间',
    `channel`              VARCHAR(32)  DEFAULT 'IN_APP' COMMENT '渠道：IN_APP, LOCAL_APP, BROWSER, EMAIL',
    `status`               VARCHAR(32)  DEFAULT 'PENDING' COMMENT '状态：PENDING, SENT, FAILED, CANCELLED',
    `local_notification_id` INT         DEFAULT NULL COMMENT 'Android本地通知ID',
    `created_at`           DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at`           DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    INDEX `idx_user_id` (`user_id`),
    INDEX `idx_task_id` (`task_id`),
    INDEX `idx_remind_at` (`remind_at`),
    INDEX `idx_status` (`status`),
    CONSTRAINT `fk_reminder_user` FOREIGN KEY (`user_id`) REFERENCES `user`(`id`),
    CONSTRAINT `fk_reminder_task` FOREIGN KEY (`task_id`) REFERENCES `task`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='提醒规则表';

-- 10. 通知表
CREATE TABLE `notification` (
    `id`               BIGINT       NOT NULL AUTO_INCREMENT,
    `user_id`          BIGINT       NOT NULL COMMENT '用户ID',
    `task_id`          BIGINT       DEFAULT NULL COMMENT '关联任务ID',
    `reminder_rule_id` BIGINT       DEFAULT NULL COMMENT '关联提醒规则ID',
    `title`            VARCHAR(255) DEFAULT NULL COMMENT '通知标题',
    `content`          TEXT         DEFAULT NULL COMMENT '通知内容',
    `type`             VARCHAR(32)  DEFAULT 'SYSTEM' COMMENT '类型：DEADLINE_SOON, TASK_OVERDUE, PLAN_SUGGESTION, SYSTEM, PARSE_COMPLETED, PARSE_FAILED',
    `read_status`      VARCHAR(32)  DEFAULT 'UNREAD' COMMENT '读取状态：UNREAD, READ',
    `created_at`       DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `read_at`          DATETIME     DEFAULT NULL COMMENT '读取时间',
    PRIMARY KEY (`id`),
    INDEX `idx_user_id` (`user_id`),
    INDEX `idx_read_status` (`read_status`),
    INDEX `idx_type` (`type`),
    CONSTRAINT `fk_notification_user` FOREIGN KEY (`user_id`) REFERENCES `user`(`id`),
    CONSTRAINT `fk_notification_task` FOREIGN KEY (`task_id`) REFERENCES `task`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='通知表';

-- 11. 设备同步记录表
CREATE TABLE `device_sync_record` (
    `id`              BIGINT       NOT NULL AUTO_INCREMENT,
    `user_id`         BIGINT       NOT NULL COMMENT '用户ID',
    `device_id`       VARCHAR(128) DEFAULT NULL COMMENT '设备标识',
    `last_sync_at`    DATETIME     DEFAULT NULL COMMENT '最后同步时间',
    `app_platform`    VARCHAR(32)  DEFAULT NULL COMMENT '平台：Android',
    `app_version`     VARCHAR(32)  DEFAULT NULL COMMENT 'App版本',
    `created_at`      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at`      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    INDEX `idx_user_device` (`user_id`, `device_id`),
    CONSTRAINT `fk_device_user` FOREIGN KEY (`user_id`) REFERENCES `user`(`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='设备同步记录表';
```

---

## 2. REST API 文档

### 2.1 认证接口

#### POST `/api/auth/register` — 注册

```json
// Request
{ "username": "zhangsan", "password": "abc123", "nickname": "张三" }
// Response 200
{ "code": 200, "data": { "id": 1, "username": "zhangsan", "nickname": "张三" } }
```

#### POST `/api/auth/login` — 登录

```json
// Request
{ "username": "zhangsan", "password": "abc123" }
// Response 200
{
  "code": 200,
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIs...",
    "user": { "id": 1, "username": "zhangsan", "nickname": "张三" }
  }
}
```

#### GET `/api/auth/me` — 当前用户（需鉴权）

```json
// Response 200
{ "code": 200, "data": { "id": 1, "username": "zhangsan", "nickname": "张三", "email": null } }
```

### 2.2 输入源接口

#### POST `/api/inputs/text` — 文本输入

```json
// Request
{ "content": "下周五前提交软件项目立项书，要包括背景、需求、功能模块、技术路线，下周三答辩。" }
// Response 200
{ "code": 200, "data": { "inputId": 1, "jobId": 1 } }
```

#### POST `/api/inputs/upload` — 文件上传

- Content-Type: `multipart/form-data`
- Fields: `file` (File), `sourceType` (String: IMAGE|PDF|DOCX)

```json
// Response 200
{ "code": 200, "data": { "inputId": 1, "jobId": 1, "fileName": "notice.png" } }
```

#### GET `/api/inputs` — 输入源列表（需鉴权）

Query: `?page=1&size=20`, Response 分页列表。

#### GET `/api/inputs/{id}` — 输入源详情

```json
{
  "code": 200,
  "data": {
    "id": 1, "sourceType": "TEXT", "originalText": "下周五前...",
    "rawText": null, "status": "COMPLETED", "createdAt": "2026-06-23T10:00:00"
  }
}
```

### 2.3 解析任务接口

#### GET `/api/jobs/{id}` — 查询任务状态

```json
{
  "code": 200,
  "data": {
    "jobId": 1, "status": "RUNNING", "stage": "AI_ANALYZING",
    "progress": 70, "errorMessage": null
  }
}
```

### 2.4 任务接口

#### GET `/api/tasks` — 任务列表

Query: `?status=TODO&priority=HIGH&from=2026-06-01&to=2026-07-01&keyword=立项&sourceInputId=1`

#### GET `/api/tasks/today` — 今日任务

#### GET `/api/tasks/upcoming` — 即将截止（未来 3 天）

#### GET `/api/tasks/overdue` — 已过期

#### GET `/api/tasks/{id}` — 任务详情

包含 checklist 和 reminders 列表。

#### POST `/api/tasks` — 手动创建

```json
// Request
{
  "title": "完成实验报告",
  "description": "操作系统实验三",
  "deadline": "2026-06-30T23:59:59",
  "priority": "HIGH"
}
```

#### PATCH `/api/tasks/{id}` — 修改任务

```json
// Request
{ "title": "新标题", "deadline": "2026-07-01T18:00:00" }
```

#### PATCH `/api/tasks/{id}/status` — 修改状态

```json
// Request
{ "status": "DONE" }
```

#### DELETE `/api/tasks/{id}` — 删除任务

### 2.5 检查清单接口

#### POST `/api/tasks/{taskId}/checklist` — 新增检查项

```json
// Request
{ "content": "是否包含项目背景" }
```

#### PATCH `/api/checklist/{id}` — 修改检查项

```json
// Request
{ "content": "xxx", "checked": true }
```

#### DELETE `/api/checklist/{id}` — 删除检查项

### 2.6 时间轴接口

#### GET `/api/timeline` — 时间轴事件

Query: `?from=2026-06-23&to=2026-07-01&type=TASK_DEADLINE`

```json
{
  "code": 200,
  "data": [
    { "id": 1, "title": "提交立项书", "eventType": "TASK_DEADLINE",
      "startTime": "2026-06-28T18:00:00", "taskId": 1, "sourceInputId": 1 }
  ]
}
```

### 2.7 提醒接口

#### GET `/api/reminders` — 提醒规则列表

#### POST `/api/reminders` — 手动添加提醒

```json
// Request
{ "taskId": 1, "title": "提醒：立项书截止", "remindAt": "2026-06-27T18:00:00", "channel": "IN_APP" }
```

#### PATCH `/api/reminders/{id}` — 修改提醒

#### DELETE `/api/reminders/{id}` — 取消提醒

#### GET `/api/reminders/pending-local` — Android 拉取待注册提醒

```json
{
  "code": 200,
  "data": [
    { "id": 1, "taskId": 1, "title": "立项书即将截止",
      "content": "软件项目立项书将在 3 小时后截止",
      "remindAt": "2026-06-28T15:00:00" }
  ]
}
```

#### POST `/api/reminders/local-sync` — 上报本地通知注册结果

```json
// Request
{
  "deviceId": "xxx-xxx",
  "items": [
    { "reminderId": 1, "localNotificationId": 10001, "syncStatus": "SCHEDULED" }
  ]
}
```

### 2.8 通知接口

#### GET `/api/notifications` — 通知列表

#### GET `/api/notifications/unread-count` — 未读数量

```json
{ "code": 200, "data": { "count": 5 } }
```

#### PATCH `/api/notifications/{id}/read` — 标记已读

#### PATCH `/api/notifications/read-all` — 全部已读

### 2.9 设置接口

#### GET `/api/settings` — 获取设置

#### PATCH `/api/settings` — 修改设置

```json
// Request
{ "enableLocalNotification": true, "defaultReminderJson": { "beforeDays": 1, "beforeHours": 3 } }
```

### 2.10 统一响应格式

```json
// 成功
{ "code": 200, "data": {}, "message": "success" }
// 失败
{ "code": 400, "data": null, "message": "参数错误：xxx" }
{ "code": 401, "data": null, "message": "未登录或令牌已过期" }
{ "code": 500, "data": null, "message": "服务器内部错误" }
```

---

## 3. 前端详细设计

### 3.1 页面路由

```typescript
// app/router.tsx
const routes = [
  { path: '/login', component: LoginPage },
  { path: '/register', component: RegisterPage },
  { path: '/', component: DashboardPage, auth: true },
  { path: '/input', component: InputPage, auth: true },
  { path: '/jobs/:id', component: ParseProgressPage, auth: true },
  { path: '/tasks', component: TaskListPage, auth: true },
  { path: '/tasks/:id', component: TaskDetailPage, auth: true },
  { path: '/timeline', component: TimelinePage, auth: true },
  { path: '/notifications', component: NotificationPage, auth: true },
  { path: '/settings', component: SettingsPage, auth: true },
];
```

### 3.2 组件拆分

```
components/
├── layout/
│   ├── AppLayout.tsx          # 登录态布局（顶栏 + 侧栏/底部导航）
│   ├── Header.tsx             # 顶栏（Logo、搜索、通知角标、用户菜单）
│   ├── Sidebar.tsx            # 桌面侧边导航
│   └── BottomNav.tsx          # 移动端底部导航
│
├── task/
│   ├── TaskCard.tsx           # 任务卡片（标题、时间、优先级、状态）
│   ├── TaskList.tsx           # 任务列表容器
│   ├── TaskFilter.tsx         # 筛选栏
│   ├── TaskStatusBadge.tsx    # 状态标签
│   ├── PriorityTag.tsx        # 优先级标签
│   └── TaskForm.tsx           # 任务创建/编辑表单
│
├── checklist/
│   ├── ChecklistItem.tsx      # 单个检查项（复选框 + 内容）
│   └── ChecklistPanel.tsx     # 检查清单面板
│
├── timeline/
│   ├── TimelineList.tsx       # 时间轴列表视图
│   ├── TimelineDayGroup.tsx   # 按天分组
│   └── TimelineEventItem.tsx  # 单个事件项
│
├── upload/
│   ├── FileUploader.tsx       # 文件上传组件
│   ├── TextInput.tsx          # 文本输入框
│   └── UploadPanel.tsx        # 上传面板（含类型切换）
│
├── notification/
│   ├── NotificationList.tsx   # 通知列表
│   └── NotificationBadge.tsx  # 未读数角标
│
├── input/
│   ├── QuickInputBox.tsx      # 首页快速输入
│   └── ParseProgress.tsx      # 解析进度组件
│
└── common/
    ├── Loading.tsx
    ├── EmptyState.tsx
    ├── ErrorBoundary.tsx
    └── ConfirmDialog.tsx
```

### 3.3 状态管理（Zustand）

```typescript
// stores/authStore.ts
interface AuthState {
  user: User | null;
  token: string | null;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  loadUser: () => Promise<void>;
}

// stores/taskStore.ts
interface TaskState {
  tasks: Task[];
  currentTask: Task | null;
  filter: TaskFilter;
  loading: boolean;
  fetchTasks: (filter?: TaskFilter) => Promise<void>;
  updateStatus: (id: number, status: TaskStatus) => Promise<void>;
}

// stores/notificationStore.ts
interface NotificationState {
  notifications: Notification[];
  unreadCount: number;
  fetchNotifications: () => Promise<void>;
  markAsRead: (id: number) => Promise<void>;
}
```

### 3.4 平台服务封装

```typescript
// services/platformService.ts
export const PlatformService = {
  isNativeApp(): boolean {
    return !!(window as any).Capacitor?.isNativePlatform();
  },
  isAndroid(): boolean {
    return this.isNativeApp() && (window as any).Capacitor?.getPlatform() === 'android';
  },
  isWeb(): boolean {
    return !this.isNativeApp();
  }
};

// services/localNotificationService.ts
export const LocalNotificationService = {
  async requestPermission(): Promise<boolean> { ... },
  async scheduleReminder(reminder: ReminderRule): Promise<number> { ... },
  async cancelReminder(notificationId: number): Promise<void> { ... },
  async syncReminders(reminders: ReminderRule[]): Promise<void> { ... }
};
```

### 3.5 API 服务封装

```typescript
// services/api.ts — Axios 实例（含 JWT 拦截器）
const api = axios.create({ baseURL: import.meta.env.VITE_API_BASE || '/api' });
api.interceptors.request.use(config => {
  const token = useAuthStore.getState().token;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});
api.interceptors.response.use(res => res.data, err => {
  if (err.response?.status === 401) useAuthStore.getState().logout();
  return Promise.reject(err);
});
```

---

## 4. 后端详细设计

### 4.1 项目包结构

```
com.example.planflow/
├── PlanflowApplication.java
│
├── common/
│   ├── ApiResponse.java          // 统一响应封装
│   ├── ErrorCode.java            // 错误码枚举
│   ├── GlobalExceptionHandler.java // 全局异常处理
│   └── BaseEntity.java           // 基础实体（id, createdAt, updatedAt）
│
├── config/
│   ├── SecurityConfig.java       // Spring Security 配置
│   ├── JwtConfig.java            // JWT 配置
│   ├── WebConfig.java            // CORS、静态资源配置
│   └── AsyncConfig.java          // 异步任务线程池配置
│
├── auth/
│   ├── AuthController.java
│   ├── AuthService.java
│   ├── JwtTokenProvider.java     // JWT 生成与校验
│   ├── JwtAuthenticationFilter.java // 鉴权过滤器
│   ├── dto/
│   │   ├── LoginRequest.java
│   │   ├── RegisterRequest.java
│   │   └── AuthResponse.java
│   └── AuthException.java
│
├── user/
│   ├── entity/User.java
│   ├── mapper/UserMapper.java
│   ├── service/UserService.java
│   └── controller/UserController.java
│
├── input/
│   ├── entity/SourceInput.java
│   ├── mapper/SourceInputMapper.java
│   ├── service/SourceInputService.java
│   ├── controller/SourceInputController.java
│   └── dto/
│       ├── TextInputRequest.java
│       ├── UploadResponse.java
│       └── SourceInputVO.java
│
├── job/
│   ├── entity/ParseJob.java
│   ├── mapper/ParseJobMapper.java
│   ├── service/ParseJobService.java
│   ├── controller/ParseJobController.java
│   ├── worker/ParseJobWorker.java       // @Scheduled 定时扫描
│   └── enums/
│       ├── JobStatus.java
│       └── JobStage.java
│
├── extract/
│   ├── TextExtractService.java        // 统一入口
│   ├── PdfExtractService.java         // PDFBox 实现
│   └── DocxExtractService.java        // Apache POI 实现
│
├── ocr/
│   ├── OcrClient.java                 // HTTP 调用 PaddleOCR
│   └── dto/OcrResponse.java
│
├── ai/
│   ├── AiClient.java                  // 模型调用统一接口
│   ├── DeepSeekClient.java            // DeepSeek 实现
│   ├── QwenClient.java                // Qwen 实现（可选）
│   ├── AiPromptBuilder.java           // Prompt 模板构建
│   ├── AiResultParser.java            // JSON 提取与校验
│   └── dto/
│       ├── AiRequest.java
│       ├── AiResponse.java
│       └── AiAnalysisResultDTO.java   // 解析后的结构化 DTO
│
├── task/
│   ├── entity/Task.java
│   ├── entity/TaskChecklistItem.java
│   ├── mapper/TaskMapper.java
│   ├── mapper/TaskChecklistMapper.java
│   ├── controller/TaskController.java
│   ├── service/TaskService.java
│   ├── service/TaskGenerateService.java  // 从 AI 结果生成任务
│   └── dto/
│       ├── TaskVO.java
│       ├── TaskCreateRequest.java
│       └── TaskStatusUpdateRequest.java
│
├── timeline/
│   ├── entity/TimelineEvent.java
│   ├── mapper/TimelineEventMapper.java
│   ├── controller/TimelineController.java
│   └── service/TimelineService.java
│
├── reminder/
│   ├── entity/ReminderRule.java
│   ├── mapper/ReminderRuleMapper.java
│   ├── controller/ReminderController.java
│   ├── service/ReminderService.java
│   ├── scheduler/ReminderScheduler.java    // @Scheduled 扫描到期提醒
│   └── plugin/
│       ├── ReminderChannelPlugin.java      // 插件接口
│       ├── InAppReminderPlugin.java        // 站内通知实现
│       └── LocalAppReminderPlugin.java     // 本地通知数据准备
│
├── notification/
│   ├── entity/Notification.java
│   ├── mapper/NotificationMapper.java
│   ├── controller/NotificationController.java
│   └── service/NotificationService.java
│
└── setting/
    ├── entity/UserSetting.java
    ├── mapper/UserSettingMapper.java
    ├── controller/SettingController.java
    └── service/SettingService.java
```

### 4.2 核心类设计

#### ParseJobWorker（异步 Worker 核心）

```java
@Component
@Slf4j
public class ParseJobWorker {

    @Scheduled(fixedDelay = 5000) // 每 5 秒扫描一次
    public void processPendingJobs() {
        List<ParseJob> pendingJobs = parseJobMapper.findByStatus(JobStatus.PENDING);
        for (ParseJob job : pendingJobs) {
            processJob(job);
        }
    }

    private void processJob(ParseJob job) {
        try {
            job.setStatus(JobStatus.RUNNING);
            parseJobMapper.updateById(job);

            SourceInput input = sourceInputMapper.selectById(job.getSourceInputId());

            // 1. 文本提取
            updateStage(job, JobStage.EXTRACTING_TEXT, 20);
            String rawText = extractRawText(input);
            input.setRawText(rawText);
            sourceInputMapper.updateById(input);

            // 2. OCR（如果图片且没提取到文本）
            if (isImageType(input.getSourceType()) && isEmpty(rawText)) {
                updateStage(job, JobStage.OCR_RUNNING, 40);
                rawText = ocrClient.recognize(input.getFilePath());
                input.setRawText(rawText);
                sourceInputMapper.updateById(input);
            }

            // 3. AI 解析
            updateStage(job, JobStage.AI_ANALYZING, 60);
            AiAnalysisResultDTO result = aiClient.analyze(input);

            // 4. 生成任务
            updateStage(job, JobStage.GENERATING_TASKS, 80);
            taskGenerateService.generateFromAnalysis(input.getId(), result);

            // 5. 完成
            updateStage(job, JobStage.COMPLETED, 100);
            job.setStatus(JobStatus.COMPLETED);
            job.setFinishedAt(LocalDateTime.now());
            parseJobMapper.updateById(job);

            // 发送解析完成通知
            notificationService.createParseCompletedNotification(job.getUserId(), job.getSourceInputId());

        } catch (Exception e) {
            log.error("Job {} failed", job.getId(), e);
            job.setStatus(JobStatus.FAILED);
            job.setErrorMessage(e.getMessage());
            parseJobMapper.updateById(job);

            notificationService.createParseFailedNotification(job.getUserId(), job.getSourceInputId());
        }
    }
}
```

#### AiClient 统一接口

```java
public interface AiClient {
    AiAnalysisResultDTO analyze(SourceInput input);
    String getModelName();
}

@Component
@ConditionalOnProperty(name = "ai.model", havingValue = "deepseek")
public class DeepSeekClient implements AiClient {
    @Override
    public AiAnalysisResultDTO analyze(SourceInput input) {
        String prompt = AiPromptBuilder.build(input.getRawText(), input.getSourceType());
        String response = callDeepSeekApi(prompt);
        return AiResultParser.parse(response);
    }
}
```

#### ReminderScheduler

```java
@Component
@Slf4j
public class ReminderScheduler {

    @Scheduled(fixedRate = 60_000) // 每分钟检查一次
    public void checkPendingReminders() {
        List<ReminderRule> pending = reminderMapper.findPendingByTime(LocalDateTime.now());
        for (ReminderRule rule : pending) {
            try {
                reminderPluginRegistry.getEnabledPlugins(rule.getUserId())
                    .forEach(plugin -> plugin.send(rule));
                rule.setStatus(ReminderStatus.SENT);
                reminderMapper.updateById(rule);
            } catch (Exception e) {
                log.error("Failed to send reminder {}", rule.getId(), e);
                rule.setStatus(ReminderStatus.FAILED);
                reminderMapper.updateById(rule);
            }
        }
    }
}
```

### 4.3 application.yml 配置

```yaml
server:
  port: 8080

spring:
  datasource:
    url: jdbc:mysql://localhost:3306/planflow?useUnicode=true&characterEncoding=utf8mb4
    username: root
    password: ${DB_PASSWORD}
  servlet:
    multipart:
      max-file-size: 20MB
      max-request-size: 20MB

planflow:
  jwt:
    secret: ${JWT_SECRET}
    expiration: 86400000  # 24 小时
  ai:
    model: deepseek  # deepseek | qwen
    deepseek:
      api-key: ${DEEPSEEK_API_KEY}
      api-url: https://api.deepseek.com/v1/chat/completions
    qwen:
      api-key: ${QWEN_API_KEY}
      api-url: https://dashscope.aliyuncs.com/api/v1/services/aigc/text-generation/generation
  ocr:
    service-url: http://localhost:8000/ocr/image
    timeout: 30000
  upload:
    path: ./uploads
```

---

## 5. OCR 服务设计

### 5.1 FastAPI 服务

```python
# ocr-service/app/main.py
from fastapi import FastAPI, UploadFile, File
from app.ocr_service import OcrService
from app.schemas import OcrResponse

app = FastAPI(title="PlanFlow OCR Service")
ocr_service = OcrService()

@app.post("/ocr/image", response_model=OcrResponse)
async def ocr_image(file: UploadFile = File(...)):
    """识别图片中的文字"""
    contents = await file.read()
    result = ocr_service.recognize(contents)
    return result

@app.get("/health")
async def health():
    return {"status": "ok"}
```

```python
# ocr-service/app/ocr_service.py
from paddleocr import PaddleOCR

class OcrService:
    def __init__(self):
        self.ocr = PaddleOCR(use_angle_cls=True, lang='ch', show_log=False)

    def recognize(self, image_bytes: bytes) -> dict:
        """识别图片文字，返回完整文本和逐行结果"""
        import numpy as np
        import cv2

        nparr = np.frombuffer(image_bytes, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

        result = self.ocr.ocr(img, cls=True)

        lines = []
        full_text = ""
        for line in result[0]:
            text = line[1][0]
            confidence = line[1][1]
            lines.append({"text": text, "confidence": confidence})
            full_text += text + "\n"

        return {
            "success": True,
            "text": full_text.strip(),
            "lines": lines
        }
```

### 5.2 接口文档

| 接口 | 方法 | 说明 |
|------|------|------|
| `/ocr/image` | POST | 上传图片文件，返回识别文本 |
| `/health` | GET | 健康检查 |

**POST /ocr/image**

- Request: `multipart/form-data`，字段 `file`
- Response:
```json
{
  "success": true,
  "text": "识别出的完整文本",
  "lines": [
    { "text": "第一行文字", "confidence": 0.96 },
    { "text": "第二行文字", "confidence": 0.92 }
  ]
}
```

---

## 6. AI Prompt 设计

### 6.1 信息抽取 Prompt 模板

```
你是一个任务规划助手，需要从用户提供的自然语言、公告、OCR 文字或文档文本中提取目标、任务、时间、地点、约束、检查清单、提醒建议和风险提示。

## 输入信息
- 当前日期时间：{currentDateTime}
- 用户时区：{timezone}
- 输入来源类型：{sourceType}
- 原始文本：
```
{rawText}
```

## 要求
1. 只输出合法 JSON，不要输出任何 Markdown 格式。
2. 不确定的信息填 null。
3. 所有时间尽量标准化为 yyyy-MM-dd HH:mm:ss 格式。
4. 相对时间（如"下周五"、"明天"、"三天后"）结合当前日期时间推断。
5. 任务 title 必须是可执行的动作（如"撰写软件项目立项书"）。
6. checklist 必须是可核对的明确项目。
7. reminders 给出建议的提醒时间（截止前一天、截止前3小时等）。
8. 如果没有明确时间，deadline 填 null。
9. 不要编造原文中不存在的重要约束。
10. sourceEvidence 填写来自原文的证据短句。

## 输出 JSON Schema
{
  "summary": "整体描述",
  "goals": [{"title": "目标标题", "description": "目标描述"}],
  "tasks": [
    {
      "title": "任务标题",
      "description": "任务描述",
      "deadline": "yyyy-MM-dd HH:mm:ss 或 null",
      "priority": "LOW/MEDIUM/HIGH/URGENT",
      "estimatedMinutes": 60,
      "constraints": ["约束1"],
      "checklist": ["检查项1"],
      "suggestedReminders": [
        {"title": "提醒标题", "content": "提醒内容", "remindAt": "yyyy-MM-dd HH:mm:ss"}
      ],
      "sourceEvidence": "原文证据短句"
    }
  ],
  "events": [
    {
      "title": "事件标题",
      "startTime": "yyyy-MM-dd HH:mm:ss 或 null",
      "endTime": "yyyy-MM-dd HH:mm:ss 或 null",
      "location": "地点",
      "description": "描述",
      "sourceEvidence": "原文证据短句"
    }
  ],
  "risks": [
    {"title": "风险标题", "description": "风险描述", "level": "LOW/MEDIUM/HIGH"}
  ],
  "conflicts": [
    {"title": "冲突标题", "description": "冲突描述", "relatedItems": ["相关项"]}
  ],
  "planningSuggestions": [
    {"title": "建议标题", "description": "建议描述"}
  ]
}
```

### 6.2 AiPromptBuilder 实现

```java
@Component
public class AiPromptBuilder {

    public String build(String rawText, String sourceType) {
        String currentDateTime = LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss"));
        String timezone = ZoneId.systemDefault().getId();

        return String.format("""
            你是一个任务规划助手...
            当前日期时间：%s
            用户时区：%s
            输入来源类型：%s
            原始文本：```
            %s
            ```
            输出 JSON 格式如上。
            """, currentDateTime, timezone, sourceType, rawText);
    }
}
```

### 6.3 AiResultParser 实现要点

```java
@Component
public class AiResultParser {

    public AiAnalysisResultDTO parse(String rawResponse) {
        // 1. 从响应中提取 JSON（去除可能的 Markdown 代码块标记）
        String json = extractJson(rawResponse);

        // 2. 解析为 DTO
        AiAnalysisResultDTO result = objectMapper.readValue(json, AiAnalysisResultDTO.class);

        // 3. 校验必填字段
        validate(result);

        // 4. 标准化时间字段
        normalizeDates(result);

        return result;
    }

    private String extractJson(String raw) {
        // 去除 ```json ... ``` 标记
        // 提取第一个 { 到最后一个 } 的内容
    }

    private void validate(AiAnalysisResultDTO result) {
        // 检查 tasks 不为空
        // 检查 title 不为空
        // 检查 deadline 格式
    }
}
```

---

## 7. Capacitor 本地通知方案

### 7.1 平台检测

```typescript
// services/platformService.ts
import { Capacitor } from '@capacitor/core';

export const isNativePlatform = (): boolean => Capacitor.isNativePlatform();
export const isAndroid = (): boolean => Capacitor.getPlatform() === 'android';
```

### 7.2 本地通知服务

```typescript
// services/localNotificationService.ts
import { LocalNotifications } from '@capacitor/local-notifications';

export const requestPermission = async (): Promise<boolean> => {
  if (!isNativePlatform()) return false;
  const perm = await LocalNotifications.requestPermissions();
  return perm.display === 'granted';
};

export const scheduleReminder = async (reminder: {
  id: number;
  title: string;
  content: string;
  remindAt: string; // ISO datetime
}): Promise<number> => {
  const notificationId = reminder.id; // 使用 reminderRuleId 作为 notificationId
  await LocalNotifications.schedule({
    notifications: [{
      id: notificationId,
      title: reminder.title,
      body: reminder.content,
      schedule: { at: new Date(reminder.remindAt) },
      sound: 'default',
      smallIcon: 'ic_stat_icon',
      largeIcon: 'ic_launcher',
    }],
  });
  return notificationId;
};

export const cancelReminder = async (notificationId: number): Promise<void> => {
  await LocalNotifications.cancel({ notifications: [{ id: notificationId }] });
};

export const cancelAllReminders = async (): Promise<void> => {
  const pending = await LocalNotifications.getPending();
  await LocalNotifications.cancel({ notifications: pending.notifications });
};

export const syncReminders = async (
  reminders: Array<{ id: number; title: string; content: string; remindAt: string }>
): Promise<Array<{ reminderId: number; localNotificationId: number; syncStatus: string }>> => {
  const results = [];
  for (const reminder of reminders) {
    const localId = await scheduleReminder(reminder);
    results.push({
      reminderId: reminder.id,
      localNotificationId: localId,
      syncStatus: 'SCHEDULED',
    });
  }
  return results;
};
```

### 7.3 Android 端同步流程

```
App 启动 / 恢复前台
    │
    ├── 检查登录状态 → 未登录 → 跳转登录页
    │
    ├── isNativePlatform()?
    │   ├── Yes → 请求通知权限
    │   └── No → 跳过
    │
    ├── 调用 GET /api/reminders/pending-local
    │
    ├── 对每条提醒调用 scheduleReminder()
    │
    ├── 调用 POST /api/reminders/local-sync 上报结果
    │
    └── 完成同步
```

### 7.4 通知点击处理

```typescript
// App.tsx
import { App as CapacitorApp } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';

useEffect(() => {
  // 监听通知点击事件
  LocalNotifications.addListener('localNotificationActionPerformed', (event) => {
    const { notification } = event;
    // 根据 notification.id 查找对应任务
    // 跳转到任务详情页
    navigate(`/tasks/${notification.extra?.taskId}`);
  });

  return () => {
    LocalNotifications.removeAllListeners();
  };
}, []);
```

---

## 8. 异步任务队列方案

### 8.1 MySQL 表驱动队列

```
parse_job 表作为队列存储。
┌─────────────────────────────────────────────┐
│  ParseJobWorker (单线程 @Scheduled)          │
│                                             │
│  1. SELECT * FROM parse_job                 │
│     WHERE status = 'PENDING'                │
│     ORDER BY created_at ASC                 │
│     LIMIT 5                                 │
│                                             │
│  2. 对每个 job:                             │
│     UPDATE status = 'RUNNING'               │
│     执行处理逻辑                            │
│     UPDATE status = 'COMPLETED' / 'FAILED'  │
└─────────────────────────────────────────────┘
```

### 8.2 线程池配置

```java
@Configuration
public class AsyncConfig {
    @Bean("jobWorkerExecutor")
    public Executor jobWorkerExecutor() {
        ThreadPoolTaskExecutor executor = new ThreadPoolTaskExecutor();
        executor.setCorePoolSize(1);
        executor.setMaxPoolSize(2);
        executor.setQueueCapacity(100);
        executor.setThreadNamePrefix("job-worker-");
        executor.initialize();
        return executor;
    }
}
```

### 8.3 重试策略

```
第一次失败 → status = FAILED, retry_count = 1
用户点击"重试" → status = PENDING, retry_count++
Worker 重新执行
最多重试 3 次
超过 3 次后禁止重试，提示用户手动处理
```

### 8.4 参数配置

```yaml
planflow:
  job:
    scan-interval: 5000     # 扫描间隔（毫秒）
    max-retry: 3            # 最大重试次数
    batch-size: 5           # 每次扫描数量
    timeout-minutes: 5      # 单任务超时时间
```

---

## 9. 开发里程碑与排期

### 9.1 阶段分解（12 天）

| 阶段 | 天数 | 内容 | 产出物 |
|------|------|------|--------|
| **P1** 基础工程搭建 | 2 天 | React 项目初始化、Spring Boot 项目初始化、MySQL 建库、用户注册登录、JWT、Capacitor 接入 | Web 能登录、APK 能运行、后端 JWT 可用 |
| **P2** 输入源与文件上传 | 1 天 | 文本输入 API、文件上传 API、source_input 表、parse_job 表 | 提交文本/文件后生成 job |
| **P3** OCR 与文档解析 | 2 天 | PaddleOCR 服务搭建、Spring Boot 调用 OCR、PDFBox 提取文本、Apache POI 提取 | 图片能识别文字、PDF 能提取文字 |
| **P4** AI 解析与落库 | 2 天 | DeepSeek API 接入、Prompt 设计、JSON 解析、task/checklist/timeline/reminder 生成 | 一段文本能自动生成完整任务体系 |
| **P5** 前端页面 | 2 天 | Dashboard、TaskList、TaskDetail、Timeline、NotificationCenter | 用户能完整操作任务 |
| **P6** 通知能力 | 1 天 | 站内通知定时生成、LocalNotifications 接入、提醒同步 | 到点弹通知（Web + Android） |
| **P7** 完善与答辩 | 2 天 | 演示数据、错误处理、页面优化、文档完善、部署 | 可演示完整闭环 |

### 9.2 每日详细计划

| 日 | 阶段 | 前端 | 后端 | OCR 服务 |
|----|------|------|------|----------|
| D1 | P1 | 初始化 React + Vite + Ant Design + 路由配置 | 初始化 Spring Boot + MyBatis Plus + MySQL | - |
| D2 | P1 | 登录/注册页面、Token 存储、Axios 封装 | 完成注册/登录 API、JWT 生成与校验 | - |
| D3 | P2 | 输入页（文本输入 + 文件上传） | 文本输入 API、文件上传 API、source_input + parse_job 表 | - |
| D4 | P3 | 解析进度页（轮询状态 + 进度条） | PDFBox 文本提取、文本清洗 | 搭建 FastAPI + PaddleOCR |
| D5 | P3 | - | OcrClient 调用、DocxExtract 服务 | 完善 OCR 接口、测试 |
| D6 | P4 | - | DeepSeek 接入、Prompt 设计、JSON 解析 | - |
| D7 | P4 | - | TaskGenerateService（生成任务 + 时间轴 + 提醒） | - |
| D8 | P5 | Dashboard、TaskList 页 | Task/Timeline/Reminder 查询 API | - |
| D9 | P5 | TaskDetail、Timeline 页 | - | - |
| D10 | P6 | Notification 中心、LocalNotifications 集成 | ReminderScheduler、NotificationService | - |
| D11 | P6 | 提醒同步逻辑、设置页 | Android 同步 API | - |
| D12 | P7 | 页面美化、错误处理、演示数据 | 数据清洗、日志、部署脚本 | - |

---

## 10. 测试方案

### 10.1 测试策略

| 测试类型 | 范围 | 工具 | 执行者 |
|----------|------|------|--------|
| 单元测试 | Service 层核心逻辑 | JUnit 5 + Mockito | 后端开发者 |
| API 测试 | 所有 REST 接口 | Postman / curl | 后端开发者 |
| 前端组件测试 | 核心组件 | Vitest + React Testing Library | 前端开发者 |
| 集成测试 | 端到端流程 | Cypress / Playwright | 全栈开发者 |
| 手动测试 | 完整用户场景 | 人工操作 | 全体 |

### 10.2 测试用例（关键场景）

| # | 场景 | 步骤 | 预期结果 |
|---|------|------|----------|
| TC-01 | 用户注册 | POST /api/auth/register | 返回用户信息，密码加密存储 |
| TC-02 | 用户登录 | POST /api/auth/login | 返回 JWT Token |
| TC-03 | 无 Token 访问 | GET /api/tasks 无 Authorization | 返回 401 |
| TC-04 | 文本输入解析 | 提交一段课程公告 | 返回 inputId + jobId，最终任务生成 |
| TC-05 | 图片上传 OCR | 上传通知截图 | 识别文字，生成任务 |
| TC-06 | PDF 上传解析 | 上传 PDF 通知 | 提取文本，生成任务 |
| TC-07 | 任务状态流转 | 创建 → TODO → DOING → DONE | 状态更新正确 |
| TC-08 | 检查清单 | 添加、勾选、删除 | 操作正确 |
| TC-09 | 时间轴查询 | 按日期范围查询事件 | 返回正确事件列表 |
| TC-10 | 提醒触发 | 设置 1 分钟后提醒 | 1 分钟后生成通知 |
| TC-11 | Android 通知同步 | 拉取 pending-local 提醒 | 返回待注册提醒列表 |
| TC-12 | 数据隔离 | 用户 A 查看不到用户 B 的任务 | 返回空 |

### 10.3 测试数据

```sql
-- 测试用户
INSERT INTO user (username, password_hash, nickname) VALUES
('test_student', '$2a$10$...', '测试学生');

-- 测试输入
INSERT INTO source_input (user_id, source_type, original_text, status) VALUES
(1, 'TEXT', '请各组于6月28日18:00前提交项目需求文档和数据库设计文档，7月1日进行课堂展示。', 'COMPLETED');

-- 测试任务（由 AI 解析生成）
INSERT INTO task (user_id, source_input_id, title, deadline, priority, status) VALUES
(1, 1, '提交项目需求文档', '2026-06-28 18:00:00', 'URGENT', 'TODO'),
(1, 1, '提交数据库设计文档', '2026-06-28 18:00:00', 'URGENT', 'TODO'),
(1, 1, '准备课堂展示', '2026-07-01 09:00:00', 'HIGH', 'TODO');
```

---

## 11. 部署方案

### 11.1 部署架构

```
用户 ──HTTPS──► Nginx (80/443)
                   │
          ┌────────┴────────┐
          ▼                  ▼
    React 静态文件       Spring Boot
    /usr/share/nginx/    :8080/api/*
          │
          │
          ▼
    PaddleOCR 服务 (Docker)
    :8000/ocr/*
          │
          ▼
    MySQL :3306
```

### 11.2 部署步骤

```bash
# 1. 构建前端
cd frontend
npm install
npm run build  # 输出到 dist/

# 2. 构建后端
cd backend
./mvnw clean package -DskipTests
# 输出 target/planflow-backend.jar

# 3. 使用 Docker Compose 部署
cd ..
docker-compose up -d
```

### 11.3 docker-compose.yml

```yaml
version: '3.8'
services:
  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./frontend/dist:/usr/share/nginx/html
      - ./nginx.conf:/etc/nginx/conf.d/default.conf
    depends_on:
      - backend

  backend:
    build: ./backend
    ports:
      - "8080:8080"
    environment:
      - DB_PASSWORD=${DB_PASSWORD}
      - JWT_SECRET=${JWT_SECRET}
      - DEEPSEEK_API_KEY=${DEEPSEEK_API_KEY}
    volumes:
      - ./uploads:/app/uploads
    depends_on:
      mysql:
        condition: service_healthy

  ocr-service:
    build: ./ocr-service
    ports:
      - "8000:8000"
    deploy:
      resources:
        reservations:
          devices:
            - driver: nvidia
              count: 1
              capabilities: [gpu]  # 可选，有 GPU 则加速

  mysql:
    image: mysql:8.0
    ports:
      - "3306:3306"
    environment:
      - MYSQL_ROOT_PASSWORD=${DB_PASSWORD}
      - MYSQL_DATABASE=planflow
    volumes:
      - mysql-data:/var/lib/mysql
      - ./backend/src/main/resources/schema.sql:/docker-entrypoint-initdb.d/schema.sql
    healthcheck:
      test: ["CMD", "mysqladmin", "ping", "-h", "localhost"]
      interval: 10s
      timeout: 5s
      retries: 5

volumes:
  mysql-data:
```

### 11.4 环境变量清单

| 变量名 | 说明 | 示例 |
|--------|------|------|
| `DB_PASSWORD` | MySQL 密码 | `planflow123` |
| `JWT_SECRET` | JWT 签名密钥 | `随机64位字符串` |
| `DEEPSEEK_API_KEY` | DeepSeek API Key | `sk-xxx` |
| `QWEN_API_KEY` | Qwen API Key（可选） | `sk-xxx` |
| `OCR_SERVICE_URL` | OCR 服务地址 | `http://ocr-service:8000/ocr/image` |

---

## 附录：答辩演示脚本

### 演示 1：自然语言输入（3 分钟）

```
1. 打开浏览器访问 Web 端。
2. 输入用户名密码登录。
3. 在首页快速输入框中输入：
   "下周五前把软件项目立项书写完，要包括项目背景、需求分析、功能模块和技术路线，
   周三先做一个初稿，下周三课堂答辩。"
4. 点击"解析"按钮。
5. 展示解析进度页：上传 → 文本提取 → AI 解析 → 任务生成。
6. 解析完成后点击"查看生成结果"。
7. 展示：
   - 自动生成的任务列表（撰写立项书、完成初稿、准备答辩）
   - 每项任务都有明确的截止时间
   - 自动生成了检查清单（是否包含背景、需求、功能模块、技术路线...）
   - 时间轴上标注了初稿截止、立项书截止、答辩时间
   - 提醒规则（截止前一天、前3小时、当天早上）
```

### 演示 2：图片 OCR（2 分钟）

```
1. 点击"上传"按钮，选择一张课程通知截图。
2. 系统上传图片，展示解析进度（上传 → OCR → AI 解析 → 任务生成）。
3. 完成后展示 OCR 识别出的文字原文。
4. 展示 AI 根据 OCR 文字生成的任务。
5. 打开任务详情，展示"来源原文证据"字段。
```

### 演示 3：任务管理（2 分钟）

```
1. 打开任务列表，展示多个来源的任务混合展示。
2. 筛选"今天"任务。
3. 标记一个任务为"已完成"。
4. 展示检查清单勾选操作。
5. 修改一个任务的优先级。
```

### 演示 4：时间轴与提醒（2 分钟）

```
1. 打开时间轴页面，展示按天分组的事件。
2. 点击一个事件，跳转到任务详情。
3. 展示通知中心，有未读通知。
4. 标记已读。
5. 切换到 Android APK：
   - 打开 APK，登录相同账号。
   - 展示同步的提醒规则。
   - 设置一个 2 分钟后的测试提醒。
   - 等待通知弹出。
   - 点击通知进入 App。
```

### 演示 5：总结（1 分钟）

```
总结 PlanFlow AI 的核心价值：
1. 非结构化信息 → 结构化任务（OCR + AI）
2. 多来源信息统一管理
3. Web + Android 双端覆盖
4. 智能提醒 + 自动检查清单
5. 模块化架构，可扩展提醒渠道
```

---

> *本文档是项目设计和开发的核心参考，将随开发推进持续更新。*
