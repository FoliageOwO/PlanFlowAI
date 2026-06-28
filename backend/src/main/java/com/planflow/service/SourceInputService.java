package com.planflow.service;
import com.planflow.dto.CreateInputResult;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.planflow.common.SecurityUtils;
import com.planflow.config.PlanFlowProperties;
import com.planflow.entity.ParseJob;
import com.planflow.entity.Notification;
import com.planflow.entity.ReminderRule;
import com.planflow.entity.SourceInput;
import com.planflow.entity.Task;
import com.planflow.entity.TimelineEvent;
import com.planflow.repository.NotificationMapper;
import com.planflow.repository.ReminderRuleMapper;
import com.planflow.repository.SourceInputMapper;
import com.planflow.repository.TaskMapper;
import com.planflow.repository.TimelineEventMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.File;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.LocalDateTime;
import java.util.Arrays;
import java.util.HashSet;
import java.util.List;
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
    private final TaskMapper taskMapper;
    private final TimelineEventMapper timelineEventMapper;
    private final ReminderRuleMapper reminderRuleMapper;
    private final NotificationMapper notificationMapper;

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
            // Sanitize filename: remove path traversal characters
            String safeFilename = originalFilename != null
                    ? originalFilename.replaceAll("[/\\\\:<>\"|?*]", "_")
                    : "upload_" + input.getId();
            Path filePath = targetDir.resolve(safeFilename).normalize();

            // Ensure resolved path is still within targetDir (security check)
            if (!filePath.startsWith(targetDir.normalize())) {
                throw new IOException("Filename path traversal detected: " + originalFilename);
            }

            file.transferTo(filePath.toFile());
            input.setFilePath(filePath.toString());
            sourceInputMapper.updateById(input);
            log.info("File saved: userId={}, inputId={}, path={}, size={}",
                    userId, input.getId(), filePath, file.getSize());
        } catch (IOException e) {
            log.error("Failed to save uploaded file: userId={}, inputId={}, dir={}, filename={}",
                    userId, input.getId(), targetDir, originalFilename, e);
            throw new RuntimeException("文件保存失败，请检查上传目录权限: " + e.getMessage(), e);
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

    @Transactional
    public ParseJob reparseInput(Long id, String rawText) {
        SourceInput input = getInput(id);
        if (rawText != null && !rawText.isBlank()) {
            input.setRawText(rawText.trim());
        }
        String textForParsing = input.getRawText() != null && !input.getRawText().isBlank()
                ? input.getRawText()
                : input.getOriginalText();
        if (textForParsing == null || textForParsing.isBlank()) {
            throw new RuntimeException("rawText is required before reparsing");
        }

        cleanupGeneratedObjects(input);
        input.setStatus("CREATED");
        input.setErrorMessage(null);
        input.setUpdatedAt(LocalDateTime.now());
        sourceInputMapper.updateById(input);
        return parseJobService.createJob(input.getUserId(), input.getId());
    }

    private void cleanupGeneratedObjects(SourceInput input) {
        Long userId = input.getUserId();
        Long sourceInputId = input.getId();
        List<Task> tasks = taskMapper.selectList(new LambdaQueryWrapper<Task>()
                .eq(Task::getUserId, userId)
                .eq(Task::getSourceInputId, sourceInputId));
        List<Long> taskIds = tasks.stream().map(Task::getId).toList();
        if (!taskIds.isEmpty()) {
            notificationMapper.delete(new LambdaQueryWrapper<Notification>()
                    .eq(Notification::getUserId, userId)
                    .in(Notification::getTaskId, taskIds));
            reminderRuleMapper.delete(new LambdaQueryWrapper<ReminderRule>()
                    .eq(ReminderRule::getUserId, userId)
                    .in(ReminderRule::getTaskId, taskIds));
            taskMapper.delete(new LambdaQueryWrapper<Task>()
                    .eq(Task::getUserId, userId)
                    .eq(Task::getSourceInputId, sourceInputId));
        }
        timelineEventMapper.delete(new LambdaQueryWrapper<TimelineEvent>()
                .eq(TimelineEvent::getUserId, userId)
                .eq(TimelineEvent::getSourceInputId, sourceInputId));
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
