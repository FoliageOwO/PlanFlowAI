package com.planflow.controller;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.planflow.dto.*;import com.planflow.service.*;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.planflow.common.ApiResponse;
import com.planflow.common.ErrorCode;
import com.planflow.entity.AiAnalysisResult;
import com.planflow.entity.ParseJob;
import com.planflow.entity.SourceInput;
import com.planflow.entity.Task;
import com.planflow.entity.TimelineEvent;
import com.planflow.repository.AiAnalysisResultMapper;
import com.planflow.repository.ParseJobMapper;
import com.planflow.repository.TaskMapper;
import com.planflow.repository.TimelineEventMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.HashMap;
import java.util.Map;

@Slf4j
@RestController
@RequiredArgsConstructor
public class SourceInputController {

    private final SourceInputService sourceInputService;
    private final TaskMapper taskMapper;
    private final TimelineEventMapper timelineEventMapper;
    private final ParseJobMapper parseJobMapper;
    private final AiAnalysisResultMapper aiAnalysisResultMapper;
    private final ObjectMapper objectMapper = new ObjectMapper();

    @PostMapping("/api/inputs/text")
    public ApiResponse createTextInput(@RequestBody Map<String, String> body) {
        String content = body.get("content");
        if (content == null || content.isBlank()) {
            return ApiResponse.error(ErrorCode.BAD_REQUEST, "content is required");
        }
        try {
            CreateInputResult result = sourceInputService.createTextInput(content);
            Map<String, Object> textResult = new HashMap<>();
            textResult.put("inputId", result.getInputId());
            textResult.put("jobId", result.getJobId());
            return ApiResponse.success(textResult);
        } catch (Exception e) {
            log.error("Failed to create text input", e);
            return ApiResponse.error(ErrorCode.SERVER_ERROR, e.getMessage());
        }
    }

    @PostMapping("/api/inputs/upload")
    public ApiResponse uploadFile(@RequestParam("file") MultipartFile file,
                                   @RequestParam("sourceType") String sourceType) {
        if (file.isEmpty()) {
            return ApiResponse.error(ErrorCode.BAD_REQUEST, "file is empty");
        }
        if (sourceType == null || sourceType.isBlank()) {
            return ApiResponse.error(ErrorCode.BAD_REQUEST, "sourceType is required");
        }
        try {
            CreateInputResult result = sourceInputService.createFileUpload(file, sourceType.toUpperCase());
            Map<String, Object> uploadResult = new HashMap<>();
            uploadResult.put("inputId", result.getInputId());
            uploadResult.put("jobId", result.getJobId());
            uploadResult.put("fileName", result.getFileName());
            return ApiResponse.success(uploadResult);
        } catch (IllegalArgumentException e) {
            return ApiResponse.error(ErrorCode.BAD_REQUEST, e.getMessage());
        } catch (Exception e) {
            log.error("Failed to upload file", e);
            return ApiResponse.error(ErrorCode.SERVER_ERROR, e.getMessage());
        }
    }

    @GetMapping("/api/inputs")
    public ApiResponse listInputs(@RequestParam(defaultValue = "1") int page,
                                   @RequestParam(defaultValue = "10") int size) {
        Page<SourceInput> result = sourceInputService.listInputs(page, size);
        Map<String, Object> data = new HashMap<>();
        data.put("list", result.getRecords());
        data.put("total", result.getTotal());
        return ApiResponse.success(data);
    }

    @GetMapping("/api/inputs/{id}")
    public ApiResponse getInput(@PathVariable Long id) {
        try {
            SourceInput input = sourceInputService.getInput(id);
            return ApiResponse.success(input);
        } catch (Exception e) {
            return ApiResponse.error(ErrorCode.NOT_FOUND, e.getMessage());
        }
    }

    @GetMapping("/api/inputs/{id}/detail")
    public ApiResponse getInputDetail(@PathVariable Long id) {
        try {
            SourceInput input = sourceInputService.getInput(id);
            Map<String, Object> data = new HashMap<>();
            data.put("input", input);
            data.put("jobs", parseJobMapper.selectList(new LambdaQueryWrapper<ParseJob>()
                    .eq(ParseJob::getUserId, input.getUserId())
                    .eq(ParseJob::getSourceInputId, input.getId())
                    .orderByDesc(ParseJob::getCreatedAt)));
            data.put("tasks", taskMapper.selectList(new LambdaQueryWrapper<Task>()
                    .eq(Task::getUserId, input.getUserId())
                    .eq(Task::getSourceInputId, input.getId())
                    .orderByAsc(Task::getDeadline)));
            data.put("events", timelineEventMapper.selectList(new LambdaQueryWrapper<TimelineEvent>()
                    .eq(TimelineEvent::getUserId, input.getUserId())
                    .eq(TimelineEvent::getSourceInputId, input.getId())
                    .orderByAsc(TimelineEvent::getStartTime)));

            AiAnalysisResult aiResult = aiAnalysisResultMapper.selectOne(new LambdaQueryWrapper<AiAnalysisResult>()
                    .eq(AiAnalysisResult::getUserId, input.getUserId())
                    .eq(AiAnalysisResult::getSourceInputId, input.getId())
                    .orderByDesc(AiAnalysisResult::getCreatedAt)
                    .last("LIMIT 1"));
            if (aiResult != null) {
                Map<String, Object> result = new HashMap<>();
                result.put("id", aiResult.getId());
                result.put("summary", aiResult.getSummary());
                result.put("modelName", aiResult.getModelName());
                result.put("createdAt", aiResult.getCreatedAt());
                result.put("analysis", objectMapper.readValue(aiResult.getParsedJson(), Map.class));
                data.put("aiResult", result);
            }
            return ApiResponse.success(data);
        } catch (Exception e) {
            return ApiResponse.error(ErrorCode.NOT_FOUND, e.getMessage());
        }
    }

    @PostMapping("/api/inputs/{id}/reparse")
    public ApiResponse reparseInput(@PathVariable Long id, @RequestBody(required = false) Map<String, String> body) {
        try {
            String rawText = body != null ? body.get("rawText") : null;
            ParseJob job = sourceInputService.reparseInput(id, rawText);
            Map<String, Object> data = new HashMap<>();
            data.put("inputId", id);
            data.put("jobId", job.getId());
            return ApiResponse.success(data);
        } catch (Exception e) {
            return ApiResponse.error(ErrorCode.BAD_REQUEST, e.getMessage());
        }
    }

    @DeleteMapping("/api/inputs/{id}")
    public ApiResponse deleteInput(@PathVariable Long id) {
        try {
            sourceInputService.deleteInput(id);
            return ApiResponse.success();
        } catch (Exception e) {
            return ApiResponse.error(ErrorCode.NOT_FOUND, e.getMessage());
        }
    }

    // === Frontend 兼容路由 (前端使用 /api/jobs 路径) ===

    @PostMapping("/jobs")
    public ApiResponse createTextJob(@RequestBody Map<String, String> body) {
        return createTextInput(body);
    }

    @PostMapping("/jobs/upload")
    public ApiResponse uploadFileJob(@RequestParam("file") MultipartFile file,
                                      @RequestParam(value = "sourceType", required = false) String sourceType) {
        if (sourceType == null || sourceType.isBlank()) {
            // Frontend may not send sourceType; infer from file extension
            String filename = file.getOriginalFilename();
            if (filename != null && filename.contains(".")) {
                sourceType = filename.substring(filename.lastIndexOf(".") + 1).toUpperCase();
                if ("JPG".equals(sourceType) || "JPEG".equals(sourceType) || "PNG".equals(sourceType)
                        || "GIF".equals(sourceType) || "BMP".equals(sourceType) || "WEBP".equals(sourceType)) {
                    sourceType = "IMAGE";
                }
            }
            if (sourceType == null || sourceType.isBlank()) {
                return ApiResponse.error(ErrorCode.BAD_REQUEST, "sourceType is required");
            }
        }
        return uploadFile(file, sourceType);
    }
}
