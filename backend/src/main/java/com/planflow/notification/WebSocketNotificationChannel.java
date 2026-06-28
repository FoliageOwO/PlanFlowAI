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
        UserSetting setting = userSettingMapper.selectOne(
                new com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper<UserSetting>()
                        .eq(UserSetting::getUserId, userId));
        return setting == null
                || setting.getEnableInAppNotification() == null
                || setting.getEnableInAppNotification() == 1;
    }

    @Override
    public int getOrder() { return 0; }

    @Override
    public void send(Notification notification) {
        try {
            if (!shouldPush(notification)) return;
            User user = userMapper.selectById(notification.getUserId());
            if (user == null) return;

            Map<String, Object> payload = new HashMap<>();
            payload.put("id", notification.getId());
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

    private boolean shouldPush(Notification notification) {
        if (notification.getReminderRuleId() == null) return true;
        ReminderRule rule = reminderRuleMapper.selectById(notification.getReminderRuleId());
        if (rule == null || rule.getChannel() == null) return true;
        return "IN_APP".equalsIgnoreCase(rule.getChannel()) || "BROWSER".equalsIgnoreCase(rule.getChannel());
    }
}
