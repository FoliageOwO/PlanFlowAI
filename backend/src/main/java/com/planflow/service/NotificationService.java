package com.planflow.service;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.planflow.common.SecurityUtils;
import com.planflow.entity.Notification;
import com.planflow.repository.NotificationMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;

@Slf4j
@Service
@RequiredArgsConstructor
public class NotificationService {

    private final NotificationMapper notificationMapper;
    private final SecurityUtils securityUtils;
    private final com.planflow.notification.NotificationChannelManager channelManager;

    public Page<Notification> getUserNotifications(int page, int size) {
        Long userId = securityUtils.getCurrentUserId();
        Page<Notification> pageParam = new Page<>(page, size);
        LambdaQueryWrapper<Notification> wrapper = new LambdaQueryWrapper<Notification>()
                .eq(Notification::getUserId, userId)
                .orderByDesc(Notification::getCreatedAt);
        return notificationMapper.selectPage(pageParam, wrapper);
    }

    public long getUnreadCount() {
        Long userId = securityUtils.getCurrentUserId();
        return notificationMapper.selectCount(new LambdaQueryWrapper<Notification>()
                .eq(Notification::getUserId, userId)
                .eq(Notification::getReadStatus, "UNREAD"));
    }

    public void markAsRead(Long id) {
        Long userId = securityUtils.getCurrentUserId();
        Notification notification = notificationMapper.selectById(id);
        if (notification == null || !notification.getUserId().equals(userId)) {
            throw new RuntimeException("Notification not found");
        }
        notification.setReadStatus("READ");
        notification.setReadAt(LocalDateTime.now());
        notificationMapper.updateById(notification);
    }

    public void markAllAsRead() {
        Long userId = securityUtils.getCurrentUserId();
        // Use LambdaUpdateWrapper for bulk update
        Notification update = new Notification();
        update.setReadStatus("READ");
        update.setReadAt(LocalDateTime.now());
        LambdaQueryWrapper<Notification> wrapper = new LambdaQueryWrapper<Notification>()
                .eq(Notification::getUserId, userId)
                .eq(Notification::getReadStatus, "UNREAD");
        // Update one by one since MyBatis Plus doesn't have update with wrapper directly on this pattern
        java.util.List<Notification> unread = notificationMapper.selectList(wrapper);
        for (Notification n : unread) {
            n.setReadStatus("READ");
            n.setReadAt(LocalDateTime.now());
            notificationMapper.updateById(n);
        }
        log.info("Marked {} notifications as read for userId={}", unread.size(), userId);
    }

    public void createParseCompletedNotification(Long userId, Long sourceInputId) {
        Notification notification = new Notification();
        notification.setUserId(userId);
        notification.setTitle("解析完成");
        notification.setContent("您的材料已解析完成，请查看生成的任务和事件。");
        notification.setType("PARSE_COMPLETED");
        notification.setReadStatus("UNREAD");
        notification.setCreatedAt(LocalDateTime.now());
        notificationMapper.insert(notification);

        // 通过通知渠道实时推送
        channelManager.dispatch(notification);

        log.info("Created parse completed notification for userId={}, sourceInputId={}", userId, sourceInputId);
    }

    public void createParseFailedNotification(Long userId, Long sourceInputId) {
        Notification notification = new Notification();
        notification.setUserId(userId);
        notification.setTitle("解析失败");
        notification.setContent("材料解析失败，请稍后重试或联系支持。");
        notification.setType("PARSE_FAILED");
        notification.setReadStatus("UNREAD");
        notification.setCreatedAt(LocalDateTime.now());
        notificationMapper.insert(notification);

        // 通过通知渠道实时推送
        channelManager.dispatch(notification);

        log.info("Created parse failed notification for userId={}, sourceInputId={}", userId, sourceInputId);
    }
}
