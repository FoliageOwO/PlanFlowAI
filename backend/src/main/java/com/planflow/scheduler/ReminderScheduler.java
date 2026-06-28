package com.planflow.scheduler;

import com.planflow.entity.Notification;
import com.planflow.entity.ReminderRule;
import com.planflow.notification.NotificationChannelManager;
import com.planflow.repository.NotificationMapper;
import com.planflow.service.ReminderService;
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
    private final NotificationChannelManager channelManager;

    @Scheduled(fixedRate = 60000)
    public void processDueReminders() {
        List<ReminderRule> dueReminders = reminderService.getDueReminders();
        if (dueReminders.isEmpty()) return;

        log.info("Processing {} due reminders", dueReminders.size());

        for (ReminderRule rule : dueReminders) {
            try {
                // 1. 持久化通知
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

                // 2. 通过通知渠道分发（WebSocket 实时推送等）
                channelManager.dispatch(notification);

                // 3. 标记提醒已发送
                reminderService.markSentBySystem(rule.getId());

                log.info("Processed reminder: id={}, channels dispatched", rule.getId());
            } catch (Exception e) {
                log.error("Failed to process reminder: id={}", rule.getId(), e);
                try {
                    reminderService.markFailedBySystem(rule.getId(), e.getMessage());
                } catch (Exception markFailedError) {
                    log.error("Failed to mark reminder failed: id={}", rule.getId(), markFailedError);
                }
            }
        }
    }
}
