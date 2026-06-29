package com.planflow.notification;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.planflow.entity.Notification;
import com.planflow.entity.ReminderRule;
import com.planflow.entity.Task;
import com.planflow.entity.UserSetting;
import com.planflow.repository.ReminderRuleMapper;
import com.planflow.repository.TaskMapper;
import com.planflow.repository.UserSettingMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestTemplate;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Map;

@Slf4j
@Component
@RequiredArgsConstructor
public class QqNotificationChannel implements NotificationChannel {

    private static final DateTimeFormatter TIME_FORMATTER = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm");

    private final JdbcTemplate jdbcTemplate;
    private final UserSettingMapper userSettingMapper;
    private final ReminderRuleMapper reminderRuleMapper;
    private final TaskMapper taskMapper;
    private final RestTemplate restTemplate = new RestTemplate();

    @Override
    public String channelType() {
        return "qq";
    }

    @Override
    public boolean isEnabled(Long userId) {
        return true;
    }

    @Override
    public int getOrder() {
        return 20;
    }

    @Override
    public void send(Notification notification) {
        if (notification.getReminderRuleId() == null) return;
        ReminderRule rule = reminderRuleMapper.selectById(notification.getReminderRuleId());
        if (rule == null || !"QQ".equalsIgnoreCase(rule.getChannel())) return;

        if (!Boolean.parseBoolean(getConfig("notification.qq.enabled", "false"))) {
            throw new IllegalStateException("QQ channel is not enabled");
        }

        UserSetting setting = userSettingMapper.selectOne(new LambdaQueryWrapper<UserSetting>()
                .eq(UserSetting::getUserId, notification.getUserId()));
        if (setting == null
                || setting.getEnableQqNotification() == null
                || setting.getEnableQqNotification() != 1
                || setting.getNotificationQq() == null
                || setting.getNotificationQq().isBlank()) {
            throw new IllegalStateException("User QQ notification target is not configured");
        }

        String baseUrl = getRequiredConfig("notification.qq.base-url", "OneBot HTTP URL");
        String url = trimTrailingSlash(baseUrl) + "/send_private_msg";
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        String token = getConfig("notification.qq.bearer-token", "");
        if (token != null && !token.isBlank()) {
            headers.setBearerAuth(token.trim());
        }

        Map<String, Object> body = Map.of(
                "user_id", setting.getNotificationQq().trim(),
                "message", buildMessage(notification, rule)
        );
        restTemplate.postForObject(url, new HttpEntity<>(body, headers), String.class);
        log.info("QQ notification sent: notificationId={}, userId={}", notification.getId(), setting.getNotificationQq());
    }

    private String buildMessage(Notification notification, ReminderRule rule) {
        Task task = rule.getTaskId() == null ? null : taskMapper.selectById(rule.getTaskId());
        StringBuilder message = new StringBuilder();
        message.append("【PlanFlowAI 任务提醒】\n");
        message.append("标题：").append(valueOrDefault(notification.getTitle(), "任务提醒")).append("\n");
        message.append("提醒时间：").append(formatTime(rule.getRemindAt())).append("\n");
        message.append("发送时间：").append(formatTime(LocalDateTime.now())).append("\n");

        String content = notification.getContent() == null ? "" : notification.getContent().trim();
        if (!content.isBlank()) {
            message.append("\n内容：").append(content).append("\n");
        }

        if (task != null) {
            message.append("\n关联任务：").append(valueOrDefault(task.getTitle(), "未命名任务")).append("\n");
            message.append("优先级：").append(formatPriority(task.getPriority())).append("\n");
            message.append("状态：").append(formatStatus(task.getStatus())).append("\n");
            if (task.getDeadline() != null) {
                message.append("截止时间：").append(formatTime(task.getDeadline())).append("\n");
            }
        }
        return message.toString();
    }

    private String getRequiredConfig(String key, String label) {
        String value = getConfig(key, "");
        if (value == null || value.isBlank()) {
            throw new IllegalStateException(label + " is not configured");
        }
        return value.trim();
    }

    private String getConfig(String key, String defaultValue) {
        try {
            List<String> values = jdbcTemplate.query(
                    "SELECT config_value FROM system_config WHERE config_key = ?",
                    (rs, rowNum) -> rs.getString("config_value"),
                    key);
            return values.isEmpty() ? defaultValue : values.get(0);
        } catch (Exception e) {
            return defaultValue;
        }
    }

    private String trimTrailingSlash(String value) {
        return value.endsWith("/") ? value.substring(0, value.length() - 1) : value;
    }

    private String formatTime(LocalDateTime time) {
        return time == null ? "未设置" : TIME_FORMATTER.format(time);
    }

    private String valueOrDefault(String value, String fallback) {
        return value == null || value.isBlank() ? fallback : value.trim();
    }

    private String formatPriority(String priority) {
        if (priority == null || priority.isBlank()) return "未设置";
        return switch (priority.trim().toUpperCase()) {
            case "LOW" -> "低";
            case "MEDIUM" -> "中";
            case "HIGH" -> "高";
            case "URGENT" -> "紧急";
            default -> priority.trim();
        };
    }

    private String formatStatus(String status) {
        if (status == null || status.isBlank()) return "未设置";
        return switch (status.trim().toUpperCase()) {
            case "TODO" -> "待处理";
            case "DOING" -> "进行中";
            case "DONE" -> "已完成";
            case "CANCELLED" -> "已取消";
            default -> status.trim();
        };
    }
}
