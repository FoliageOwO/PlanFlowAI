package com.planflow.input;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.planflow.common.SecurityUtils;
import com.planflow.config.PlanFlowProperties;
import com.planflow.entity.ParseJob;
import com.planflow.entity.SourceInput;
import com.planflow.job.ParseJobService;
import com.planflow.mapper.SourceInputMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.File;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.LocalDateTime;
import java.util.Arrays;
import java.util.HashSet;
import java.util.Set;

@Slf4j
@Service
@RequiredArgsConstructor
public class SourceInputService {

    private static final Set<String> ALLOWED_EXTENSIONS = new HashSet<>(Arrays.asList(
            "jpg", "jpeg", "png", "gif", "bmp", "webp", "pdf", "docx", "doc", "txt"
    ));
    private static final Set<String> ALLOWED_MIME_TYPES = new HashSet<>(Arrays.asList(
            "image/jpeg", "image/png", "image/gif", "image/bmp", "image/webp",
            "application/pdf",
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            "application/msword",
            "text/plain"
    ));
    private static final long MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB

    private final SourceInputMapper sourceInputMapper;
    private final ParseJobService parseJobService;
    private final PlanFlowProperties planFlowProperties;
    private final SecurityUtils securityUtils;

    public CreateInputResult createTextInput(String content) {
        Long userId = securityUtils.getCurrentUserId();

        SourceInput input = new SourceInput();
        input.setUserId(userId);
        input.setSourceType("TEXT");
        input.setTitle(content.length() > 100 ? content.substring(0, 100) + "..." : content);
        input.setOriginalText(content);
        input.setStatus("CREATED");
        input.setCreatedAt(LocalDateTime.now());
        input.setUpdatedAt(LocalDateTime.now());

        sourceInputMapper.insert(input);
        log.info("Created text input: id={}, userId={}", input.getId(), userId);

        // Create parse job
        ParseJob job = parseJobService.createJob(userId, input.getId());

        return new CreateInputResult(input.getId(), job.getId(), null);
    }

    public CreateInputResult createFileUpload(MultipartFile file, String sourceType) {
        Long userId = securityUtils.getCurrentUserId();
        String originalFilename = file.getOriginalFilename();

        // Validate file
        validateFile(file, sourceType);

        // Create source input record first to get ID
        SourceInput input = new SourceInput();
        input.setUserId(userId);
        input.setSourceType(sourceType.toUpperCase());
        input.setTitle(originalFilename);
        input.setOriginalName(originalFilename);
        input.setFileSize(file.getSize());
        input.setMimeType(file.getContentType());
        input.setStatus("CREATED");
        input.setCreatedAt(LocalDateTime.now());
        input.setUpdatedAt(LocalDateTime.now());

        sourceInputMapper.insert(input);

        // Save file to uploads/{userId}/{inputId}/
        String uploadDir = planFlowProperties.getUpload().getDir();
        Path targetDir = Paths.get(uploadDir, userId.toString(), input.getId().toString());
        try {
            Files.createDirectories(targetDir);
            Path filePath = targetDir.resolve(originalFilename);
            file.transferTo(filePath.toFile());
            input.setFilePath(filePath.toString());
            sourceInputMapper.updateById(input);
            log.info("File saved: {}", filePath);
        } catch (IOException e) {
            log.error("Failed to save uploaded file", e);
            throw new RuntimeException("File save failed: " + e.getMessage(), e);
        }

        // Create parse job
        ParseJob job = parseJobService.createJob(userId, input.getId());

        return new CreateInputResult(input.getId(), job.getId(), input.getOriginalName());
    }

    public Page<SourceInput> listInputs(int page, int size) {
        Long userId = securityUtils.getCurrentUserId();
        Page<SourceInput> pageParam = new Page<>(page, size);
        LambdaQueryWrapper<SourceInput> wrapper = new LambdaQueryWrapper<SourceInput>()
                .eq(SourceInput::getUserId, userId)
                .orderByDesc(SourceInput::getCreatedAt);
        return sourceInputMapper.selectPage(pageParam, wrapper);
    }

    public SourceInput getInput(Long id) {
        Long userId = securityUtils.getCurrentUserId();
        SourceInput input = sourceInputMapper.selectById(id);
        if (input == null || !input.getUserId().equals(userId)) {
            throw new RuntimeException("Source input not found");
        }
        return input;
    }

    public void deleteInput(Long id) {
        Long userId = securityUtils.getCurrentUserId();
        SourceInput input = sourceInputMapper.selectById(id);
        if (input == null || !input.getUserId().equals(userId)) {
            throw new RuntimeException("Source input not found");
        }
        sourceInputMapper.deleteById(id);
        log.info("Deleted source input: id={}", id);
    }

    private void validateFile(MultipartFile file, String sourceType) {
        if (file.isEmpty()) {
            throw new IllegalArgumentException("File is empty");
        }
        if (file.getSize() > MAX_FILE_SIZE) {
            throw new IllegalArgumentException("File size exceeds 20MB limit");
        }

        String filename = file.getOriginalFilename();
        if (filename != null && filename.contains(".")) {
            String ext = filename.substring(filename.lastIndexOf(".") + 1).toLowerCase();
            if (!ALLOWED_EXTENSIONS.contains(ext)) {
                throw new IllegalArgumentException("File type not allowed: " + ext);
            }
        }

        String mimeType = file.getContentType();
        if (mimeType != null && !ALLOWED_MIME_TYPES.contains(mimeType)) {
            // Only warn, don't reject - some clients may send generic mime types
            log.warn("Potentially unsupported MIME type: {}", mimeType);
        }
    }
}
