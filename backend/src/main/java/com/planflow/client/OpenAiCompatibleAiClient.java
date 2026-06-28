package com.planflow.client;

import com.planflow.service.AiConfigService;
import org.springframework.stereotype.Component;

@Component
public class OpenAiCompatibleAiClient extends OpenAiCompatibleChatClient {

    private final AiConfigService aiConfigService;

    public OpenAiCompatibleAiClient(AiConfigService aiConfigService,
                                    AiPromptBuilder aiPromptBuilder,
                                    AiResultParser aiResultParser) {
        super(aiPromptBuilder, aiResultParser);
        this.aiConfigService = aiConfigService;
    }

    @Override
    protected String baseUrl() {
        return aiConfigService.value("openaiCompatibleBaseUrl");
    }

    @Override
    protected String apiKey() {
        return aiConfigService.value("openaiCompatibleApiKey");
    }

    @Override
    public String providerName() {
        return "openai-compatible";
    }

    @Override
    public String modelName() {
        return aiConfigService.value("openaiCompatibleModel");
    }
}
