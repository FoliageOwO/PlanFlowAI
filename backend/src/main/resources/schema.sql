-- PlanFlowAI Database Schema
-- MySQL 8.0+ / InnoDB / utf8mb4

CREATE DATABASE IF NOT EXISTS planflow DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE planflow;

-- 1. 用户表
CREATE TABLE IF NOT EXISTS `user` (
    `id` BIGINT NOT NULL AUTO_INCREMENT COMMENT '主键ID',
    `username` VARCHAR(50) NOT NULL COMMENT '用户名',
    `password_hash` VARCHAR(255) NOT NULL COMMENT '密码哈希(BCrypt)',
    `nickname` VARCHAR(100) DEFAULT NULL COMMENT '昵称',
    `email` VARCHAR(255) DEFAULT NULL COMMENT '邮箱',
    `avatar_url` VARCHAR(500) DEFAULT NULL COMMENT '头像URL',
    `status` TINYINT NOT NULL DEFAULT 1 COMMENT '状态 0-禁用 1-正常',
    `role` VARCHAR(20) NOT NULL DEFAULT 'USER' COMMENT '角色 USER/ADMIN',
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_username` (`username`),
    KEY `idx_email` (`email`),
    KEY `idx_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='用户表';

-- 2. 用户设置表
CREATE TABLE IF NOT EXISTS `user_setting` (
    `id` BIGINT NOT NULL AUTO_INCREMENT COMMENT '主键ID',
    `user_id` BIGINT NOT NULL COMMENT '用户ID',
    `default_reminder_json` JSON DEFAULT NULL COMMENT '默认提醒配置JSON',
    `enable_in_app_notification` TINYINT NOT NULL DEFAULT 1 COMMENT '启用应用内通知',
    `enable_local_notification` TINYINT NOT NULL DEFAULT 0 COMMENT '启用本地通知',
    `enable_browser_notification` TINYINT NOT NULL DEFAULT 0 COMMENT '启用浏览器通知',
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_user_id` (`user_id`),
    CONSTRAINT `fk_setting_user` FOREIGN KEY (`user_id`) REFERENCES `user` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='用户设置表';

-- 3. 源输入表（用户上传的原始材料）
CREATE TABLE IF NOT EXISTS `source_input` (
    `id` BIGINT NOT NULL AUTO_INCREMENT COMMENT '主键ID',
    `user_id` BIGINT NOT NULL COMMENT '用户ID',
    `source_type` VARCHAR(20) NOT NULL COMMENT '来源类型 TEXT/IMAGE/PDF/DOCX',
    `title` VARCHAR(255) DEFAULT NULL COMMENT '标题',
    `original_name` VARCHAR(500) DEFAULT NULL COMMENT '原始文件名',
    `file_path` VARCHAR(1000) DEFAULT NULL COMMENT '文件存储路径',
    `file_size` BIGINT DEFAULT NULL COMMENT '文件大小(字节)',
    `mime_type` VARCHAR(100) DEFAULT NULL COMMENT 'MIME类型',
    `original_text` TEXT DEFAULT NULL COMMENT '原始文本内容(用户输入)',
    `raw_text` TEXT DEFAULT NULL COMMENT 'OCR/提取后的原始文本',
    `status` VARCHAR(20) NOT NULL DEFAULT 'CREATED' COMMENT '状态 CREATED/EXTRACTING/ANALYZING/COMPLETED/FAILED',
    `error_message` TEXT DEFAULT NULL COMMENT '错误信息',
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    PRIMARY KEY (`id`),
    KEY `idx_user_id` (`user_id`),
    KEY `idx_status` (`status`),
    KEY `idx_created_at` (`created_at`),
    CONSTRAINT `fk_source_input_user` FOREIGN KEY (`user_id`) REFERENCES `user` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='源输入表';

-- 4. 解析任务表
CREATE TABLE IF NOT EXISTS `parse_job` (
    `id` BIGINT NOT NULL AUTO_INCREMENT COMMENT '主键ID',
    `user_id` BIGINT NOT NULL COMMENT '用户ID',
    `source_input_id` BIGINT NOT NULL COMMENT '源输入ID',
    `status` VARCHAR(20) NOT NULL DEFAULT 'PENDING' COMMENT '状态 PENDING/RUNNING/COMPLETED/FAILED/CANCELLED',
    `stage` VARCHAR(50) DEFAULT NULL COMMENT '当前阶段',
    `progress` INT NOT NULL DEFAULT 0 COMMENT '进度 0-100',
    `retry_count` INT NOT NULL DEFAULT 0 COMMENT '重试次数',
    `error_message` TEXT DEFAULT NULL COMMENT '错误信息',
    `started_at` DATETIME DEFAULT NULL COMMENT '开始时间',
    `finished_at` DATETIME DEFAULT NULL COMMENT '完成时间',
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    PRIMARY KEY (`id`),
    KEY `idx_user_id` (`user_id`),
    KEY `idx_source_input_id` (`source_input_id`),
    KEY `idx_status` (`status`),
    CONSTRAINT `fk_parse_job_user` FOREIGN KEY (`user_id`) REFERENCES `user` (`id`) ON DELETE CASCADE,
    CONSTRAINT `fk_parse_job_source` FOREIGN KEY (`source_input_id`) REFERENCES `source_input` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='解析任务表';

-- 5. AI 分析结果表
CREATE TABLE IF NOT EXISTS `ai_analysis_result` (
    `id` BIGINT NOT NULL AUTO_INCREMENT COMMENT '主键ID',
    `user_id` BIGINT NOT NULL COMMENT '用户ID',
    `source_input_id` BIGINT NOT NULL COMMENT '源输入ID',
    `model_name` VARCHAR(100) DEFAULT NULL COMMENT '模型名称',
    `prompt_text` TEXT DEFAULT NULL COMMENT '提示词文本',
    `raw_response` TEXT DEFAULT NULL COMMENT '原始响应',
    `parsed_json` JSON DEFAULT NULL COMMENT '解析后的JSON',
    `summary` TEXT DEFAULT NULL COMMENT '摘要',
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    PRIMARY KEY (`id`),
    KEY `idx_user_id` (`user_id`),
    KEY `idx_source_input_id` (`source_input_id`),
    CONSTRAINT `fk_ai_result_user` FOREIGN KEY (`user_id`) REFERENCES `user` (`id`) ON DELETE CASCADE,
    CONSTRAINT `fk_ai_result_source` FOREIGN KEY (`source_input_id`) REFERENCES `source_input` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='AI分析结果表';

-- 6. 任务表
CREATE TABLE IF NOT EXISTS `task` (
    `id` BIGINT NOT NULL AUTO_INCREMENT COMMENT '主键ID',
    `user_id` BIGINT NOT NULL COMMENT '用户ID',
    `source_input_id` BIGINT DEFAULT NULL COMMENT '源输入ID',
    `title` VARCHAR(255) NOT NULL COMMENT '任务标题',
    `description` TEXT DEFAULT NULL COMMENT '任务描述',
    `task_type` VARCHAR(20) NOT NULL DEFAULT 'AI_EXTRACTED' COMMENT '任务类型 AI_EXTRACTED/MANUAL',
    `priority` VARCHAR(10) NOT NULL DEFAULT 'MEDIUM' COMMENT '优先级 LOW/MEDIUM/HIGH/URGENT',
    `status` VARCHAR(20) NOT NULL DEFAULT 'TODO' COMMENT '状态 TODO/DOING/DONE/CANCELLED',
    `deadline` DATETIME DEFAULT NULL COMMENT '截止时间',
    `estimated_minutes` INT DEFAULT NULL COMMENT '预估分钟数',
    `constraints_json` JSON DEFAULT NULL COMMENT '约束条件JSON',
    `checklist_json` JSON DEFAULT NULL COMMENT '检查项JSON(冗余)',
    `source_evidence` JSON DEFAULT NULL COMMENT '来源证据JSON',
    `created_by` VARCHAR(50) DEFAULT NULL COMMENT '创建者',
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    PRIMARY KEY (`id`),
    KEY `idx_user_id` (`user_id`),
    KEY `idx_source_input_id` (`source_input_id`),
    KEY `idx_status` (`status`),
    KEY `idx_priority` (`priority`),
    KEY `idx_deadline` (`deadline`),
    CONSTRAINT `fk_task_user` FOREIGN KEY (`user_id`) REFERENCES `user` (`id`) ON DELETE CASCADE,
    CONSTRAINT `fk_task_source` FOREIGN KEY (`source_input_id`) REFERENCES `source_input` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='任务表';

-- 7. 任务检查项表
CREATE TABLE IF NOT EXISTS `task_checklist_item` (
    `id` BIGINT NOT NULL AUTO_INCREMENT COMMENT '主键ID',
    `user_id` BIGINT NOT NULL COMMENT '用户ID',
    `task_id` BIGINT NOT NULL COMMENT '任务ID',
    `content` VARCHAR(500) NOT NULL COMMENT '检查项内容',
    `checked` TINYINT NOT NULL DEFAULT 0 COMMENT '是否完成 0-否 1-是',
    `sort_order` INT NOT NULL DEFAULT 0 COMMENT '排序序号',
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    PRIMARY KEY (`id`),
    KEY `idx_user_id` (`user_id`),
    KEY `idx_task_id` (`task_id`),
    CONSTRAINT `fk_checklist_user` FOREIGN KEY (`user_id`) REFERENCES `user` (`id`) ON DELETE CASCADE,
    CONSTRAINT `fk_checklist_task` FOREIGN KEY (`task_id`) REFERENCES `task` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='任务检查项表';

-- 8. 时间线事件表
CREATE TABLE IF NOT EXISTS `timeline_event` (
    `id` BIGINT NOT NULL AUTO_INCREMENT COMMENT '主键ID',
    `user_id` BIGINT NOT NULL COMMENT '用户ID',
    `source_input_id` BIGINT DEFAULT NULL COMMENT '源输入ID',
    `task_id` BIGINT DEFAULT NULL COMMENT '任务ID',
    `title` VARCHAR(255) NOT NULL COMMENT '事件标题',
    `event_type` VARCHAR(20) NOT NULL COMMENT '事件类型 TASK_DEADLINE/EVENT/PLAN_STEP/REMINDER',
    `start_time` DATETIME NOT NULL COMMENT '开始时间',
    `end_time` DATETIME DEFAULT NULL COMMENT '结束时间',
    `location` VARCHAR(500) DEFAULT NULL COMMENT '地点',
    `description` TEXT DEFAULT NULL COMMENT '事件描述',
    `source_evidence` JSON DEFAULT NULL COMMENT '来源证据JSON',
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    PRIMARY KEY (`id`),
    KEY `idx_user_id` (`user_id`),
    KEY `idx_source_input_id` (`source_input_id`),
    KEY `idx_task_id` (`task_id`),
    KEY `idx_event_type` (`event_type`),
    KEY `idx_start_time` (`start_time`),
    CONSTRAINT `fk_timeline_user` FOREIGN KEY (`user_id`) REFERENCES `user` (`id`) ON DELETE CASCADE,
    CONSTRAINT `fk_timeline_source` FOREIGN KEY (`source_input_id`) REFERENCES `source_input` (`id`) ON DELETE SET NULL,
    CONSTRAINT `fk_timeline_task` FOREIGN KEY (`task_id`) REFERENCES `task` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='时间线事件表';

-- 9. 提醒规则表
CREATE TABLE IF NOT EXISTS `reminder_rule` (
    `id` BIGINT NOT NULL AUTO_INCREMENT COMMENT '主键ID',
    `user_id` BIGINT NOT NULL COMMENT '用户ID',
    `task_id` BIGINT DEFAULT NULL COMMENT '任务ID',
    `event_id` BIGINT DEFAULT NULL COMMENT '事件ID',
    `title` VARCHAR(255) NOT NULL COMMENT '提醒标题',
    `content` TEXT DEFAULT NULL COMMENT '提醒内容',
    `remind_at` DATETIME NOT NULL COMMENT '提醒时间',
    `channel` VARCHAR(20) NOT NULL DEFAULT 'IN_APP' COMMENT '提醒渠道 IN_APP/LOCAL_APP/BROWSER/EMAIL',
    `status` VARCHAR(20) NOT NULL DEFAULT 'PENDING' COMMENT '状态 PENDING/SENT/FAILED/CANCELLED',
    `local_notification_id` VARCHAR(255) DEFAULT NULL COMMENT '本地通知ID',
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    PRIMARY KEY (`id`),
    KEY `idx_user_id` (`user_id`),
    KEY `idx_task_id` (`task_id`),
    KEY `idx_event_id` (`event_id`),
    KEY `idx_remind_at` (`remind_at`),
    KEY `idx_status` (`status`),
    CONSTRAINT `fk_reminder_user` FOREIGN KEY (`user_id`) REFERENCES `user` (`id`) ON DELETE CASCADE,
    CONSTRAINT `fk_reminder_task` FOREIGN KEY (`task_id`) REFERENCES `task` (`id`) ON DELETE CASCADE,
    CONSTRAINT `fk_reminder_event` FOREIGN KEY (`event_id`) REFERENCES `timeline_event` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='提醒规则表';

-- 10. 通知表
CREATE TABLE IF NOT EXISTS `notification` (
    `id` BIGINT NOT NULL AUTO_INCREMENT COMMENT '主键ID',
    `user_id` BIGINT NOT NULL COMMENT '用户ID',
    `task_id` BIGINT DEFAULT NULL COMMENT '任务ID',
    `reminder_rule_id` BIGINT DEFAULT NULL COMMENT '提醒规则ID',
    `title` VARCHAR(255) NOT NULL COMMENT '通知标题',
    `content` TEXT DEFAULT NULL COMMENT '通知内容',
    `type` VARCHAR(30) NOT NULL COMMENT '通知类型 DEADLINE_SOON/TASK_OVERDUE/SYSTEM/PARSE_COMPLETED/PARSE_FAILED',
    `read_status` VARCHAR(10) NOT NULL DEFAULT 'UNREAD' COMMENT '阅读状态 UNREAD/READ',
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    `read_at` DATETIME DEFAULT NULL COMMENT '阅读时间',
    PRIMARY KEY (`id`),
    KEY `idx_user_id` (`user_id`),
    KEY `idx_task_id` (`task_id`),
    KEY `idx_reminder_rule_id` (`reminder_rule_id`),
    KEY `idx_read_status` (`read_status`),
    KEY `idx_type` (`type`),
    CONSTRAINT `fk_notification_user` FOREIGN KEY (`user_id`) REFERENCES `user` (`id`) ON DELETE CASCADE,
    CONSTRAINT `fk_notification_task` FOREIGN KEY (`task_id`) REFERENCES `task` (`id`) ON DELETE SET NULL,
    CONSTRAINT `fk_notification_reminder` FOREIGN KEY (`reminder_rule_id`) REFERENCES `reminder_rule` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='通知表';

-- 11. 设备同步记录表
CREATE TABLE IF NOT EXISTS `device_sync_record` (
    `id` BIGINT NOT NULL AUTO_INCREMENT COMMENT '主键ID',
    `user_id` BIGINT NOT NULL COMMENT '用户ID',
    `device_id` VARCHAR(255) NOT NULL COMMENT '设备ID',
    `last_sync_at` DATETIME NOT NULL COMMENT '最后同步时间',
    `app_platform` VARCHAR(20) DEFAULT NULL COMMENT '应用平台 iOS/Android/Web',
    `app_version` VARCHAR(20) DEFAULT NULL COMMENT '应用版本',
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    PRIMARY KEY (`id`),
    KEY `idx_user_id` (`user_id`),
    KEY `idx_device_id` (`device_id`),
    KEY `idx_last_sync_at` (`last_sync_at`),
    CONSTRAINT `fk_device_sync_user` FOREIGN KEY (`user_id`) REFERENCES `user` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='设备同步记录表';

-- ============================================================
-- Seed Data: 默认账号
-- ============================================================

-- 管理员: admin / admin123
INSERT IGNORE INTO `user` (`username`, `password_hash`, `nickname`, `role`, `status`)
VALUES ('admin', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', '管理员', 'ADMIN', 1);

-- 普通用户: test / test123
INSERT IGNORE INTO `user` (`username`, `password_hash`, `nickname`, `role`, `status`)
VALUES ('test', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', '测试用户', 'USER', 1);
