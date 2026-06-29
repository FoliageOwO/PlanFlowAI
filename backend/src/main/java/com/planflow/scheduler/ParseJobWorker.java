package com.planflow.scheduler;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.planflow.dto.AiAnalysisResultDTO;
import com.planflow.client.AiClient;
import com.planflow.entity.AiAnalysisResult;
import com.planflow.entity.ParseJob;
import com.planflow.entity.SourceInput;
import com.planflow.service.TextExtractService;
import com.planflow.repository.AiAnalysisResultMapper;
import com.planflow.repository.SourceInputMapper;
import com.planflow.service.NotificationService;
import com.planflow.client.OcrClient;
import com.planflow.service.TaskGenerateService;
import com.planflow.service.ParseJobService;import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.io.File;
import java.time.LocalDateTime;
import java.util.List;

@Slf4j
@Component
@RequiredArgsConstructor
public class ParseJobWorker {

    private final ParseJobService parseJobService;
    private final SourceInputMapper sourceInputMapper;
    private final AiAnalysisResultMapper aiAnalysisResultMapper;
    private final AiClient aiClient;
    private final OcrClient ocrClient;
    private final TextExtractService textExtractService;
    private final TaskGenerateService taskGenerateService;
    private final NotificationService notificationService;
    private final ObjectMapper objectMapper = new ObjectMapper();

    @Scheduled(fixedDelay = 5000)
    public void processJobs() {
        List<ParseJob> pendingJobs = parseJobService.getPendingJobs(5);
        if (pendingJobs.isEmpty()) {
            return;
        }

        log.info("Found {} pending jobs to process", pendingJobs.size());

        for (ParseJob job : pendingJobs) {
            try {
                processJob(job);
            } catch (Exception e) {
                log.error("Job processing failed: jobId={}", job.getId(), e);
                parseJobService.markFailed(job.getId(), e.getMessage());
                notificationService.createParseFailedNotification(job.getUserId(), job.getSourceInputId());
            }
        }
    }

    private void processJob(ParseJob job) {
        parseJobService.markRunning(job.getId());

        // Load source input
        SourceInput sourceInput = sourceInputMapper.selectById(job.getSourceInputId());
        if (sourceInput == null) {
            throw new RuntimeException("Source input not found: " + job.getSourceInputId());
        }

        parseJobService.updateProgress(job.getId(), 10, "EXTRACTING");

        // Extract raw text based on source type
        String rawText = extractRawText(sourceInput);
        parseJobService.updateProgress(job.getId(), 30, "EXTRACTED");

        // AI analysis
        parseJobService.updateProgress(job.getId(), 40, "AI_ANALYZING");
        log.info("Starting AI analysis for sourceInputId={}, sourceType={}", sourceInput.getId(), sourceInput.getSourceType());
        AiAnalysisResultDTO analysisResult = aiClient.analyze(rawText, sourceInput.getSourceType());
        parseJobService.updateProgress(job.getId(), 70, "AI_COMPLETED");

        // Save AI analysis result
        try {
            AiAnalysisResult aiResult = new AiAnalysisResult();
            aiResult.setUserId(job.getUserId());
            aiResult.setSourceInputId(sourceInput.getId());
            aiResult.setModelName(aiClient.providerName() + "/" + aiClient.modelName());
            aiResult.setSummary(analysisResult.getSummary());
            aiResult.setParsedJson(objectMapper.writeValueAsString(analysisResult));
            aiResult.setCreatedAt(LocalDateTime.now());
            aiAnalysisResultMapper.insert(aiResult);
        } catch (Exception e) {
            log.warn("Failed to save AI analysis result: {}", e.getMessage());
        }

        // Generate tasks, events, reminders
        parseJobService.updateProgress(job.getId(), 80, "GENERATING_TASKS");
        taskGenerateService.generateFromAnalysis(job.getUserId(), sourceInput.getId(), analysisResult);

        // Update source input status
        sourceInput.setStatus("COMPLETED");
        sourceInput.setRawText(rawText);
        sourceInputMapper.updateById(sourceInput);

        parseJobService.updateProgress(job.getId(), 95, "FINALIZING");
        parseJobService.markCompleted(job.getId());

        // Send notification
        notificationService.createParseCompletedNotification(job.getUserId(), job.getSourceInputId());

        log.info("Job completed successfully: jobId={}", job.getId());
    }

    private String extractRawText(SourceInput sourceInput) {
        if (sourceInput.getRawText() != null && !sourceInput.getRawText().isBlank()) {
            return sourceInput.getRawText();
        }
        String sourceType = sourceInput.getSourceType().toUpperCase();

        String extractedText = switch (sourceType) {
            case "TEXT" -> sourceInput.getOriginalText();
            case "IMAGE" -> {
                File imageFile = new File(sourceInput.getFilePath());
                if (!imageFile.exists()) {
                    throw new RuntimeException("图片文件不存在: " + sourceInput.getFilePath());
                }
                try {
                    yield ocrClient.recognize(imageFile);
                } catch (Exception e) {
                    log.warn("OCR failed for sourceInputId={}", sourceInput.getId(), e);
                    throw new RuntimeException("图片文字识别失败: " + e.getMessage(), e);
                }
            }
            case "PDF", "DOCX", "TXT" -> {
                File docFile = new File(sourceInput.getFilePath());
                if (!docFile.exists()) {
                    throw new RuntimeException("文件不存在: " + sourceInput.getFilePath());
                }
                yield textExtractService.extract(docFile, sourceType);
            }
            default -> throw new RuntimeException("不支持的文件类型: " + sourceType);
        };
        String supplement = sourceInput.getOriginalText();
        if (!"TEXT".equals(sourceType) && supplement != null && !supplement.isBlank()) {
            return "用户补充说明：\n" + supplement.trim() + "\n\n文件提取文本：\n" + extractedText;
        }
        return extractedText;
    }
}
