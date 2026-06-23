package com.planflow.job;

import com.planflow.common.ApiResponse;
import com.planflow.common.ErrorCode;
import com.planflow.entity.ParseJob;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/jobs")
@RequiredArgsConstructor
public class ParseJobController {

    private final ParseJobService parseJobService;

    @GetMapping("/{id}")
    public ApiResponse getJob(@PathVariable Long id) {
        ParseJob job = parseJobService.getJobById(id);
        if (job == null) {
            return ApiResponse.error(ErrorCode.NOT_FOUND, "Job not found");
        }
        return ApiResponse.success(Map.of(
                "jobId", job.getId(),
                "status", job.getStatus(),
                "stage", job.getStage(),
                "progress", job.getProgress(),
                "errorMessage", job.getErrorMessage()
        ));
    }
}
