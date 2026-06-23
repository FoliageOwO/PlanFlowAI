package com.planflow.job;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.planflow.ai.AiAnalysisResultDTO;
import com.planflow.ai.AiClient;
import com.planflow.entity.AiAnalysisResult;
import com.planflow.entity.ParseJob;
import com.planflow.entity.SourceInput;
import com.planflow.extract.TextExtractService;
import com.planflow.mapper.AiAnalysisResultMapper;
import com.planflow.mapper.SourceInputMapper;
import com.planflow.notification.NotificationService;
import com.planflow.ocr.OcrClient;
import com.planflow.task.TaskGenerateService;
import lombok.RequiredArgsConstructor;
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
            aiResult.setModelName("deepseek-chat");
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
        String sourceType = sourceInput.getSourceType().toUpperCase();

        return switch (sourceType) {
            case "TEXT" -> sourceInput.getOriginalText();
            case "IMAGE" -> {
                File imageFile = new File(sourceInput.getFilePath());
                if (!imageFile.exists()) {
                    throw new RuntimeException("Image file not found: " + sourceInput.getFilePath());
                }
                yield ocrClient.recognize(imageFile);
            }
            case "PDF", "DOCX" -> {
                File docFile = new File(sourceInput.getFilePath());
                if (!docFile.exists()) {
                    throw new RuntimeException("File not found: " + sourceInput.getFilePath());
                }
                yield textExtractService.extract(docFile, sourceType);
            }
            default -> throw new RuntimeException("Unsupported source type: " + sourceType);
        };
    }
}
