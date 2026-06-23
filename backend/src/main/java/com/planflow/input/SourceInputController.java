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
@RequestMapping("/api/inputs")
@RequiredArgsConstructor
public class SourceInputController {

    private final SourceInputService sourceInputService;

    @PostMapping("/text")
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

    @PostMapping("/upload")
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

    @GetMapping
    public ApiResponse listInputs(@RequestParam(defaultValue = "1") int page,
                                   @RequestParam(defaultValue = "10") int size) {
        Page<SourceInput> result = sourceInputService.listInputs(page, size);
        return ApiResponse.success(result);
    }

    @GetMapping("/{id}")
    public ApiResponse getInput(@PathVariable Long id) {
        try {
            SourceInput input = sourceInputService.getInput(id);
            return ApiResponse.success(input);
        } catch (Exception e) {
            return ApiResponse.error(ErrorCode.NOT_FOUND, e.getMessage());
        }
    }

    @DeleteMapping("/{id}")
    public ApiResponse deleteInput(@PathVariable Long id) {
        try {
            sourceInputService.deleteInput(id);
            return ApiResponse.success();
        } catch (Exception e) {
            return ApiResponse.error(ErrorCode.NOT_FOUND, e.getMessage());
        }
    }
}
