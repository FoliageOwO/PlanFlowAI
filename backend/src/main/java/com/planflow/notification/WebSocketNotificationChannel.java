package com.planflow.notification;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.planflow.entity.Notification;
import com.planflow.entity.ReminderRule;
import com.planflow.entity.User;
import com.planflow.entity.UserSetting;
import com.planflow.repository.ReminderRuleMapper;
import com.planflow.repository.UserSettingMapper;
import com.planflow.repository.UserMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.util.HashMap;
import java.util.Map;

@Slf4j
@Component
@RequiredArgsConstructor
public class WebSocketNotificationChannel implements NotificationChannel {

    private final NotificationWebSocketHandler wsHandler;
    private final UserMapper userMapper;
    private final UserSettingMapper userSettingMapper;
    private final ReminderRuleMapper reminderRuleMapper;
    private final ObjectMapper objectMapper = new ObjectMapper();

    @Override
    public String channelType() { return "websocket"; }

    @Override
    public boolean isEnabled(Long userId) {
        UserSetting setting = getSetting(userId);
        return isInAppEnabled(setting) || isLocalAppEnabled(setting);
    }

    @Override
    public int getOrder() { return 0; }

    @Override
    public void send(Notification notification) {
        try {
            UserSetting setting = getSetting(notification.getUserId());
            ReminderRule rule = notification.getReminderRuleId() == null
                    ? null
                    : reminderRuleMapper.selectById(notification.getReminderRuleId());
            if (!shouldPush(rule, setting)) return;
            User user = userMapper.selectById(notification.getUserId());
            if (user == null) return;

            Map<String, Object> payload = new HashMap<>();
            payload.put("id", notification.getId());
            payload.put("reminderRuleId", notification.getReminderRuleId());
            payload.put("channel", rule != null ? rule.getChannel() : null);
            payload.put("remindAt", rule != null && rule.getRemindAt() != null
                    ? rule.getRemindAt().toString() : null);
            payload.put("type", notification.getType());
            payload.put("title", notification.getTitle());
            payload.put("content", notification.getContent());
            payload.put("taskId", notification.getTaskId());
            payload.put("createdAt", notification.getCreatedAt() != null
                    ? notification.getCreatedAt().toString() : null);
            payload.put("readStatus", "UNREAD");

            String json = objectMapper.writeValueAsString(payload);
            wsHandler.push(user.getUsername(), json);
        } catch (Exception e) {
            log.warn("WS push failed", e);
        }
    }

    private boolean shouldPush(ReminderRule rule, UserSetting setting) {
        if (rule == null || rule.getChannel() == null) return isInAppEnabled(setting);
        if ("LOCAL_APP".equalsIgnoreCase(rule.getChannel())) return isLocalAppEnabled(setting);
        return ("IN_APP".equalsIgnoreCase(rule.getChannel()) || "BROWSER".equalsIgnoreCase(rule.getChannel()))
                && isInAppEnabled(setting);
    }

    private UserSetting getSetting(Long userId) {
        return userSettingMapper.selectOne(
                new com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper<UserSetting>()
                        .eq(UserSetting::getUserId, userId));
    }

    private boolean isInAppEnabled(UserSetting setting) {
        return setting == null
                || setting.getEnableInAppNotification() == null
                || setting.getEnableInAppNotification() == 1;
    }

    private boolean isLocalAppEnabled(UserSetting setting) {
        return setting != null
                && setting.getEnableLocalNotification() != null
                && setting.getEnableLocalNotification() == 1;
    }
}
