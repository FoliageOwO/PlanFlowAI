package com.planflow.timeline;

import com.planflow.common.ApiResponse;
import com.planflow.entity.TimelineEvent;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;

@RestController
@RequestMapping("/api/timeline")
@RequiredArgsConstructor
public class TimelineController {

    private final TimelineService timelineService;

    @GetMapping
    public ApiResponse getTimeline(
            @RequestParam @DateTimeFormat(pattern = "yyyy-MM-dd") LocalDateTime from,
            @RequestParam @DateTimeFormat(pattern = "yyyy-MM-dd") LocalDateTime to,
            @RequestParam(required = false) String type) {
        List<TimelineEvent> events = timelineService.getTimeline(from, to, type);
        return ApiResponse.success(events);
    }
}
