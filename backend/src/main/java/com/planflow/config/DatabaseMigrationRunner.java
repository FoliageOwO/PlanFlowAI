package com.planflow.config;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

import javax.sql.DataSource;
import java.sql.Connection;
import java.sql.ResultSet;

@Slf4j
@Component
@RequiredArgsConstructor
public class DatabaseMigrationRunner implements CommandLineRunner {

    private final DataSource dataSource;
    private final JdbcTemplate jdbcTemplate;

    @Override
    public void run(String... args) {
        createSystemConfigTable();
        addTimelineSourceEvidenceColumn();
        addNotificationSettingColumns();
    }

    private void createSystemConfigTable() {
        try {
            jdbcTemplate.execute("""
                    CREATE TABLE IF NOT EXISTS system_config (
                        id BIGINT AUTO_INCREMENT PRIMARY KEY,
                        config_key VARCHAR(100) NOT NULL UNIQUE,
                        config_value TEXT DEFAULT NULL,
                        description VARCHAR(255) DEFAULT NULL,
                        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
                    )
                    """);
        } catch (Exception e) {
            throw new IllegalStateException("Failed to create system_config table", e);
        }
    }

    private void addTimelineSourceEvidenceColumn() {
        try {
            if (!tableExists("timeline_event")) {
                log.debug("Skip timeline_event.source_evidence migration because timeline_event table does not exist");
                return;
            }
            if (columnExists("timeline_event", "source_evidence")) {
                log.debug("timeline_event.source_evidence column already exists");
                return;
            }
            jdbcTemplate.execute("""
                    ALTER TABLE timeline_event
                    ADD COLUMN source_evidence JSON DEFAULT NULL COMMENT '来源证据JSON'
                    AFTER description
                    """);
            log.info("Added timeline_event.source_evidence column");
        } catch (Exception e) {
            String message = e.getMessage() == null ? "" : e.getMessage();
            if (message.contains("Duplicate column name") || message.contains("source_evidence")) {
                log.debug("timeline_event.source_evidence column already exists");
                return;
            }
            throw new IllegalStateException("Failed to migrate timeline_event.source_evidence", e);
        }
    }

    private void addNotificationSettingColumns() {
        addColumnIfMissing("user_setting", "enable_email_notification",
                "ALTER TABLE user_setting ADD COLUMN enable_email_notification TINYINT NOT NULL DEFAULT 0 COMMENT '启用邮件通知' AFTER enable_browser_notification");
        addColumnIfMissing("user_setting", "enable_sms_notification",
                "ALTER TABLE user_setting ADD COLUMN enable_sms_notification TINYINT NOT NULL DEFAULT 0 COMMENT '启用短信通知' AFTER enable_email_notification");
        addColumnIfMissing("user_setting", "enable_qq_notification",
                "ALTER TABLE user_setting ADD COLUMN enable_qq_notification TINYINT NOT NULL DEFAULT 0 COMMENT '启用QQ通知' AFTER enable_sms_notification");
        addColumnIfMissing("user_setting", "notification_email",
                "ALTER TABLE user_setting ADD COLUMN notification_email VARCHAR(255) DEFAULT NULL COMMENT '通知接收邮箱' AFTER enable_qq_notification");
        addColumnIfMissing("user_setting", "notification_phone",
                "ALTER TABLE user_setting ADD COLUMN notification_phone VARCHAR(50) DEFAULT NULL COMMENT '通知接收手机号' AFTER notification_email");
        addColumnIfMissing("user_setting", "notification_qq",
                "ALTER TABLE user_setting ADD COLUMN notification_qq VARCHAR(50) DEFAULT NULL COMMENT '通知接收QQ号' AFTER notification_phone");
    }

    private void addColumnIfMissing(String tableName, String columnName, String sql) {
        try {
            if (!tableExists(tableName)) {
                log.debug("Skip {}.{} migration because table does not exist", tableName, columnName);
                return;
            }
            if (columnExists(tableName, columnName)) {
                log.debug("{}.{} column already exists", tableName, columnName);
                return;
            }
            jdbcTemplate.execute(sql);
            log.info("Added {}.{} column", tableName, columnName);
        } catch (Exception e) {
            String message = e.getMessage() == null ? "" : e.getMessage();
            if (message.contains("Duplicate column name") || message.contains(columnName)) {
                log.debug("{}.{} column already exists", tableName, columnName);
                return;
            }
            throw new IllegalStateException("Failed to migrate " + tableName + "." + columnName, e);
        }
    }

    private boolean tableExists(String tableName) throws Exception {
        try (Connection connection = dataSource.getConnection();
             ResultSet result = connection.getMetaData().getTables(connection.getCatalog(), null, tableName, null)) {
            if (result.next()) return true;
        }
        try (Connection connection = dataSource.getConnection();
             ResultSet result = connection.getMetaData().getTables(connection.getCatalog(), null, tableName.toUpperCase(), null)) {
            return result.next();
        }
    }

    private boolean columnExists(String tableName, String columnName) throws Exception {
        try (Connection connection = dataSource.getConnection();
             ResultSet result = connection.getMetaData().getColumns(connection.getCatalog(), null, tableName, columnName)) {
            if (result.next()) return true;
        }
        try (Connection connection = dataSource.getConnection();
             ResultSet result = connection.getMetaData().getColumns(connection.getCatalog(), null, tableName.toUpperCase(), columnName.toUpperCase())) {
            return result.next();
        }
    }
}
