package com.planflow.client;

import lombok.extern.slf4j.Slf4j;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Component;

import java.nio.charset.StandardCharsets;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.time.format.DateTimeFormatter;

@Slf4j
@Component
public class AiPromptBuilder {

    private static final String ANALYSIS_PROMPT_PATH = "prompts/ai-analysis-v1.md";
    private static final String JSON_REPAIR_PROMPT_PATH = "prompts/ai-json-repair-v1.md";

    public String buildPrompt(String rawText, String sourceType) {
        ZonedDateTime now = ZonedDateTime.now(ZoneId.of("Asia/Shanghai"));
        String currentTime = now.format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss"));
        String timezone = "Asia/Shanghai (UTC+8)";

        // Truncate rawText to avoid exceeding token limits
        String truncatedText = rawText;
        if (rawText != null && rawText.length() > 8000) {
            truncatedText = rawText.substring(0, 8000) + "\n...[内容过长已截断]";
        }

        return buildPromptContent(currentTime, timezone, sourceType, truncatedText);
    }

    public String buildJsonRepairPrompt() {
        return loadPrompt(JSON_REPAIR_PROMPT_PATH);
    }

    private String buildPromptContent(String currentTime, String timezone, String sourceType, String text) {
        return loadPrompt(ANALYSIS_PROMPT_PATH)
                .replace("{{currentTime}}", currentTime)
                .replace("{{timezone}}", timezone)
                .replace("{{sourceType}}", sourceType)
                .replace("{{text}}", text != null ? text : "");
    }

    private String loadPrompt(String path) {
        try {
            return new ClassPathResource(path).getContentAsString(StandardCharsets.UTF_8);
        } catch (Exception e) {
            log.error("Failed to load AI prompt template: {}", path, e);
            throw new IllegalStateException("AI prompt template not found: " + path, e);
        }
    }
}
