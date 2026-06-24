package com.planflow.controller;
import com.planflow.service.*;
import com.planflow.common.ApiResponse;
import com.planflow.common.ErrorCode;
import com.planflow.common.SecurityUtils;
import com.planflow.entity.ReminderRule;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/reminders")
@RequiredArgsConstructor
public class ReminderController {

    private final ReminderService reminderService;
    private final SecurityUtils securityUtils;

    @GetMapping
    public ApiResponse getUserReminders() {
        List<ReminderRule> reminders = reminderService.getUserReminders();
        return ApiResponse.success(reminders);
    }

    @PostMapping
    public ApiResponse createReminder(@RequestBody ReminderRule rule) {
        try {
            ReminderRule created = reminderService.createReminder(rule);
            return ApiResponse.success(created);
        } catch (Exception e) {
            return ApiResponse.error(ErrorCode.SERVER_ERROR, e.getMessage());
        }
    }

    @PatchMapping("/{id}")
    public ApiResponse updateReminder(@PathVariable Long id, @RequestBody ReminderRule updates) {
        try {
            ReminderRule updated = reminderService.updateReminder(id, updates);
            return ApiResponse.success(updated);
        } catch (Exception e) {
            return ApiResponse.error(ErrorCode.NOT_FOUND, e.getMessage());
        }
    }

    @DeleteMapping("/{id}")
    public ApiResponse deleteReminder(@PathVariable Long id) {
        try {
            reminderService.deleteReminder(id);
            return ApiResponse.success();
        } catch (Exception e) {
            return ApiResponse.error(ErrorCode.NOT_FOUND, e.getMessage());
        }
    }

    @GetMapping("/pending-local")
    public ApiResponse getPendingLocalNotifications() {
        List<ReminderRule> reminders = reminderService.getPendingLocalNotifications();
        return ApiResponse.success(reminders);
    }

    @PostMapping("/local-sync")
    public ApiResponse syncLocalNotifications(@RequestBody Map<String, Object> body) {
        try {
            String deviceId = (String) body.get("deviceId");
            @SuppressWarnings("unchecked")
            List<Map<String, Object>> items = (List<Map<String, Object>>) body.get("items");
            Long userId = securityUtils.getCurrentUserId();
            reminderService.syncLocalNotifications(userId, deviceId, items);
            return ApiResponse.success();
        } catch (Exception e) {
            return ApiResponse.error(ErrorCode.SERVER_ERROR, e.getMessage());
        }
    }
}
