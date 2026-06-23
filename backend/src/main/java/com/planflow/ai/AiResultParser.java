package com.planflow.ai;

import com.fasterxml.jackson.databind.DeserializationFeature;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.util.List;

@Slf4j
@Component
public class AiResultParser {

    private static final DateTimeFormatter FORMATTER = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");
    private final ObjectMapper objectMapper;

    public AiResultParser() {
        this.objectMapper = new ObjectMapper();
        this.objectMapper.configure(DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES, false);
        this.objectMapper.registerModule(new JavaTimeModule());
    }

    public AiAnalysisResultDTO parse(String rawJson) {
        try {
            String cleaned = cleanJson(rawJson);
            AiAnalysisResultDTO result = objectMapper.readValue(cleaned, AiAnalysisResultDTO.class);

            if (result.getSummary() == null || result.getSummary().isBlank()) {
                throw new RuntimeException("AI response missing summary field");
            }
            if (result.getTasks() == null) result.setTasks(List.of());
            if (result.getEvents() == null) result.setEvents(List.of());
            if (result.getGoals() == null) result.setGoals(List.of());
            if (result.getRisks() == null) result.setRisks(List.of());
            if (result.getConflicts() == null) result.setConflicts(List.of());
            if (result.getPlanningSuggestions() == null) result.setPlanningSuggestions(List.of());

            if (result.getTasks() != null) {
                for (AiAnalysisResultDTO.TaskItem task : result.getTasks()) {
                    task.setDeadline(normalizeDateTime(task.getDeadline()));
                    if (task.getSuggestedReminders() != null) {
                        for (AiAnalysisResultDTO.SuggestedReminder r : task.getSuggestedReminders()) {
                            r.setRemindAt(normalizeDateTime(r.getRemindAt()));
                        }
                    }
                }
            }
            if (result.getEvents() != null) {
                for (AiAnalysisResultDTO.EventItem event : result.getEvents()) {
                    event.setStartTime(normalizeDateTime(event.getStartTime()));
                    event.setEndTime(normalizeDateTime(event.getEndTime()));
                }
            }

            log.info("AI response parsed: {} tasks, {} events", result.getTasks().size(), result.getEvents().size());
            return result;
        } catch (Exception e) {
            log.error("Failed to parse AI response: {}", e.getMessage());
            throw new RuntimeException("AI response parse failed: " + e.getMessage(), e);
        }
    }

    private String cleanJson(String raw) {
        if (raw == null || raw.isBlank()) throw new RuntimeException("AI response is empty");
        String cleaned = raw.trim();
        if (cleaned.startsWith("```")) {
            int idx = cleaned.indexOf("\n");
            if (idx > 0) cleaned = cleaned.substring(idx + 1);
            if (cleaned.endsWith("```")) cleaned = cleaned.substring(0, cleaned.lastIndexOf("```")).trim();
        }
        int firstBrace = cleaned.indexOf('{');
        int lastBrace = cleaned.lastIndexOf('}');
        if (firstBrace >= 0 && lastBrace > firstBrace) {
            cleaned = cleaned.substring(firstBrace, lastBrace + 1);
        }
        return cleaned;
    }

    private String normalizeDateTime(String dt) {
        if (dt == null || dt.isBlank()) return null;
        try {
            if (dt.length() == 19) { LocalDateTime.parse(dt, FORMATTER); return dt; }
            if (dt.length() == 16) { LocalDateTime.parse(dt, DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm")); return dt + ":00"; }
            if (dt.length() == 10) { LocalDateTime.parse(dt + " 00:00:00", FORMATTER); return dt + " 00:00:00"; }
            return dt;
        } catch (DateTimeParseException e) {
            log.warn("Cannot normalize datetime: {}", dt);
            return dt;
        }
    }
}
