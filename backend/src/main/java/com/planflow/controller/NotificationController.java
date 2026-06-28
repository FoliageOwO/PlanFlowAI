package com.planflow.controller;
import com.planflow.service.*;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.planflow.common.ApiResponse;
import com.planflow.common.ErrorCode;
import com.planflow.entity.Notification;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/notifications")
@RequiredArgsConstructor
public class NotificationController {

    private final NotificationService notificationService;

    @GetMapping
    public ApiResponse getUserNotifications(
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(defaultValue = "false") boolean unreadOnly) {
        Page<Notification> result = notificationService.getUserNotifications(page, size, unreadOnly);
        Map<String, Object> data = new HashMap<>();
        data.put("list", result.getRecords().stream().map(this::toNotificationItem).toList());
        data.put("total", result.getTotal());
        return ApiResponse.success(data);
    }

    private Map<String, Object> toNotificationItem(Notification notification) {
        Map<String, Object> item = new HashMap<>();
        item.put("id", String.valueOf(notification.getId()));
        item.put("type", notification.getType());
        item.put("title", notification.getTitle());
        item.put("content", notification.getContent());
        item.put("read", "READ".equals(notification.getReadStatus()));
        item.put("relatedTaskId", notification.getTaskId() != null ? String.valueOf(notification.getTaskId()) : null);
        item.put("taskId", notification.getTaskId() != null ? String.valueOf(notification.getTaskId()) : null);
        item.put("createdAt", notification.getCreatedAt());
        return item;
    }

    @GetMapping("/unread-count")
    public ApiResponse getUnreadCount() {
        long count = notificationService.getUnreadCount();
        return ApiResponse.success(Map.of("count", count));
    }

    @PatchMapping("/{id}/read")
    public ApiResponse markAsRead(@PathVariable Long id) {
        try {
            notificationService.markAsRead(id);
            return ApiResponse.success();
        } catch (Exception e) {
            return ApiResponse.error(ErrorCode.NOT_FOUND, e.getMessage());
        }
    }

    @RequestMapping(value = "/read-all", method = {RequestMethod.PATCH, RequestMethod.POST})
    public ApiResponse markAllAsRead() {
        notificationService.markAllAsRead();
        return ApiResponse.success();
    }
}
