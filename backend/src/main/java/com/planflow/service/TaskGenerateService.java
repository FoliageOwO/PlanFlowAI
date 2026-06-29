package com.planflow.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.planflow.dto.AiAnalysisResultDTO;
import com.planflow.entity.*;
import com.planflow.notification.NotificationChannelManager;
import com.planflow.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class TaskGenerateService {

    private static final DateTimeFormatter FORMATTER = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");

    private final TaskMapper taskMapper;
    private final TaskChecklistItemMapper checklistItemMapper;
    private final TimelineEventMapper timelineEventMapper;
    private final ReminderRuleMapper reminderRuleMapper;
    private final NotificationMapper notificationMapper;
    private final UserSettingMapper userSettingMapper;
    private final NotificationChannelManager channelManager;
    private final ObjectMapper objectMapper = new ObjectMapper();

    @Transactional
    public void generateFromAnalysis(Long userId, Long sourceInputId, AiAnalysisResultDTO result) {
        log.info("Generating tasks from AI analysis: userId={}, sourceInputId={}", userId, sourceInputId);

        int taskCount = 0;
        int eventCount = 0;
        int reminderCount = 0;
        List<Task> generatedTasks = new ArrayList<>();

        // Generate tasks
        if (result.getTasks() != null) {
            for (AiAnalysisResultDTO.TaskItem taskItem : result.getTasks()) {
                Task task = new Task();
                task.setUserId(userId);
                task.setSourceInputId(sourceInputId);
                task.setTitle(taskItem.getTitle());
                task.setDescription(buildTaskDescription(taskItem));
                task.setTaskType("AI_EXTRACTED");
                task.setPriority(taskItem.getPriority() != null ? taskItem.getPriority().toUpperCase() : "MEDIUM");
                task.setStatus("TODO");
                task.setDeadline(parseDateTime(taskItem.getDeadline()));
                task.setEstimatedMinutes(taskItem.getEstimatedMinutes());
                task.setCreatedAt(LocalDateTime.now());
                task.setUpdatedAt(LocalDateTime.now());

                // Serialize constraints and source evidence to JSON
                try {
                    if (taskItem.getConstraints() != null) {
                        task.setConstraintsJson(objectMapper.writeValueAsString(taskItem.getConstraints()));
                    }
                    if (taskItem.getSourceEvidence() != null) {
                        task.setSourceEvidence(objectMapper.writeValueAsString(taskItem.getSourceEvidence()));
                    }
                } catch (JsonProcessingException e) {
                    log.warn("Failed to serialize task JSON fields", e);
                }

                taskMapper.insert(task);
                generatedTasks.add(task);
                taskCount++;

                // Generate checklist items
                List<String> checklist = getPreparationChecklist(taskItem);
                if (checklist != null) {
                    int order = 0;
                    for (String item : checklist) {
                        TaskChecklistItem checklistItem = new TaskChecklistItem();
                        checklistItem.setUserId(userId);
                        checklistItem.setTaskId(task.getId());
                        checklistItem.setContent(item);
                        checklistItem.setChecked(0);
                        checklistItem.setSortOrder(order++);
                        checklistItem.setCreatedAt(LocalDateTime.now());
                        checklistItem.setUpdatedAt(LocalDateTime.now());
                        checklistItemMapper.insert(checklistItem);
                    }
                }

                // Generate suggested reminders
                if (taskItem.getSuggestedReminders() != null) {
                    for (AiAnalysisResultDTO.SuggestedReminder sr : taskItem.getSuggestedReminders()) {
                        for (String channel : resolveReminderChannels(userId, sr.getChannel())) {
                            ReminderRule rule = new ReminderRule();
                            rule.setUserId(userId);
                            rule.setTaskId(task.getId());
                            rule.setTitle(sr.getTitle());
                            rule.setContent(sr.getContent());
                            rule.setRemindAt(parseDateTime(sr.getRemindAt()));
                            rule.setChannel(channel);
                            rule.setStatus("PENDING");
                            rule.setCreatedAt(LocalDateTime.now());
                            rule.setUpdatedAt(LocalDateTime.now());
                            reminderRuleMapper.insert(rule);
                            dispatchImmediatelyIfDue(rule);
                            reminderCount++;
                        }
                    }
                }

                // Generate default reminders based on deadline
                LocalDateTime deadline = task.getDeadline();
                if (deadline != null) {
                    // 1 day before deadline
                    createDefaultReminder(userId, task.getId(), deadline.minusDays(1),
                            "任务提醒: " + task.getTitle(), "距离截止时间还有1天", "IN_APP");
                    // 3 hours before deadline
                    createDefaultReminder(userId, task.getId(), deadline.minusHours(3),
                            "任务提醒: " + task.getTitle(), "距离截止时间还有3小时", "IN_APP");
                    // 8 AM on deadline day
                    LocalDateTime morningRemind = LocalDateTime.of(deadline.toLocalDate(), LocalTime.of(8, 0));
                    if (morningRemind.isAfter(LocalDateTime.now()) && morningRemind.isBefore(deadline)) {
                        createDefaultReminder(userId, task.getId(), morningRemind,
                                "今日任务: " + task.getTitle(), "今天是截止日期", "IN_APP");
                    }
                }
            }
        }

        // Generate timeline events
        if (result.getEvents() != null) {
            for (AiAnalysisResultDTO.EventItem eventItem : result.getEvents()) {
                LocalDateTime startTime = parseDateTime(eventItem.getStartTime());
                if (startTime == null) {
                    log.warn("Skip timeline event without valid startTime: title={}, startTime={}",
                            eventItem.getTitle(), eventItem.getStartTime());
                    continue;
                }
                TimelineEvent event = new TimelineEvent();
                event.setUserId(userId);
                event.setSourceInputId(sourceInputId);
                event.setTitle(eventItem.getTitle() == null || eventItem.getTitle().isBlank()
                        ? "未命名日程" : eventItem.getTitle());
                event.setEventType("EVENT");
                Task relatedTask = resolveRelatedTask(eventItem, startTime, generatedTasks);
                if (relatedTask != null) {
                    event.setTaskId(relatedTask.getId());
                }
                event.setStartTime(startTime);
                event.setEndTime(parseDateTime(eventItem.getEndTime()));
                event.setLocation(eventItem.getLocation());
                event.setDescription(eventItem.getDescription());
                if (eventItem.getSourceEvidence() != null) {
                    try {
                        event.setSourceEvidence(objectMapper.writeValueAsString(eventItem.getSourceEvidence()));
                    } catch (JsonProcessingException e) {
                        log.warn("Failed to serialize event source evidence", e);
                    }
                }
                event.setCreatedAt(LocalDateTime.now());
                event.setUpdatedAt(LocalDateTime.now());
                timelineEventMapper.insert(event);
                eventCount++;
            }
        }

        log.info("Generated {} tasks, {} events, {} reminders", taskCount, eventCount, reminderCount);
    }

    private Task resolveRelatedTask(AiAnalysisResultDTO.EventItem eventItem, LocalDateTime startTime, List<Task> generatedTasks) {
        if (generatedTasks == null || generatedTasks.isEmpty()) return null;
        for (Task task : generatedTasks) {
            if (task.getDeadline() != null && task.getDeadline().isEqual(startTime)) {
                return task;
            }
        }
        if (generatedTasks.size() == 1) return generatedTasks.get(0);
        String eventTitle = normalizeForComparison(eventItem.getTitle());
        for (Task task : generatedTasks) {
            String taskTitle = normalizeForComparison(task.getTitle());
            if (!eventTitle.isBlank() && !taskTitle.isBlank()
                    && (eventTitle.contains(taskTitle) || taskTitle.contains(eventTitle))) {
                return task;
            }
        }
        return null;
    }

    private void createDefaultReminder(Long userId, Long taskId, LocalDateTime remindAt,
                                        String title, String content, String channel) {
        if (remindAt.isBefore(LocalDateTime.now())) return;

        for (String resolvedChannel : resolveReminderChannels(userId, channel)) {
            ReminderRule rule = new ReminderRule();
            rule.setUserId(userId);
            rule.setTaskId(taskId);
            rule.setTitle(title);
            rule.setContent(content);
            rule.setRemindAt(remindAt);
            rule.setChannel(resolvedChannel);
            rule.setStatus("PENDING");
            rule.setCreatedAt(LocalDateTime.now());
            rule.setUpdatedAt(LocalDateTime.now());
            reminderRuleMapper.insert(rule);
        }
    }

    private void dispatchImmediatelyIfDue(ReminderRule rule) {
        if (rule.getRemindAt() == null || rule.getRemindAt().isAfter(LocalDateTime.now())) {
            return;
        }
        try {
            Notification notification = new Notification();
            notification.setUserId(rule.getUserId());
            notification.setTaskId(rule.getTaskId());
            notification.setReminderRuleId(rule.getId());
            notification.setTitle(rule.getTitle());
            notification.setContent(rule.getContent());
            notification.setType("REMINDER");
            notification.setReadStatus("UNREAD");
            notification.setCreatedAt(LocalDateTime.now());
            if (shouldPersistInAppNotification(rule)) {
                notificationMapper.insert(notification);
            }

            channelManager.dispatch(notification);
            rule.setStatus("SENT");
            rule.setUpdatedAt(LocalDateTime.now());
            reminderRuleMapper.updateById(rule);
            log.info("Immediately dispatched due reminder generated by AI: id={}", rule.getId());
        } catch (Exception e) {
            rule.setStatus("FAILED");
            rule.setUpdatedAt(LocalDateTime.now());
            reminderRuleMapper.updateById(rule);
            log.error("Failed to immediately dispatch due reminder generated by AI: id={}", rule.getId(), e);
        }
    }

    private boolean shouldPersistInAppNotification(ReminderRule rule) {
        if (rule.getChannel() == null) return true;
        return "IN_APP".equalsIgnoreCase(rule.getChannel()) || "BROWSER".equalsIgnoreCase(rule.getChannel());
    }

    private String normalizeReminderChannel(String channel) {
        if (channel == null || channel.isBlank()) return "IN_APP";
        String normalized = channel.trim().toUpperCase();
        return switch (normalized) {
            case "IN_APP", "LOCAL_APP", "BROWSER", "EMAIL", "SMS", "QQ" -> normalized;
            default -> "IN_APP";
        };
    }

    private List<String> resolveReminderChannels(Long userId, String requestedChannel) {
        String normalized = normalizeReminderChannel(requestedChannel);
        if (requestedChannel != null && !requestedChannel.isBlank() && !"IN_APP".equals(normalized)) {
            return List.of(normalized);
        }

        UserSetting setting = userSettingMapper.selectOne(new com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper<UserSetting>()
                .eq(UserSetting::getUserId, userId));
        List<String> channels = new ArrayList<>();
        if (setting == null || setting.getEnableInAppNotification() == null || setting.getEnableInAppNotification() == 1) {
            channels.add("IN_APP");
        }
        if (setting != null
                && setting.getEnableLocalNotification() != null
                && setting.getEnableLocalNotification() == 1) {
            channels.add("LOCAL_APP");
        }
        if (setting != null
                && setting.getEnableEmailNotification() != null
                && setting.getEnableEmailNotification() == 1
                && setting.getNotificationEmail() != null
                && !setting.getNotificationEmail().isBlank()) {
            channels.add("EMAIL");
        }
        if (setting != null
                && setting.getEnableQqNotification() != null
                && setting.getEnableQqNotification() == 1
                && setting.getNotificationQq() != null
                && !setting.getNotificationQq().isBlank()) {
            channels.add("QQ");
        }
        return channels.isEmpty() ? List.of("IN_APP") : channels;
    }

    private LocalDateTime parseDateTime(String dateTimeStr) {
        if (dateTimeStr == null || dateTimeStr.isBlank()) return null;
        try {
            return LocalDateTime.parse(dateTimeStr, FORMATTER);
        } catch (Exception e) {
            log.warn("Failed to parse datetime: {}", dateTimeStr);
            return null;
        }
    }

    private List<String> getPreparationChecklist(AiAnalysisResultDTO.TaskItem taskItem) {
        List<String> source = taskItem.getPreparationChecklist() != null
                ? taskItem.getPreparationChecklist()
                : taskItem.getChecklist();
        if (source == null) return null;
        List<String> result = new ArrayList<>();
        for (String item : source) {
            String normalized = item == null ? "" : item.trim();
            if (!normalized.isBlank()
                    && !containsEquivalentItem(result, normalized)
                    && !overlapsExcludedContext(normalized, taskItem)) {
                result.add(normalized);
            }
        }
        return result;
    }

    private boolean overlapsExcludedContext(String checklistItem, AiAnalysisResultDTO.TaskItem taskItem) {
        return overlapsAny(checklistItem, taskItem.getDuringEventInstructions())
                || overlapsAny(checklistItem, taskItem.getReferenceInfo());
    }

    private boolean overlapsAny(String checklistItem, List<String> excludedItems) {
        if (excludedItems == null || excludedItems.isEmpty()) return false;
        String normalizedChecklist = normalizeForComparison(checklistItem);
        if (normalizedChecklist.isBlank()) return true;
        for (String excludedItem : excludedItems) {
            String normalizedExcluded = normalizeForComparison(excludedItem);
            if (normalizedExcluded.isBlank()) continue;
            if (normalizedChecklist.equals(normalizedExcluded)
                    || normalizedChecklist.length() >= 8 && normalizedExcluded.contains(normalizedChecklist)
                    || normalizedExcluded.length() >= 8 && normalizedChecklist.contains(normalizedExcluded)) {
                return true;
            }
        }
        return false;
    }

    private boolean containsEquivalentItem(List<String> items, String candidate) {
        String normalizedCandidate = normalizeForComparison(candidate);
        for (String item : items) {
            if (normalizeForComparison(item).equals(normalizedCandidate)) {
                return true;
            }
        }
        return false;
    }

    private String normalizeForComparison(String text) {
        if (text == null) return "";
        StringBuilder builder = new StringBuilder();
        for (int i = 0; i < text.length(); i++) {
            char ch = Character.toLowerCase(text.charAt(i));
            if (Character.isLetterOrDigit(ch)) {
                builder.append(ch);
            }
        }
        return builder.toString();
    }

    private String buildTaskDescription(AiAnalysisResultDTO.TaskItem taskItem) {
        StringBuilder description = new StringBuilder(
                taskItem.getDescription() != null ? taskItem.getDescription() : "");
        appendListSection(description, "现场/执行时注意事项", taskItem.getDuringEventInstructions());
        appendListSection(description, "参考信息", taskItem.getReferenceInfo());
        return description.toString();
    }

    private void appendListSection(StringBuilder builder, String title, List<String> items) {
        if (items == null || items.isEmpty()) return;
        if (builder.length() > 0) builder.append("\n\n");
        builder.append(title).append(":\n");
        for (String item : items) {
            if (item != null && !item.isBlank()) {
                builder.append("- ").append(item.trim()).append("\n");
            }
        }
    }
}
