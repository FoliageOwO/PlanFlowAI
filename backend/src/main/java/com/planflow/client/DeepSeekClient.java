package com.planflow.client;

import com.planflow.service.AiConfigService;
import org.springframework.stereotype.Component;

@Component
public class DeepSeekClient extends OpenAiCompatibleChatClient {

    private final AiConfigService aiConfigService;

    public DeepSeekClient(AiConfigService aiConfigService,
                          AiPromptBuilder aiPromptBuilder,
                          AiResultParser aiResultParser) {
        super(aiPromptBuilder, aiResultParser);
        this.aiConfigService = aiConfigService;
    }

    @Override
    protected String baseUrl() {
        return aiConfigService.value("deepseekBaseUrl");
    }

    @Override
    protected String apiKey() {
        return aiConfigService.value("deepseekApiKey");
    }

    @Override
    public String providerName() {
        return "deepseek";
    }

    @Override
    public String modelName() {
        return aiConfigService.value("deepseekModel");
    }
}
