package com.planflow.task;

import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.planflow.common.ApiResponse;
import com.planflow.common.ErrorCode;
import com.planflow.entity.Task;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.Map;

@RestController
@RequestMapping("/api/tasks")
@RequiredArgsConstructor
public class TaskController {

    private final TaskService taskService;

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
    public ApiResponse updateTask(@PathVariable Long id, @RequestBody Task updates) {
        try {
            Task updated = taskService.updateTask(id, updates);
            return ApiResponse.success(updated);
        } catch (Exception e) {
            return ApiResponse.error(ErrorCode.NOT_FOUND, e.getMessage());
        }
    }

    @PatchMapping("/{id}/status")
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
}
