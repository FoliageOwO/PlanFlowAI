package com.planflow.client;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.planflow.dto.AiAnalysisResultDTO;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.client.RestTemplate;

import java.util.List;
import java.util.Map;

@Slf4j
@RequiredArgsConstructor
public abstract class OpenAiCompatibleChatClient implements AiClient {

    private final AiPromptBuilder aiPromptBuilder;
    private final AiResultParser aiResultParser;
    private final RestTemplate restTemplate = new RestTemplate();
    private final ObjectMapper objectMapper = new ObjectMapper();

    protected abstract String baseUrl();
    protected abstract String apiKey();

    @Override
    public AiAnalysisResultDTO analyze(String rawText, String sourceType) {
        String url = normalizedBaseUrl() + "/chat/completions";
        String systemPrompt = aiPromptBuilder.buildPrompt(rawText, sourceType);
        log.info("Built {} prompt, length: {}", providerName(), systemPrompt.length());

        String contentText = callChat(url, List.of(
                Map.of("role", "system", "content", systemPrompt)
        ), 0.3);

        try {
            AiAnalysisResultDTO result = aiResultParser.parse(contentText);
            log.info("{} analysis completed successfully", providerName());
            return result;
        } catch (Exception parseError) {
            log.warn("Initial {} JSON parse failed, requesting one repair attempt: {}",
                    providerName(), parseError.getMessage());
            String repairedContent = callChat(url, List.of(
                    Map.of("role", "system", "content", aiPromptBuilder.buildJsonRepairPrompt()),
                    Map.of("role", "user", "content", contentText)
            ), 0.0);
            try {
                AiAnalysisResultDTO result = aiResultParser.parse(repairedContent);
                log.info("{} analysis completed after JSON repair", providerName());
                return result;
            } catch (Exception repairError) {
                log.error("Failed to parse repaired {} response", providerName(), repairError);
                throw new RuntimeException("AI response parse failed after repair: " + repairError.getMessage(), repairError);
            }
        }
    }

    private String normalizedBaseUrl() {
        String value = baseUrl();
        if (value == null || value.isBlank()) {
            throw new RuntimeException("AI baseUrl is not configured for provider: " + providerName());
        }
        return value.endsWith("/") ? value.substring(0, value.length() - 1) : value;
    }

    private String callChat(String url, List<Map<String, String>> messages, double temperature) {
        if (apiKey() == null || apiKey().isBlank()) {
            throw new RuntimeException("AI apiKey is not configured for provider: " + providerName());
        }

        Map<String, Object> requestBody = Map.of(
                "model", modelName(),
                "messages", messages,
                "response_format", Map.of("type", "json_object"),
                "temperature", temperature
        );

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.setBearerAuth(apiKey());

        ResponseEntity<String> response;
        try {
            log.info("Sending request to {} model={}", providerName(), modelName());
            response = restTemplate.exchange(url, HttpMethod.POST, new HttpEntity<>(requestBody, headers), String.class);
        } catch (Exception e) {
            log.error("{} API call failed", providerName(), e);
            throw new RuntimeException("AI service call failed: " + e.getMessage(), e);
        }

        if (response.getBody() == null) {
            throw new RuntimeException("AI service returned empty response");
        }

        try {
            JsonNode root = objectMapper.readTree(response.getBody());
            JsonNode choices = root.get("choices");
            if (choices == null || !choices.isArray() || choices.isEmpty()) {
                throw new RuntimeException("AI response missing choices");
            }
            JsonNode message = choices.get(0).get("message");
            JsonNode content = message == null ? null : message.get("content");
            if (content == null || content.asText().isBlank()) {
                throw new RuntimeException("AI response content is empty");
            }

            String contentText = content.asText();
            log.info("AI response received from {}, length: {}", providerName(), contentText.length());
            return contentText;
        } catch (Exception e) {
            log.error("Failed to parse {} response envelope", providerName(), e);
            throw new RuntimeException("AI response envelope parse failed: " + e.getMessage(), e);
        }
    }
}
