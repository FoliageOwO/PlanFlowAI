package com.planflow.task;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.conditions.update.LambdaUpdateWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.planflow.common.SecurityUtils;
import com.planflow.entity.Task;
import com.planflow.entity.TaskChecklistItem;
import com.planflow.mapper.TaskChecklistItemMapper;
import com.planflow.mapper.TaskMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class TaskService {

    private final TaskMapper taskMapper;
    private final TaskChecklistItemMapper checklistItemMapper;
    private final SecurityUtils securityUtils;

    public Task createTask(Task task) {
        task.setUserId(securityUtils.getCurrentUserId());
        task.setTaskType("MANUAL");
        task.setCreatedAt(LocalDateTime.now());
        task.setUpdatedAt(LocalDateTime.now());
        taskMapper.insert(task);
        log.info("Created task: id={}, title={}", task.getId(), task.getTitle());
        return task;
    }

    public Task updateTask(Long id, Task updates) {
        Long userId = securityUtils.getCurrentUserId();
        Task existing = getTaskById(id);
        if (!existing.getUserId().equals(userId)) {
            throw new RuntimeException("Task not found");
        }

        if (updates.getTitle() != null) existing.setTitle(updates.getTitle());
        if (updates.getDescription() != null) existing.setDescription(updates.getDescription());
        if (updates.getPriority() != null) existing.setPriority(updates.getPriority());
        if (updates.getStatus() != null) existing.setStatus(updates.getStatus());
        if (updates.getDeadline() != null) existing.setDeadline(updates.getDeadline());
        if (updates.getEstimatedMinutes() != null) existing.setEstimatedMinutes(updates.getEstimatedMinutes());

        existing.setUpdatedAt(LocalDateTime.now());
        taskMapper.updateById(existing);
        return existing;
    }

    public Task updateStatus(Long id, String status) {
        Long userId = securityUtils.getCurrentUserId();
        Task task = getTaskById(id);
        if (!task.getUserId().equals(userId)) {
            throw new RuntimeException("Task not found");
        }
        task.setStatus(status);
        task.setUpdatedAt(LocalDateTime.now());
        taskMapper.updateById(task);
        return task;
    }

    public Task getTaskById(Long id) {
        Task task = taskMapper.selectById(id);
        if (task == null) throw new RuntimeException("Task not found: " + id);
        return task;
    }

    public void deleteTask(Long id) {
        Long userId = securityUtils.getCurrentUserId();
        Task task = getTaskById(id);
        if (!task.getUserId().equals(userId)) {
            throw new RuntimeException("Task not found");
        }
        taskMapper.deleteById(id);
        log.info("Deleted task: id={}", id);
    }

    public Page<Task> listTasks(int page, int size, String status, String priority,
                                 LocalDateTime from, LocalDateTime to, String keyword, Long sourceInputId) {
        Long userId = securityUtils.getCurrentUserId();
        LambdaQueryWrapper<Task> wrapper = new LambdaQueryWrapper<Task>()
                .eq(Task::getUserId, userId);

        if (status != null && !status.isBlank()) wrapper.eq(Task::getStatus, status.toUpperCase());
        if (priority != null && !priority.isBlank()) wrapper.eq(Task::getPriority, priority.toUpperCase());
        if (from != null) wrapper.ge(Task::getDeadline, from);
        if (to != null) wrapper.le(Task::getDeadline, to);
        if (keyword != null && !keyword.isBlank()) wrapper.like(Task::getTitle, keyword);
        if (sourceInputId != null) wrapper.eq(Task::getSourceInputId, sourceInputId);

        wrapper.orderByDesc(Task::getCreatedAt);

        Page<Task> pageParam = new Page<>(page, size);
        return taskMapper.selectPage(pageParam, wrapper);
    }

    public List<Task> getTodayTasks() {
        Long userId = securityUtils.getCurrentUserId();
        LocalDateTime todayStart = LocalDateTime.of(LocalDate.now(), LocalTime.MIN);
        LocalDateTime todayEnd = LocalDateTime.of(LocalDate.now(), LocalTime.MAX);

        return taskMapper.selectList(new LambdaQueryWrapper<Task>()
                .eq(Task::getUserId, userId)
                .ge(Task::getDeadline, todayStart)
                .le(Task::getDeadline, todayEnd)
                .ne(Task::getStatus, "DONE")
                .orderByAsc(Task::getDeadline));
    }

    public List<Task> getUpcomingTasks() {
        Long userId = securityUtils.getCurrentUserId();
        LocalDateTime now = LocalDateTime.now();
        LocalDateTime future = now.plusDays(7);

        return taskMapper.selectList(new LambdaQueryWrapper<Task>()
                .eq(Task::getUserId, userId)
                .gt(Task::getDeadline, now)
                .le(Task::getDeadline, future)
                .ne(Task::getStatus, "DONE")
                .orderByAsc(Task::getDeadline));
    }

    public List<Task> getOverdueTasks() {
        Long userId = securityUtils.getCurrentUserId();
        LocalDateTime now = LocalDateTime.now();

        return taskMapper.selectList(new LambdaQueryWrapper<Task>()
                .eq(Task::getUserId, userId)
                .lt(Task::getDeadline, now)
                .notIn(Task::getStatus, "DONE", "CANCELLED")
                .orderByAsc(Task::getDeadline));
    }

    public List<TaskChecklistItem> getChecklistItems(Long taskId) {
        Long userId = securityUtils.getCurrentUserId();
        return checklistItemMapper.selectList(new LambdaQueryWrapper<TaskChecklistItem>()
                .eq(TaskChecklistItem::getUserId, userId)
                .eq(TaskChecklistItem::getTaskId, taskId)
                .orderByAsc(TaskChecklistItem::getSortOrder));
    }
}
