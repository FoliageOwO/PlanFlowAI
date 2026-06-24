package com.planflow.controller;
import com.planflow.service.*;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.planflow.common.ApiResponse;
import com.planflow.common.ErrorCode;
import com.planflow.entity.ParseJob;
import com.planflow.entity.Task;
import com.planflow.repository.TaskMapper;
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

    @GetMapping("/{id}")
    public ApiResponse getJob(@PathVariable Long id) {
        ParseJob job = parseJobService.getJobById(id);
        if (job == null) {
            return ApiResponse.error(ErrorCode.NOT_FOUND, "Job not found");
        }
        Map<String, Object> data = new HashMap<>();
        data.put("jobId", job.getId());
        data.put("status", job.getStatus());
        data.put("stage", job.getStage());
        data.put("progress", job.getProgress());
        data.put("errorMessage", job.getErrorMessage());

        // Query tasks generated from this job's source input
        if ("COMPLETED".equals(job.getStatus()) && job.getSourceInputId() != null) {
            List<Task> tasks = taskMapper.selectList(
                    new LambdaQueryWrapper<Task>()
                            .eq(Task::getSourceInputId, job.getSourceInputId())
                            .eq(Task::getUserId, job.getUserId())
                            .last("LIMIT 1"));
            if (!tasks.isEmpty()) {
                data.put("taskId", tasks.get(0).getId());
            }
        }

        return ApiResponse.success(data);
    }

    @PostMapping("/{id}/retry")
    public ApiResponse retryJob(@PathVariable Long id) {
        try {
            parseJobService.retryJob(id);
            Map<String, Object> retryData = new HashMap<>();
            retryData.put("jobId", id);
            retryData.put("status", "PENDING");
            return ApiResponse.success(retryData);
        } catch (Exception e) {
            return ApiResponse.error(ErrorCode.BAD_REQUEST, e.getMessage());
        }
    }
}
