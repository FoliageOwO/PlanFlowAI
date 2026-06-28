package com.planflow.client;

import com.planflow.config.PlanFlowProperties;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

@Component
@ConditionalOnProperty(prefix = "planflow.ai", name = "provider", havingValue = "qwen")
public class QwenClient extends OpenAiCompatibleChatClient {

    private final PlanFlowProperties planFlowProperties;

    public QwenClient(PlanFlowProperties planFlowProperties,
                      AiPromptBuilder aiPromptBuilder,
                      AiResultParser aiResultParser) {
        super(aiPromptBuilder, aiResultParser);
        this.planFlowProperties = planFlowProperties;
    }

    @Override
    protected String baseUrl() {
        return planFlowProperties.getAi().getQwenBaseUrl();
    }

    @Override
    protected String apiKey() {
        return planFlowProperties.getAi().getQwenApiKey();
    }

    @Override
    public String providerName() {
        return "qwen";
    }

    @Override
    public String modelName() {
        return planFlowProperties.getAi().getQwenModel();
    }
}
