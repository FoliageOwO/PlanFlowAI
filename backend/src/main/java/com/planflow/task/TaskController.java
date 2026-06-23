package com.planflow.task;

import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.planflow.common.ApiResponse;
import com.planflow.common.ErrorCode;
import com.planflow.entity.Task;
import com.planflow.entity.TaskChecklistItem;
import com.planflow.mapper.TaskChecklistItemMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/tasks")
@RequiredArgsConstructor
public class TaskController {

    private final TaskService taskService;
    private final TaskChecklistItemMapper checklistItemMapper;

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
        return ApiResponse.success(result);
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
            return ApiResponse.success(task);
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
