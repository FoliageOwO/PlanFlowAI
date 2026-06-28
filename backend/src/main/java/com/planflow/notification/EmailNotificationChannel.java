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
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSenderImpl;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Properties;

@Slf4j
@Component
@RequiredArgsConstructor
public class EmailNotificationChannel implements NotificationChannel {

    private static final DateTimeFormatter TIME_FORMATTER = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm");

    private final JdbcTemplate jdbcTemplate;
    private final UserSettingMapper userSettingMapper;
    private final ReminderRuleMapper reminderRuleMapper;
    private final TaskMapper taskMapper;

    @Override
    public String channelType() {
        return "email";
    }

    @Override
    public boolean isEnabled(Long userId) {
        return true;
    }

    @Override
    public int getOrder() {
        return 10;
    }

    @Override
    public void send(Notification notification) {
        if (notification.getReminderRuleId() == null) return;
        ReminderRule rule = reminderRuleMapper.selectById(notification.getReminderRuleId());
        if (rule == null || !"EMAIL".equalsIgnoreCase(rule.getChannel())) return;

        if (!Boolean.parseBoolean(getConfig("notification.smtp.enabled", "false"))) {
            throw new IllegalStateException("SMTP channel is not enabled");
        }
        UserSetting setting = userSettingMapper.selectOne(new LambdaQueryWrapper<UserSetting>()
                .eq(UserSetting::getUserId, notification.getUserId()));
        if (setting == null
                || setting.getEnableEmailNotification() == null
                || setting.getEnableEmailNotification() != 1
                || setting.getNotificationEmail() == null
                || setting.getNotificationEmail().isBlank()) {
            throw new IllegalStateException("User notification email is not configured");
        }

        JavaMailSenderImpl sender = buildSender();
        SimpleMailMessage message = new SimpleMailMessage();
        message.setFrom(getRequiredConfig("notification.smtp.from", "SMTP from address"));
        message.setTo(setting.getNotificationEmail().trim());
        message.setSubject("[PlanFlowAI] " + notification.getTitle());
        message.setText(buildMailBody(notification, rule));
        sender.send(message);

        log.info("Email notification sent: notificationId={}, to={}", notification.getId(), setting.getNotificationEmail());
    }

    private JavaMailSenderImpl buildSender() {
        JavaMailSenderImpl sender = new JavaMailSenderImpl();
        sender.setHost(getRequiredConfig("notification.smtp.host", "SMTP host"));
        sender.setPort(Integer.parseInt(getConfig("notification.smtp.port", "465")));
        sender.setUsername(getRequiredConfig("notification.smtp.username", "SMTP username"));
        sender.setPassword(getRequiredConfig("notification.smtp.password", "SMTP password"));
        sender.setDefaultEncoding("UTF-8");

        String security = getConfig("notification.smtp.security", "SSL").toUpperCase();
        Properties props = sender.getJavaMailProperties();
        props.put("mail.smtp.auth", "true");
        props.put("mail.smtp.connectiontimeout", "15000");
        props.put("mail.smtp.timeout", "15000");
        props.put("mail.smtp.writetimeout", "15000");
        if ("SSL".equals(security)) {
            props.put("mail.smtp.ssl.enable", "true");
        } else if ("TLS".equals(security)) {
            props.put("mail.smtp.starttls.enable", "true");
            props.put("mail.smtp.starttls.required", "true");
        }
        return sender;
    }

    private String buildMailBody(Notification notification, ReminderRule rule) {
        Task task = rule.getTaskId() == null ? null : taskMapper.selectById(rule.getTaskId());
        StringBuilder body = new StringBuilder();
        body.append("PlanFlowAI 任务提醒\n");
        body.append("========================================\n\n");
        body.append("提醒标题：").append(valueOrDefault(notification.getTitle(), "任务提醒")).append("\n");
        body.append("提醒时间：").append(formatTime(rule.getRemindAt())).append("\n");
        body.append("发送时间：").append(formatTime(LocalDateTime.now())).append("\n\n");

        String content = notification.getContent() == null ? "" : notification.getContent().trim();
        if (!content.isBlank()) {
            body.append("提醒内容：\n");
            body.append(content).append("\n\n");
        }

        if (task != null) {
            body.append("关联任务：\n");
            body.append("- 标题：").append(valueOrDefault(task.getTitle(), "未命名任务")).append("\n");
            body.append("- 优先级：").append(valueOrDefault(task.getPriority(), "未设置")).append("\n");
            body.append("- 状态：").append(valueOrDefault(task.getStatus(), "未设置")).append("\n");
            if (task.getDeadline() != null) {
                body.append("- 截止时间：").append(formatTime(task.getDeadline())).append("\n");
            }
            if (task.getEstimatedMinutes() != null) {
                body.append("- 预估耗时：").append(task.getEstimatedMinutes()).append(" 分钟\n");
            }
            if (task.getDescription() != null && !task.getDescription().isBlank()) {
                body.append("\n任务说明：\n");
                body.append(task.getDescription().trim()).append("\n");
            }
            body.append("\n");
        }

        body.append("请及时处理该任务，并在 PlanFlowAI 中更新进度。\n\n");
        body.append("----------------------------------------\n");
        body.append("此邮件由 PlanFlowAI 自动发送，请勿直接回复。\n");
        return body.toString();
    }

    private String formatTime(LocalDateTime time) {
        return time == null ? "未设置" : TIME_FORMATTER.format(time);
    }

    private String valueOrDefault(String value, String fallback) {
        return value == null || value.isBlank() ? fallback : value.trim();
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
}
