package com.planflow.controller;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.planflow.common.ApiResponse;
import com.planflow.common.ErrorCode;
import com.planflow.common.SecurityUtils;
import com.planflow.config.PlanFlowProperties;
import com.planflow.entity.SourceInput;
import com.planflow.entity.Task;
import com.planflow.entity.User;
import com.planflow.entity.ParseJob;
import com.planflow.repository.ParseJobMapper;
import com.planflow.repository.SourceInputMapper;
import com.planflow.repository.TaskMapper;
import com.planflow.repository.UserMapper;
import com.planflow.service.AiConfigService;
import com.planflow.service.SettingService;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.client.RestTemplate;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/admin")
@RequiredArgsConstructor
public class AdminController {

    private final UserMapper userMapper;
    private final TaskMapper taskMapper;
    private final SourceInputMapper sourceInputMapper;
    private final ParseJobMapper parseJobMapper;
    private final SecurityUtils securityUtils;
    private final PlanFlowProperties planFlowProperties;
    private final JdbcTemplate jdbcTemplate;
    private final SettingService settingService;
    private final AiConfigService aiConfigService;
    private final RestTemplate restTemplate = new RestTemplate();

    private void checkAdmin() {
        String username = securityUtils.getCurrentUsername();
        User user = userMapper.selectOne(new LambdaQueryWrapper<User>().eq(User::getUsername, username));
        if (user == null || !"ADMIN".equals(user.getRole())) {
            throw new RuntimeException("无管理员权限");
        }
    }

    @GetMapping("/stats")
    public ApiResponse getStats() {
        checkAdmin();
        LocalDateTime todayStart = LocalDate.now().atStartOfDay();
        long userCount = userMapper.selectCount(null);
        long taskCount = taskMapper.selectCount(null);
        long sourceInputCount = sourceInputMapper.selectCount(null);
        long doneTaskCount = taskMapper.selectCount(
                new LambdaQueryWrapper<Task>().eq(Task::getStatus, "DONE"));
        long todayRegistrations = userMapper.selectCount(
                new LambdaQueryWrapper<User>().ge(User::getCreatedAt, todayStart));
        long todayParseJobs = parseJobMapper.selectCount(
                new LambdaQueryWrapper<ParseJob>().ge(ParseJob::getCreatedAt, todayStart));
        long todaySuccessCount = parseJobMapper.selectCount(
                new LambdaQueryWrapper<ParseJob>()
                        .ge(ParseJob::getCreatedAt, todayStart)
                        .eq(ParseJob::getStatus, "COMPLETED"));
        long todayFailCount = parseJobMapper.selectCount(
                new LambdaQueryWrapper<ParseJob>()
                        .ge(ParseJob::getCreatedAt, todayStart)
                        .eq(ParseJob::getStatus, "FAILED"));

        Page<ParseJob> recentJobPage = parseJobMapper.selectPage(
                new Page<>(1, 10),
                new LambdaQueryWrapper<ParseJob>().orderByDesc(ParseJob::getCreatedAt));
        List<Map<String, Object>> recentJobs = new ArrayList<>();
        for (ParseJob job : recentJobPage.getRecords()) {
            User user = userMapper.selectById(job.getUserId());
            SourceInput sourceInput = sourceInputMapper.selectById(job.getSourceInputId());
            Map<String, Object> item = new HashMap<>();
            item.put("id", job.getId());
            item.put("userName", user != null ? user.getNickname() : "未知用户");
            item.put("sourceType", sourceInput != null ? sourceInput.getSourceType() : "UNKNOWN");
            item.put("status", job.getStatus());
            item.put("createdAt", job.getCreatedAt());
            recentJobs.add(item);
        }

        Map<String, Object> systemHealth = new HashMap<>();
        systemHealth.put("api", true);
        systemHealth.put("database", isDatabaseHealthy());
        systemHealth.put("ocr", isOcrHealthy());
        systemHealth.put("ai", Boolean.TRUE.equals(settingService.getAiStatus().get("ready")));

        Map<String, Object> stats = new HashMap<>();
        stats.put("userCount", userCount);
        stats.put("taskCount", taskCount);
        stats.put("sourceInputCount", sourceInputCount);
        stats.put("doneTaskCount", doneTaskCount);
        stats.put("todayRegistrations", todayRegistrations);
        stats.put("todayParseJobs", todayParseJobs);
        stats.put("todaySuccessCount", todaySuccessCount);
        stats.put("todayFailCount", todayFailCount);
        stats.put("systemHealth", systemHealth);
        stats.put("recentJobs", recentJobs);
        return ApiResponse.success(stats);
    }

    @GetMapping("/users")
    public ApiResponse getUsers(@RequestParam(defaultValue = "1") int page,
                                 @RequestParam(defaultValue = "20") int size,
                                 @RequestParam(required = false) String keyword,
                                 @RequestParam(required = false) String search) {
        checkAdmin();
        Page<User> pageParam = new Page<>(page, size);
        LambdaQueryWrapper<User> wrapper = new LambdaQueryWrapper<>();
        String query = keyword != null && !keyword.isBlank() ? keyword : search;
        if (query != null && !query.isBlank()) {
            wrapper.and(w -> w.like(User::getUsername, query).or().like(User::getNickname, query));
        }
        wrapper.orderByDesc(User::getCreatedAt);
        Page<User> result = userMapper.selectPage(pageParam, wrapper);
        Map<String, Object> data = new HashMap<>();
        data.put("list", result.getRecords().stream().map(this::toAdminUserItem).toList());
        data.put("total", result.getTotal());
        return ApiResponse.success(data);
    }

    @PutMapping("/users/{id}/toggle")
    public ApiResponse toggleUserStatus(@PathVariable Long id) {
        checkAdmin();
        User user = userMapper.selectById(id);
        if (user == null) return ApiResponse.error(ErrorCode.NOT_FOUND, "用户不存在");
        Integer currentStatus = user.getStatus();
        user.setStatus(currentStatus != null && currentStatus == 1 ? 0 : 1);
        userMapper.updateById(user);
        Map<String, Object> toggleResult = new HashMap<>();
        toggleResult.put("id", String.valueOf(id));
        toggleResult.put("status", toUserStatus(user.getStatus()));
        return ApiResponse.success(toggleResult);
    }

    @GetMapping("/notification-config")
    public ApiResponse getNotificationConfig() {
        checkAdmin();
        return ApiResponse.success(loadNotificationConfig());
    }

    @PatchMapping("/notification-config")
    public ApiResponse updateNotificationConfig(@RequestBody Map<String, Object> updates) {
        checkAdmin();
        Map<String, Object> current = loadNotificationConfig();
        for (String key : current.keySet()) {
            if (updates.containsKey(key)) {
                upsertSystemConfig(notificationConfigStorageKey(key), valueToString(updates.get(key)), notificationConfigDescription(key));
            }
        }
        return ApiResponse.success(loadNotificationConfig());
    }

    @GetMapping("/ai-config")
    public ApiResponse getAiConfig() {
        checkAdmin();
        return ApiResponse.success(aiConfigService.getConfig());
    }

    @PatchMapping("/ai-config")
    public ApiResponse updateAiConfig(@RequestBody Map<String, Object> updates) {
        checkAdmin();
        aiConfigService.updateConfig(updates);
        return ApiResponse.success(aiConfigService.getConfig());
    }

    private Map<String, Object> toAdminUserItem(User user) {
        Map<String, Object> item = new HashMap<>();
        item.put("id", String.valueOf(user.getId()));
        item.put("username", user.getUsername());
        item.put("nickname", user.getNickname());
        item.put("email", user.getEmail());
        item.put("role", user.getRole() != null ? user.getRole() : "USER");
        item.put("status", toUserStatus(user.getStatus()));
        item.put("createdAt", user.getCreatedAt());
        return item;
    }

    private String toUserStatus(Integer status) {
        return status != null && status == 1 ? "ACTIVE" : "DISABLED";
    }

    private Map<String, Object> loadNotificationConfig() {
        Map<String, Object> config = new HashMap<>();
        config.put("smtpEnabled", getSystemConfig("notification.smtp.enabled", "false"));
        config.put("smtpHost", getSystemConfig("notification.smtp.host", ""));
        config.put("smtpPort", getSystemConfig("notification.smtp.port", "465"));
        config.put("smtpSecurity", getSystemConfig("notification.smtp.security", "SSL"));
        config.put("smtpUsername", getSystemConfig("notification.smtp.username", ""));
        config.put("smtpPassword", getSystemConfig("notification.smtp.password", ""));
        config.put("smtpFrom", getSystemConfig("notification.smtp.from", ""));
        config.put("smsEnabled", getSystemConfig("notification.sms.enabled", "false"));
        config.put("smsProvider", getSystemConfig("notification.sms.provider", "aliyun"));
        config.put("smsAccessKeyId", getSystemConfig("notification.sms.access-key-id", ""));
        config.put("smsAccessKeySecret", getSystemConfig("notification.sms.access-key-secret", ""));
        config.put("smsSignName", getSystemConfig("notification.sms.sign-name", ""));
        config.put("smsTemplateCode", getSystemConfig("notification.sms.template-code", ""));
        return config;
    }

    private String getSystemConfig(String key, String defaultValue) {
        List<String> values = jdbcTemplate.query(
                "SELECT config_value FROM system_config WHERE config_key = ?",
                (rs, rowNum) -> rs.getString("config_value"),
                key);
        return values.isEmpty() ? defaultValue : values.get(0);
    }

    private void upsertSystemConfig(String key, String value, String description) {
        Integer count = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM system_config WHERE config_key = ?",
                Integer.class,
                key);
        if (count != null && count > 0) {
            jdbcTemplate.update(
                    "UPDATE system_config SET config_value = ?, description = ?, updated_at = CURRENT_TIMESTAMP WHERE config_key = ?",
                    value, description, key);
        } else {
            jdbcTemplate.update(
                    "INSERT INTO system_config (config_key, config_value, description) VALUES (?, ?, ?)",
                    key, value, description);
        }
    }

    private String valueToString(Object value) {
        return value == null ? "" : String.valueOf(value);
    }

    private String notificationConfigDescription(String key) {
        return switch (key) {
            case "smtpEnabled" -> "是否启用邮件通知通道";
            case "smtpHost" -> "SMTP 服务器地址";
            case "smtpPort" -> "SMTP 服务器端口";
            case "smtpSecurity" -> "SMTP 加密方式";
            case "smtpUsername" -> "SMTP 用户名";
            case "smtpPassword" -> "SMTP 密码";
            case "smtpFrom" -> "发件邮箱";
            case "smsEnabled" -> "是否启用短信通知通道";
            case "smsProvider" -> "短信服务商";
            case "smsAccessKeyId" -> "短信 AccessKey ID";
            case "smsAccessKeySecret" -> "短信 AccessKey Secret";
            case "smsSignName" -> "短信签名";
            case "smsTemplateCode" -> "短信模板 Code";
            default -> "通知通道配置";
        };
    }

    private String notificationConfigStorageKey(String key) {
        return switch (key) {
            case "smtpEnabled" -> "notification.smtp.enabled";
            case "smtpHost" -> "notification.smtp.host";
            case "smtpPort" -> "notification.smtp.port";
            case "smtpSecurity" -> "notification.smtp.security";
            case "smtpUsername" -> "notification.smtp.username";
            case "smtpPassword" -> "notification.smtp.password";
            case "smtpFrom" -> "notification.smtp.from";
            case "smsEnabled" -> "notification.sms.enabled";
            case "smsProvider" -> "notification.sms.provider";
            case "smsAccessKeyId" -> "notification.sms.access-key-id";
            case "smsAccessKeySecret" -> "notification.sms.access-key-secret";
            case "smsSignName" -> "notification.sms.sign-name";
            case "smsTemplateCode" -> "notification.sms.template-code";
            default -> key;
        };
    }

    private boolean isDatabaseHealthy() {
        try {
            Integer result = jdbcTemplate.queryForObject("SELECT 1", Integer.class);
            return result != null && result == 1;
        } catch (Exception e) {
            return false;
        }
    }

    private boolean isOcrHealthy() {
        if (!planFlowProperties.getOcr().isEnabled()) return false;
        try {
            String serviceUrl = planFlowProperties.getOcr().getServiceUrl();
            String healthUrl = serviceUrl.replaceFirst("/ocr/image$", "/health");
            restTemplate.getForObject(healthUrl, Map.class);
            return true;
        } catch (Exception e) {
            return false;
        }
    }
}
