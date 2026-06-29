package com.planflow.service;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.planflow.common.SecurityUtils;
import com.planflow.entity.ReminderRule;
import com.planflow.entity.Task;
import com.planflow.repository.ReminderRuleMapper;
import com.planflow.repository.TaskMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@Slf4j
@Service
@RequiredArgsConstructor
public class ReminderService {

    private final ReminderRuleMapper reminderRuleMapper;
    private final TaskMapper taskMapper;
    private final SecurityUtils securityUtils;

    public List<ReminderRule> getUserReminders(Long taskId) {
        Long userId = securityUtils.getCurrentUserId();
        LambdaQueryWrapper<ReminderRule> wrapper = new LambdaQueryWrapper<ReminderRule>()
                .eq(ReminderRule::getUserId, userId);
        if (taskId != null) {
            verifyTaskOwner(taskId, userId);
            wrapper.eq(ReminderRule::getTaskId, taskId);
        }
        wrapper.orderByAsc(ReminderRule::getRemindAt);
        return reminderRuleMapper.selectList(wrapper);
    }

    public ReminderRule createReminder(ReminderRule rule) {
        Long userId = securityUtils.getCurrentUserId();
        if (rule.getTaskId() != null) {
            verifyTaskOwner(rule.getTaskId(), userId);
        }
        rule.setUserId(userId);
        rule.setChannel(rule.getChannel() != null ? rule.getChannel() : "IN_APP");
        rule.setStatus(rule.getStatus() != null ? rule.getStatus() : "PENDING");
        rule.setCreatedAt(LocalDateTime.now());
        rule.setUpdatedAt(LocalDateTime.now());
        reminderRuleMapper.insert(rule);
        log.info("Created reminder: id={}, title={}", rule.getId(), rule.getTitle());
        return rule;
    }

    public ReminderRule updateReminder(Long id, ReminderRule updates) {
        Long userId = securityUtils.getCurrentUserId();
        ReminderRule existing = getReminderById(id);
        if (!existing.getUserId().equals(userId)) throw new RuntimeException("Reminder not found");

        if (updates.getTitle() != null) existing.setTitle(updates.getTitle());
        if (updates.getContent() != null) existing.setContent(updates.getContent());
        if (updates.getRemindAt() != null) existing.setRemindAt(updates.getRemindAt());
        if (updates.getChannel() != null) existing.setChannel(updates.getChannel());
        if (updates.getStatus() != null) existing.setStatus(updates.getStatus());
        if (updates.getTaskId() != null) {
            verifyTaskOwner(updates.getTaskId(), userId);
            existing.setTaskId(updates.getTaskId());
        }
        existing.setUpdatedAt(LocalDateTime.now());
        reminderRuleMapper.updateById(existing);
        return existing;
    }

    public void deleteReminder(Long id) {
        Long userId = securityUtils.getCurrentUserId();
        ReminderRule existing = getReminderById(id);
        if (!existing.getUserId().equals(userId)) throw new RuntimeException("Reminder not found");
        reminderRuleMapper.deleteById(id);
        log.info("Deleted reminder: id={}", id);
    }

    public ReminderRule getReminderById(Long id) {
        ReminderRule rule = reminderRuleMapper.selectById(id);
        if (rule == null) throw new RuntimeException("Reminder not found: " + id);
        return rule;
    }

    public List<ReminderRule> getPendingLocalNotifications() {
        Long userId = securityUtils.getCurrentUserId();
        return reminderRuleMapper.selectList(new LambdaQueryWrapper<ReminderRule>()
                .eq(ReminderRule::getUserId, userId)
                .eq(ReminderRule::getStatus, "PENDING")
                .eq(ReminderRule::getChannel, "LOCAL_APP")
                .ge(ReminderRule::getRemindAt, LocalDateTime.now().minusMinutes(30))
                .orderByAsc(ReminderRule::getRemindAt));
    }

    public void syncLocalNotifications(Long userId, String deviceId,
                                        List<Map<String, Object>> items) {
        if (items == null || items.isEmpty()) {
            log.info("No local notifications to sync for device={}", deviceId);
            return;
        }
        for (Map<String, Object> item : items) {
            Long reminderId = Long.valueOf(item.get("reminderId").toString());
            String localNotificationId = (String) item.get("localNotificationId");

            ReminderRule rule = reminderRuleMapper.selectById(reminderId);
            if (rule != null && rule.getUserId().equals(userId)) {
                rule.setLocalNotificationId(localNotificationId);
                if (rule.getRemindAt() != null && !rule.getRemindAt().isAfter(LocalDateTime.now())) {
                    rule.setStatus("SENT");
                }
                rule.setUpdatedAt(LocalDateTime.now());
                reminderRuleMapper.updateById(rule);
            }
        }
        log.info("Synced {} local notifications for device={}", items.size(), deviceId);
    }

    public List<ReminderRule> getDueReminders() {
        LocalDateTime now = LocalDateTime.now();
        return reminderRuleMapper.selectList(new LambdaQueryWrapper<ReminderRule>()
                .le(ReminderRule::getRemindAt, now)
                .eq(ReminderRule::getStatus, "PENDING"));
    }

    public void markSentBySystem(Long id) {
        ReminderRule rule = getReminderById(id);
        rule.setStatus("SENT");
        rule.setUpdatedAt(LocalDateTime.now());
        reminderRuleMapper.updateById(rule);
    }

    public void markFailedBySystem(Long id, String reason) {
        ReminderRule rule = getReminderById(id);
        rule.setStatus("FAILED");
        rule.setUpdatedAt(LocalDateTime.now());
        reminderRuleMapper.updateById(rule);
        log.warn("Marked reminder failed by system: id={}, reason={}", id, reason);
    }

    private void verifyTaskOwner(Long taskId, Long userId) {
        Task task = taskMapper.selectById(taskId);
        if (task == null || !task.getUserId().equals(userId)) {
            throw new RuntimeException("Task not found");
        }
    }
}
