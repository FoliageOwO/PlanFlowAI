package com.planflow.controller;
import com.planflow.service.*;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.planflow.common.ApiResponse;
import com.planflow.common.ErrorCode;
import com.planflow.common.SecurityUtils;
import com.planflow.entity.AiAnalysisResult;
import com.planflow.entity.ParseJob;
import com.planflow.entity.Task;
import com.planflow.entity.TimelineEvent;
import com.planflow.repository.AiAnalysisResultMapper;
import com.planflow.repository.TaskMapper;
import com.planflow.repository.TimelineEventMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/jobs")
@RequiredArgsConstructor
public class ParseJobController {

    private final ParseJobService parseJobService;
    private final TaskMapper taskMapper;
    private final TimelineEventMapper timelineEventMapper;
    private final AiAnalysisResultMapper aiAnalysisResultMapper;
    private final SecurityUtils securityUtils;
    private final ObjectMapper objectMapper = new ObjectMapper();

    @GetMapping("/{id}")
    public ApiResponse getJob(@PathVariable Long id) {
        ParseJob job = getOwnedJob(id);
        if (job == null) {
            return ApiResponse.error(ErrorCode.NOT_FOUND, "Job not found");
        }
        Map<String, Object> data = new HashMap<>();
        data.put("jobId", job.getId());
        data.put("sourceInputId", job.getSourceInputId());
        data.put("status", job.getStatus());
        data.put("stage", job.getStage());
        data.put("progress", job.getProgress());
        data.put("errorMessage", job.getErrorMessage());

        // Query tasks generated from this job's source input
        if ("COMPLETED".equals(job.getStatus()) && job.getSourceInputId() != null) {
            List<Task> tasks = findGeneratedTasks(job);
            List<TimelineEvent> events = findGeneratedEvents(job);
            data.put("taskCount", tasks.size());
            data.put("eventCount", events.size());
            if (!tasks.isEmpty()) {
                data.put("taskId", tasks.get(0).getId());
            }
            data.put("resultPath", "/jobs/" + job.getId() + "/result");
        }

        return ApiResponse.success(data);
    }

    @GetMapping("/{id}/result")
    public ApiResponse getJobResult(@PathVariable Long id) {
        try {
            ParseJob job = getOwnedJob(id);
            if (job == null) return ApiResponse.error(ErrorCode.NOT_FOUND, "Job not found");
            if (!"COMPLETED".equals(job.getStatus())) {
                return ApiResponse.error(ErrorCode.BAD_REQUEST, "Job is not completed");
            }

            AiAnalysisResult aiResult = aiAnalysisResultMapper.selectOne(
                    new LambdaQueryWrapper<AiAnalysisResult>()
                            .eq(AiAnalysisResult::getUserId, job.getUserId())
                            .eq(AiAnalysisResult::getSourceInputId, job.getSourceInputId())
                            .orderByDesc(AiAnalysisResult::getCreatedAt)
                            .last("LIMIT 1"));

            Map<String, Object> data = new HashMap<>();
            data.put("jobId", job.getId());
            data.put("sourceInputId", job.getSourceInputId());
            data.put("tasks", findGeneratedTasks(job).stream().map(this::toTaskItem).toList());
            data.put("events", findGeneratedEvents(job).stream().map(this::toEventItem).toList());
            if (aiResult != null) {
                data.put("aiResultId", aiResult.getId());
                data.put("summary", aiResult.getSummary());
                data.put("modelName", aiResult.getModelName());
                data.put("createdAt", aiResult.getCreatedAt());
                data.put("analysis", objectMapper.readValue(aiResult.getParsedJson(), Map.class));
            }
            return ApiResponse.success(data);
        } catch (Exception e) {
            return ApiResponse.error(ErrorCode.SERVER_ERROR, e.getMessage());
        }
    }

    @PostMapping("/{id}/retry")
    public ApiResponse retryJob(@PathVariable Long id) {
        try {
            ParseJob job = getOwnedJob(id);
            if (job == null) return ApiResponse.error(ErrorCode.NOT_FOUND, "Job not found");
            parseJobService.retryJob(id);
            Map<String, Object> retryData = new HashMap<>();
            retryData.put("jobId", id);
            retryData.put("status", "PENDING");
            return ApiResponse.success(retryData);
        } catch (Exception e) {
            return ApiResponse.error(ErrorCode.BAD_REQUEST, e.getMessage());
        }
    }

    private ParseJob getOwnedJob(Long id) {
        ParseJob job = parseJobService.getJobById(id);
        if (job == null) return null;
        Long userId = securityUtils.getCurrentUserId();
        return job.getUserId().equals(userId) ? job : null;
    }

    private List<Task> findGeneratedTasks(ParseJob job) {
        return taskMapper.selectList(new LambdaQueryWrapper<Task>()
                .eq(Task::getSourceInputId, job.getSourceInputId())
                .eq(Task::getUserId, job.getUserId())
                .orderByAsc(Task::getDeadline));
    }

    private List<TimelineEvent> findGeneratedEvents(ParseJob job) {
        return timelineEventMapper.selectList(new LambdaQueryWrapper<TimelineEvent>()
                .eq(TimelineEvent::getSourceInputId, job.getSourceInputId())
                .eq(TimelineEvent::getUserId, job.getUserId())
                .orderByAsc(TimelineEvent::getStartTime));
    }

    private Map<String, Object> toTaskItem(Task task) {
        Map<String, Object> item = new HashMap<>();
        item.put("id", task.getId());
        item.put("title", task.getTitle());
        item.put("description", task.getDescription());
        item.put("status", task.getStatus());
        item.put("priority", task.getPriority());
        item.put("deadline", task.getDeadline());
        return item;
    }

    private Map<String, Object> toEventItem(TimelineEvent event) {
        Map<String, Object> item = new HashMap<>();
        item.put("id", event.getId());
        item.put("title", event.getTitle());
        item.put("description", event.getDescription());
        item.put("startTime", event.getStartTime());
        item.put("endTime", event.getEndTime());
        item.put("location", event.getLocation());
        return item;
    }
}
