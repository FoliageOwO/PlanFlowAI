package com.planflow.service;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.conditions.update.LambdaUpdateWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.planflow.common.SecurityUtils;
import com.planflow.entity.Notification;
import com.planflow.entity.TimelineEvent;
import com.planflow.entity.Task;
import com.planflow.entity.TaskChecklistItem;
import com.planflow.entity.ReminderRule;
import com.planflow.repository.NotificationMapper;
import com.planflow.repository.ReminderRuleMapper;
import com.planflow.repository.TaskChecklistItemMapper;
import com.planflow.repository.TaskMapper;
import com.planflow.repository.TimelineEventMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;
import java.util.Map;

@Slf4j
@Service
@RequiredArgsConstructor
public class TaskService {

    private final TaskMapper taskMapper;
    private final TaskChecklistItemMapper checklistItemMapper;
    private final ReminderRuleMapper reminderRuleMapper;
    private final NotificationMapper notificationMapper;
    private final TimelineEventMapper timelineEventMapper;
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
        Task existing = getTaskById(id);

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
        Task task = getTaskById(id);
        task.setStatus(status);
        task.setUpdatedAt(LocalDateTime.now());
        taskMapper.updateById(task);
        if ("DONE".equals(status) || "CANCELLED".equals(status)) {
            cancelPendingReminders(task.getId(), task.getUserId());
        }
        return task;
    }

    private void cancelPendingReminders(Long taskId, Long userId) {
        ReminderRule update = new ReminderRule();
        update.setStatus("CANCELLED");
        update.setUpdatedAt(LocalDateTime.now());
        reminderRuleMapper.update(update, new LambdaUpdateWrapper<ReminderRule>()
                .eq(ReminderRule::getTaskId, taskId)
                .eq(ReminderRule::getUserId, userId)
                .eq(ReminderRule::getStatus, "PENDING"));
    }

    public Task getTaskById(Long id) {
        Long userId = securityUtils.getCurrentUserId();
        Task task = taskMapper.selectById(id);
        if (task == null || !task.getUserId().equals(userId)) {
            throw new RuntimeException("Task not found: " + id);
        }
        return task;
    }

    @Transactional
    public void deleteTask(Long id) {
        Task task = getTaskById(id);
        Long userId = task.getUserId();
        notificationMapper.delete(new LambdaQueryWrapper<Notification>()
                .eq(Notification::getUserId, userId)
                .eq(Notification::getTaskId, id));
        reminderRuleMapper.delete(new LambdaQueryWrapper<ReminderRule>()
                .eq(ReminderRule::getUserId, userId)
                .eq(ReminderRule::getTaskId, id));
        timelineEventMapper.delete(new LambdaQueryWrapper<TimelineEvent>()
                .eq(TimelineEvent::getUserId, userId)
                .eq(TimelineEvent::getTaskId, id));
        checklistItemMapper.delete(new LambdaQueryWrapper<TaskChecklistItem>()
                .eq(TaskChecklistItem::getUserId, userId)
                .eq(TaskChecklistItem::getTaskId, id));
        taskMapper.deleteById(id);
        log.info("Deleted task: id={}", id);
    }

    public Page<Task> listTasks(int page, int size, String status, String priority,
                                 LocalDateTime from, LocalDateTime to, String keyword,
                                 Long sourceInputId, String filter) {
        Long userId = securityUtils.getCurrentUserId();
        LambdaQueryWrapper<Task> wrapper = new LambdaQueryWrapper<Task>()
                .eq(Task::getUserId, userId);

        LocalDateTime now = LocalDateTime.now();
        if (filter != null && !filter.isBlank() && !"all".equalsIgnoreCase(filter)) {
            switch (filter.toLowerCase()) {
                case "today" -> wrapper.ge(Task::getDeadline, LocalDateTime.of(LocalDate.now(), LocalTime.MIN))
                        .le(Task::getDeadline, LocalDateTime.of(LocalDate.now(), LocalTime.MAX))
                        .notIn(Task::getStatus, "DONE", "CANCELLED");
                case "due" -> wrapper.gt(Task::getDeadline, now)
                        .le(Task::getDeadline, now.plusDays(7))
                        .notIn(Task::getStatus, "DONE", "CANCELLED");
                case "overdue" -> wrapper.lt(Task::getDeadline, now)
                        .notIn(Task::getStatus, "DONE", "CANCELLED");
                case "done" -> wrapper.eq(Task::getStatus, "DONE");
                default -> {
                    // Unknown filters are ignored to keep old clients compatible.
                }
            }
        }
        if (status != null && !status.isBlank()) wrapper.eq(Task::getStatus, status.toUpperCase());
        if (priority != null && !priority.isBlank()) wrapper.eq(Task::getPriority, priority.toUpperCase());
        if (from != null) wrapper.ge(Task::getDeadline, from);
        if (to != null) wrapper.le(Task::getDeadline, to);
        if (keyword != null && !keyword.isBlank()) {
            wrapper.and(w -> w.like(Task::getTitle, keyword).or().like(Task::getDescription, keyword));
        }
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

    @Transactional
    public void updateChecklist(Long taskId, List<Map<String, Object>> items) {
        Task task = getTaskById(taskId);
        checklistItemMapper.delete(new LambdaQueryWrapper<TaskChecklistItem>()
                .eq(TaskChecklistItem::getUserId, task.getUserId())
                .eq(TaskChecklistItem::getTaskId, taskId));

        if (items == null) return;
        int order = 0;
        for (Map<String, Object> item : items) {
            Object rawContent = item.getOrDefault("content", item.getOrDefault("text", ""));
            String content = rawContent == null ? "" : rawContent.toString().trim();
            if (content.isBlank()) continue;

            Object rawChecked = item.getOrDefault("checked", item.get("done"));
            boolean checked = Boolean.TRUE.equals(rawChecked)
                    || rawChecked instanceof Number number && number.intValue() == 1;

            TaskChecklistItem ci = new TaskChecklistItem();
            ci.setUserId(task.getUserId());
            ci.setTaskId(taskId);
            ci.setContent(content);
            ci.setChecked(checked ? 1 : 0);
            ci.setSortOrder(order++);
            ci.setCreatedAt(LocalDateTime.now());
            ci.setUpdatedAt(LocalDateTime.now());
            checklistItemMapper.insert(ci);
        }
    }
}
