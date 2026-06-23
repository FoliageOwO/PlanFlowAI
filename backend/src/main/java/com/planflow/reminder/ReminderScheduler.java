package com.planflow.reminder;

import com.planflow.entity.Notification;
import com.planflow.entity.ReminderRule;
import com.planflow.mapper.NotificationMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;
import java.util.List;

@Slf4j
@Component
@RequiredArgsConstructor
public class ReminderScheduler {

    private final ReminderService reminderService;
    private final NotificationMapper notificationMapper;

    @Scheduled(fixedRate = 60000)
    public void processDueReminders() {
        List<ReminderRule> dueReminders = reminderService.getDueReminders();
        if (dueReminders.isEmpty()) return;

        log.info("Processing {} due reminders", dueReminders.size());

        for (ReminderRule rule : dueReminders) {
            try {
                Notification notification = new Notification();
                notification.setUserId(rule.getUserId());
                notification.setTaskId(rule.getTaskId());
                notification.setReminderRuleId(rule.getId());
                notification.setTitle(rule.getTitle());
                notification.setContent(rule.getContent());
                notification.setType("DEADLINE_SOON");
                notification.setReadStatus("UNREAD");
                notification.setCreatedAt(LocalDateTime.now());
                notificationMapper.insert(notification);

                // Mark reminder as sent
                rule.setStatus("SENT");
                rule.setUpdatedAt(LocalDateTime.now());
                reminderService.updateReminder(rule.getId(), rule);

                log.info("Sent notification for reminder: id={}", rule.getId());
            } catch (Exception e) {
                log.error("Failed to process reminder: id={}", rule.getId(), e);
            }
        }
    }
}
