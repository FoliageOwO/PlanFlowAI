package com.planflow.notification;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.planflow.common.SecurityUtils;
import com.planflow.entity.Notification;
import com.planflow.repository.UserMapper;
import com.planflow.entity.User;
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
    private final SecurityUtils securityUtils;
    private final UserMapper userMapper;
    private final ObjectMapper objectMapper = new ObjectMapper();

    @Override
    public String channelType() { return "websocket"; }

    @Override
    public boolean isEnabled(Long userId) { return true; }

    @Override
    public int getOrder() { return 0; }

    @Override
    public void send(Notification notification) {
        try {
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
}
