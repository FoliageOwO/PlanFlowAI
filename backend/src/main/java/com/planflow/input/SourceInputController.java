package com.planflow.input;

import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.planflow.common.ApiResponse;
import com.planflow.common.ErrorCode;
import com.planflow.entity.SourceInput;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.Map;

@Slf4j
@RestController
@RequiredArgsConstructor
public class SourceInputController {

    private final SourceInputService sourceInputService;

    @PostMapping("/api/inputs/text")
    public ApiResponse createTextInput(@RequestBody Map<String, String> body) {
        String content = body.get("content");
        if (content == null || content.isBlank()) {
            return ApiResponse.error(ErrorCode.BAD_REQUEST, "content is required");
        }
        try {
            CreateInputResult result = sourceInputService.createTextInput(content);
            return ApiResponse.success(Map.of("inputId", result.getInputId(), "jobId", result.getJobId()));
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
            return ApiResponse.success(Map.of(
                    "inputId", result.getInputId(),
                    "jobId", result.getJobId(),
                    "fileName", result.getFileName()
            ));
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
        return ApiResponse.success(result);
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
