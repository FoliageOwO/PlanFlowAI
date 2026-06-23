package com.planflow.reminder;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.planflow.common.SecurityUtils;
import com.planflow.entity.ReminderRule;
import com.planflow.mapper.ReminderRuleMapper;
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
    private final SecurityUtils securityUtils;

    public List<ReminderRule> getUserReminders() {
        Long userId = securityUtils.getCurrentUserId();
        return reminderRuleMapper.selectList(new LambdaQueryWrapper<ReminderRule>()
                .eq(ReminderRule::getUserId, userId)
                .orderByAsc(ReminderRule::getRemindAt));
    }

    public ReminderRule createReminder(ReminderRule rule) {
        rule.setUserId(securityUtils.getCurrentUserId());
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
                .orderByAsc(ReminderRule::getRemindAt));
    }

    public void syncLocalNotifications(Long userId, String deviceId,
                                        List<Map<String, Object>> items) {
        for (Map<String, Object> item : items) {
            Long reminderId = Long.valueOf(item.get("reminderId").toString());
            String localNotificationId = (String) item.get("localNotificationId");
            String syncStatus = (String) item.get("syncStatus");

            ReminderRule rule = reminderRuleMapper.selectById(reminderId);
            if (rule != null && rule.getUserId().equals(userId)) {
                rule.setLocalNotificationId(localNotificationId);
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
}
