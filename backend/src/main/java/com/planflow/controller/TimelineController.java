package com.planflow.controller;
import com.planflow.service.*;
import com.planflow.common.ApiResponse;
import com.planflow.common.ErrorCode;
import com.planflow.entity.TimelineEvent;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;

@RestController
@RequestMapping("/api/timeline")
@RequiredArgsConstructor
public class TimelineController {

    private final TimelineService timelineService;

    @GetMapping
    public ApiResponse getTimeline(
            @RequestParam(required = false) @DateTimeFormat(pattern = "yyyy-MM-dd") LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(pattern = "yyyy-MM-dd") LocalDate to,
            @RequestParam(required = false) String type) {
        LocalDateTime fromDt = from != null ? from.atStartOfDay() : null;
        LocalDateTime toDt = to != null ? to.atTime(LocalTime.MAX) : null;
        List<TimelineEvent> events = timelineService.getTimeline(fromDt, toDt, type);
        return ApiResponse.success(events);
    }

    @GetMapping("/{id}")
    public ApiResponse getTimelineEvent(@PathVariable Long id) {
        try {
            return ApiResponse.success(timelineService.getEvent(id));
        } catch (Exception e) {
            return ApiResponse.error(ErrorCode.NOT_FOUND, e.getMessage());
        }
    }
}
