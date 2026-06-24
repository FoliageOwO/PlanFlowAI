package com.planflow.notification;

import com.planflow.common.SecurityUtils;
import com.planflow.entity.Notification;
import com.planflow.security.JwtTokenProvider;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.CloseStatus;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;
import org.springframework.web.socket.handler.TextWebSocketHandler;

import java.io.IOException;
import java.net.URI;
import java.util.HashMap;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Slf4j
@Component
@RequiredArgsConstructor
public class NotificationWebSocketHandler extends TextWebSocketHandler {

    private final JwtTokenProvider jwtTokenProvider;

    // username → WebSocketSession
    private final Map<String, WebSocketSession> sessions = new ConcurrentHashMap<>();

    @Override
    public void afterConnectionEstablished(WebSocketSession session) {
        String token = extractToken(session);
        if (token == null || !jwtTokenProvider.validateToken(token)) {
            try { session.close(CloseStatus.POLICY_VIOLATION); }
            catch (IOException e) { log.warn("close error", e); }
            return;
        }
        String username = jwtTokenProvider.getUsernameFromToken(token);
        sessions.put(username, session);
        log.info("WS connected: user={}", username);
    }

    @Override
    public void afterConnectionClosed(WebSocketSession session, CloseStatus status) {
        sessions.entrySet().removeIf(e -> e.getValue().getId().equals(session.getId()));
    }

    @Override
    public void handleTransportError(WebSocketSession session, Throwable ex) {
        sessions.entrySet().removeIf(e -> e.getValue().getId().equals(session.getId()));
        log.warn("WS error", ex);
    }

    public boolean push(String username, String messageJson) {
        WebSocketSession session = sessions.get(username);
        if (session != null && session.isOpen()) {
            try {
                session.sendMessage(new TextMessage(messageJson));
                return true;
            } catch (IOException e) {
                sessions.remove(username);
            }
        }
        return false;
    }

    private String extractToken(WebSocketSession session) {
        URI uri = session.getUri();
        if (uri == null) return null;
        String query = uri.getQuery();
        if (query == null) return null;
        for (String param : query.split("&")) {
            String[] pair = param.split("=", 2);
            if (pair.length == 2 && "token".equals(pair[0])) return pair[1];
        }
        return null;
    }
}
