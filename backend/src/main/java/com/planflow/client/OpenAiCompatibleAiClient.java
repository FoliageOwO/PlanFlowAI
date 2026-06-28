package com.planflow.client;

import com.planflow.config.PlanFlowProperties;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

@Component
@ConditionalOnProperty(prefix = "planflow.ai", name = "provider", havingValue = "openai-compatible")
public class OpenAiCompatibleAiClient extends OpenAiCompatibleChatClient {

    private final PlanFlowProperties planFlowProperties;

    public OpenAiCompatibleAiClient(PlanFlowProperties planFlowProperties,
                                    AiPromptBuilder aiPromptBuilder,
                                    AiResultParser aiResultParser) {
        super(aiPromptBuilder, aiResultParser);
        this.planFlowProperties = planFlowProperties;
    }

    @Override
    protected String baseUrl() {
        return planFlowProperties.getAi().getOpenaiCompatibleBaseUrl();
    }

    @Override
    protected String apiKey() {
        return planFlowProperties.getAi().getOpenaiCompatibleApiKey();
    }

    @Override
    public String providerName() {
        return "openai-compatible";
    }

    @Override
    public String modelName() {
        return planFlowProperties.getAi().getOpenaiCompatibleModel();
    }
}
