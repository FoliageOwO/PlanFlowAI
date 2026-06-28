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
        addTimelineSourceEvidenceColumn();
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
