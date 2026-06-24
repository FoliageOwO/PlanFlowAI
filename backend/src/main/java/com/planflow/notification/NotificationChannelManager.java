package com.planflow.notification;

import com.planflow.entity.Notification;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.util.Comparator;
import java.util.List;
import java.util.stream.Collectors;

/**
 * 通知渠道管理器。
 * 自动收集所有 NotificationChannel Bean，按优先级排序后依次调用。
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class NotificationChannelManager {

    private final List<NotificationChannel> channels;

    @PostConstruct
    public void init() {
        log.info("Registered notification channels: {}",
                channels.stream().map(NotificationChannel::channelType).collect(Collectors.joining(", ")));
    }

    /** 向指定用户的所有启用渠道发送通知 */
    public void dispatch(Notification notification) {
        channels.stream()
                .filter(ch -> ch.isEnabled(notification.getUserId()))
                .sorted(Comparator.comparingInt(NotificationChannel::getOrder))
                .forEach(ch -> {
                    try {
                        ch.send(notification);
                    } catch (Exception e) {
                        log.error("Channel {} failed to send notification id={}",
                                ch.channelType(), notification.getId(), e);
                    }
                });
    }
}
