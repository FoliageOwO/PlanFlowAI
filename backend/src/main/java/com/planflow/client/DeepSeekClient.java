package com.planflow.client;
import com.planflow.dto.AiAnalysisResultDTO;
import com.planflow.entity.SourceInput;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.planflow.config.PlanFlowProperties;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.*;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestTemplate;

import java.util.List;
import java.util.Map;

@Slf4j
@Component("deepSeekClient")
@RequiredArgsConstructor
public class DeepSeekClient implements AiClient {

    private final PlanFlowProperties planFlowProperties;
    private final AiPromptBuilder aiPromptBuilder;
    private final AiResultParser aiResultParser;
    private final RestTemplate restTemplate = new RestTemplate();
    private final ObjectMapper objectMapper = new ObjectMapper();

    @Override
    public AiAnalysisResultDTO analyze(String rawText, String sourceType) {
        String apiKey = planFlowProperties.getAi().getDeepseekApiKey();
        String baseUrl = planFlowProperties.getAi().getDeepseekBaseUrl();
        String url = baseUrl + "/chat/completions";

        String systemPrompt = aiPromptBuilder.buildPrompt(rawText, sourceType);
        log.info("Built prompt, length: {}", systemPrompt.length());

        Map<String, Object> requestBody = Map.of(
                "model", "deepseek-chat",
                "messages", List.of(
                        Map.of("role", "system", "content", systemPrompt)
                ),
                "response_format", Map.of("type", "json_object"),
                "temperature", 0.3
        );

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.setBearerAuth(apiKey);

        HttpEntity<Map<String, Object>> entity = new HttpEntity<>(requestBody, headers);

        log.info("Sending request to DeepSeek API...");
        ResponseEntity<String> response;
        try {
            response = restTemplate.exchange(url, HttpMethod.POST, entity, String.class);
        } catch (Exception e) {
            log.error("DeepSeek API call failed", e);
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
            JsonNode content = choices.get(0).get("message").get("content");
            if (content == null || content.asText().isBlank()) {
                throw new RuntimeException("AI response content is empty");
            }

            String contentText = content.asText();
            log.info("AI response received, length: {}", contentText.length());

            AiAnalysisResultDTO result = aiResultParser.parse(contentText);
            log.info("AI analysis completed successfully");
            return result;
        } catch (Exception e) {
            log.error("Failed to parse DeepSeek response", e);
            throw new RuntimeException("AI response parse failed: " + e.getMessage(), e);
        }
    }
}
