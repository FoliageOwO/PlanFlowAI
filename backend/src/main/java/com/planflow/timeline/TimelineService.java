package com.planflow.timeline;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.planflow.common.SecurityUtils;
import com.planflow.entity.TimelineEvent;
import com.planflow.mapper.TimelineEventMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
public class TimelineService {

    private final TimelineEventMapper timelineEventMapper;
    private final SecurityUtils securityUtils;

    public List<TimelineEvent> getTimeline(LocalDateTime from, LocalDateTime to, String eventType) {
        Long userId = securityUtils.getCurrentUserId();

        LambdaQueryWrapper<TimelineEvent> wrapper = new LambdaQueryWrapper<TimelineEvent>()
                .eq(TimelineEvent::getUserId, userId);

        if (from != null) wrapper.ge(TimelineEvent::getStartTime, from);
        if (to != null) wrapper.le(TimelineEvent::getStartTime, to);
        if (eventType != null && !eventType.isBlank()) wrapper.eq(TimelineEvent::getEventType, eventType);

        wrapper.orderByAsc(TimelineEvent::getStartTime);

        return timelineEventMapper.selectList(wrapper);
    }
}
