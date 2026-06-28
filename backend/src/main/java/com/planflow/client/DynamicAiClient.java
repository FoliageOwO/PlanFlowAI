package com.planflow.client;

import com.planflow.dto.AiAnalysisResultDTO;
import com.planflow.service.AiConfigService;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Primary;
import org.springframework.stereotype.Component;

@Primary
@Component
@RequiredArgsConstructor
public class DynamicAiClient implements AiClient {

    private final AiConfigService aiConfigService;
    private final DeepSeekClient deepSeekClient;
    private final QwenClient qwenClient;
    private final OpenAiCompatibleAiClient openAiCompatibleAiClient;

    @Override
    public String providerName() {
        return selected().providerName();
    }

    @Override
    public String modelName() {
        return selected().modelName();
    }

    @Override
    public AiAnalysisResultDTO analyze(String rawText, String sourceType) {
        return selected().analyze(rawText, sourceType);
    }

    private AiClient selected() {
        return switch (aiConfigService.provider()) {
            case "qwen" -> qwenClient;
            case "openai-compatible" -> openAiCompatibleAiClient;
            default -> deepSeekClient;
        };
    }
}
