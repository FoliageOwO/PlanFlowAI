package com.planflow.client;

import com.planflow.service.AiConfigService;
import org.springframework.stereotype.Component;

@Component
public class QwenClient extends OpenAiCompatibleChatClient {

    private final AiConfigService aiConfigService;

    public QwenClient(AiConfigService aiConfigService,
                      AiPromptBuilder aiPromptBuilder,
                      AiResultParser aiResultParser) {
        super(aiPromptBuilder, aiResultParser);
        this.aiConfigService = aiConfigService;
    }

    @Override
    protected String baseUrl() {
        return aiConfigService.value("qwenBaseUrl");
    }

    @Override
    protected String apiKey() {
        return aiConfigService.value("qwenApiKey");
    }

    @Override
    public String providerName() {
        return "qwen";
    }

    @Override
    public String modelName() {
        return aiConfigService.value("qwenModel");
    }
}
