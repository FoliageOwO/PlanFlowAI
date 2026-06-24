package com.planflow.controller;
import com.planflow.service.*;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.planflow.common.ApiResponse;
import com.planflow.common.ErrorCode;
import com.planflow.entity.Task;
import com.planflow.entity.TaskChecklistItem;
import com.planflow.repository.TaskChecklistItemMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/tasks")
@RequiredArgsConstructor
public class TaskController {

    private final TaskService taskService;
    private final TaskChecklistItemMapper checklistItemMapper;
    private final com.planflow.repository.ReminderRuleMapper reminderRuleMapper;
    private final com.fasterxml.jackson.databind.ObjectMapper objectMapper = new com.fasterxml.jackson.databind.ObjectMapper();

    @GetMapping
    public ApiResponse listTasks(
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String priority,
            @RequestParam(required = false) @DateTimeFormat(pattern = "yyyy-MM-dd HH:mm:ss") LocalDateTime from,
            @RequestParam(required = false) @DateTimeFormat(pattern = "yyyy-MM-dd HH:mm:ss") LocalDateTime to,
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) Long sourceInputId) {
        Page<Task> result = taskService.listTasks(page, size, status, priority, from, to, keyword, sourceInputId);
        // Transform MyBatis Plus Page to frontend-friendly format { list, total }
        Map<String, Object> data = new HashMap<>();
        data.put("list", result.getRecords());
        data.put("total", result.getTotal());
        return ApiResponse.success(data);
    }

    @GetMapping("/today")
    public ApiResponse getTodayTasks() {
        return ApiResponse.success(taskService.getTodayTasks());
    }

    @GetMapping("/upcoming")
    public ApiResponse getUpcomingTasks() {
        return ApiResponse.success(taskService.getUpcomingTasks());
    }

    @GetMapping("/overdue")
    public ApiResponse getOverdueTasks() {
        return ApiResponse.success(taskService.getOverdueTasks());
    }

    @GetMapping("/{id}")
    public ApiResponse getTask(@PathVariable Long id) {
        try {
            Task task = taskService.getTaskById(id);

            // Build enriched response with checklist + reminders
            Map<String, Object> result = new HashMap<>();
            result.put("id", task.getId());
            result.put("userId", task.getUserId());
            result.put("sourceInputId", task.getSourceInputId());
            result.put("title", task.getTitle());
            result.put("description", task.getDescription());
            result.put("taskType", task.getTaskType());
            result.put("priority", task.getPriority());
            result.put("status", task.getStatus());
            result.put("deadline", task.getDeadline());
            result.put("estimatedMinutes", task.getEstimatedMinutes());
            result.put("createdAt", task.getCreatedAt());
            result.put("updatedAt", task.getUpdatedAt());

            // Parse constraints JSON to list
            if (task.getConstraintsJson() != null) {
                try {
                    result.put("constraints", objectMapper.readValue(task.getConstraintsJson(), List.class));
                } catch (Exception e) {
                    result.put("constraints", new ArrayList<>());
                }
            } else {
                result.put("constraints", new ArrayList<>());
            }

            // Parse source evidence
            result.put("sourceEvidence", task.getSourceEvidence());

            // Checklist items
            List<Map<String, Object>> checklistItems = taskService.getChecklistItems(id).stream()
                    .map(ci -> {
                        Map<String, Object> item = new HashMap<>();
                        item.put("id", String.valueOf(ci.getId()));
                        item.put("text", ci.getContent());
                        item.put("done", ci.getChecked() == 1);
                        return item;
                    })
                    .collect(Collectors.toList());
            result.put("checklist", checklistItems);

            // Reminder rules
            List<Map<String, Object>> reminderItems = reminderRuleMapper.selectList(
                    new com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper<com.planflow.entity.ReminderRule>()
                            .eq(com.planflow.entity.ReminderRule::getTaskId, id)
                            .orderByAsc(com.planflow.entity.ReminderRule::getRemindAt)
            ).stream().map(rr -> {
                Map<String, Object> item = new HashMap<>();
                item.put("id", String.valueOf(rr.getId()));
                item.put("time", rr.getRemindAt() != null ? rr.getRemindAt().toString() : "");
                item.put("channel", rr.getChannel() != null ? rr.getChannel() : "IN_APP");
                return item;
            }).collect(Collectors.toList());
            result.put("reminders", reminderItems);

            return ApiResponse.success(result);
        } catch (Exception e) {
            return ApiResponse.error(ErrorCode.NOT_FOUND, e.getMessage());
        }
    }

    @PostMapping
    public ApiResponse createTask(@RequestBody Task task) {
        try {
            Task created = taskService.createTask(task);
            return ApiResponse.success(created);
        } catch (Exception e) {
            return ApiResponse.error(ErrorCode.SERVER_ERROR, e.getMessage());
        }
    }

    @PatchMapping("/{id}")
    @PutMapping("/{id}")
    public ApiResponse updateTask(@PathVariable Long id, @RequestBody Task updates) {
        try {
            Task updated = taskService.updateTask(id, updates);
            return ApiResponse.success(updated);
        } catch (Exception e) {
            return ApiResponse.error(ErrorCode.NOT_FOUND, e.getMessage());
        }
    }

    @PatchMapping("/{id}/status")
    @PutMapping("/{id}/status")
    public ApiResponse updateTaskStatus(@PathVariable Long id, @RequestBody Map<String, String> body) {
        String status = body.get("status");
        if (status == null || status.isBlank()) {
            return ApiResponse.error(ErrorCode.BAD_REQUEST, "status is required");
        }
        try {
            Task updated = taskService.updateStatus(id, status.toUpperCase());
            return ApiResponse.success(updated);
        } catch (Exception e) {
            return ApiResponse.error(ErrorCode.NOT_FOUND, e.getMessage());
        }
    }

    @DeleteMapping("/{id}")
    public ApiResponse deleteTask(@PathVariable Long id) {
        try {
            taskService.deleteTask(id);
            return ApiResponse.success();
        } catch (Exception e) {
            return ApiResponse.error(ErrorCode.NOT_FOUND, e.getMessage());
        }
    }

    @PutMapping("/{id}/checklist")
    public ApiResponse updateChecklist(@PathVariable Long id, @RequestBody Map<String, Object> body) {
        try {
            @SuppressWarnings("unchecked")
            List<Map<String, Object>> items = (List<Map<String, Object>>) body.get("items");
            // Delete old items
            checklistItemMapper.delete(new com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper<TaskChecklistItem>()
                    .eq(TaskChecklistItem::getTaskId, id));
            // Insert new items
            if (items != null) {
                int order = 0;
                for (Map<String, Object> item : items) {
                    TaskChecklistItem ci = new TaskChecklistItem();
                    ci.setUserId(taskService.getTaskById(id).getUserId());
                    ci.setTaskId(id);
                    ci.setContent((String) item.getOrDefault("content", ""));
                    ci.setChecked(Boolean.TRUE.equals(item.get("checked")) ? 1 : 0);
                    ci.setSortOrder(order++);
                    ci.setCreatedAt(LocalDateTime.now());
                    ci.setUpdatedAt(LocalDateTime.now());
                    checklistItemMapper.insert(ci);
                }
            }
            return ApiResponse.success();
        } catch (Exception e) {
            return ApiResponse.error(ErrorCode.SERVER_ERROR, e.getMessage());
        }
    }

    @GetMapping("/{id}/checklist")
    public ApiResponse getChecklist(@PathVariable Long id) {
        return ApiResponse.success(taskService.getChecklistItems(id));
    }
}
