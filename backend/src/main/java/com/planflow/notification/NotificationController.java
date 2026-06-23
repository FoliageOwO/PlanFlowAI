package com.planflow.notification;

import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.planflow.common.ApiResponse;
import com.planflow.common.ErrorCode;
import com.planflow.entity.Notification;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/notifications")
@RequiredArgsConstructor
public class NotificationController {

    private final NotificationService notificationService;

    @GetMapping
    public ApiResponse getUserNotifications(
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "20") int size) {
        Page<Notification> result = notificationService.getUserNotifications(page, size);
        return ApiResponse.success(result);
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

    @PatchMapping("/read-all")
    @PostMapping("/read-all")
    public ApiResponse markAllAsRead() {
        notificationService.markAllAsRead();
        return ApiResponse.success();
    }
}
