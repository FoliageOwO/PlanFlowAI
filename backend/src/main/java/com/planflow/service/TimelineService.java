package com.planflow.service;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.planflow.common.SecurityUtils;
import com.planflow.entity.Task;
import com.planflow.entity.TimelineEvent;
import com.planflow.repository.TaskMapper;
import com.planflow.repository.TimelineEventMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
public class TimelineService {

    private final TimelineEventMapper timelineEventMapper;
    private final TaskMapper taskMapper;
    private final SecurityUtils securityUtils;

    public List<TimelineEvent> getTimeline(LocalDateTime from, LocalDateTime to, String eventType) {
        Long userId = securityUtils.getCurrentUserId();

        LambdaQueryWrapper<TimelineEvent> wrapper = new LambdaQueryWrapper<TimelineEvent>()
                .eq(TimelineEvent::getUserId, userId);

        if (from != null) wrapper.ge(TimelineEvent::getStartTime, from);
        if (to != null) wrapper.le(TimelineEvent::getStartTime, to);
        if (eventType != null && !eventType.isBlank()) wrapper.eq(TimelineEvent::getEventType, eventType);

        wrapper.orderByAsc(TimelineEvent::getStartTime);

        List<TimelineEvent> events = timelineEventMapper.selectList(wrapper);
        attachLegacyTaskLinks(events, userId);
        return events;
    }

    public TimelineEvent getEvent(Long id) {
        Long userId = securityUtils.getCurrentUserId();
        TimelineEvent event = timelineEventMapper.selectById(id);
        if (event == null || !event.getUserId().equals(userId)) {
            throw new RuntimeException("Timeline event not found");
        }
        attachLegacyTaskLink(event, userId);
        return event;
    }

    public void deleteEvent(Long id) {
        TimelineEvent event = getEvent(id);
        timelineEventMapper.deleteById(event.getId());
    }

    private void attachLegacyTaskLinks(List<TimelineEvent> events, Long userId) {
        for (TimelineEvent event : events) {
            attachLegacyTaskLink(event, userId);
        }
    }

    private void attachLegacyTaskLink(TimelineEvent event, Long userId) {
        if (event.getTaskId() != null || event.getSourceInputId() == null || event.getStartTime() == null) {
            return;
        }
        Task task = taskMapper.selectOne(new LambdaQueryWrapper<Task>()
                .eq(Task::getUserId, userId)
                .eq(Task::getSourceInputId, event.getSourceInputId())
                .eq(Task::getDeadline, event.getStartTime())
                .last("LIMIT 1"));
        if (task != null) {
            event.setTaskId(task.getId());
        }
    }
}
