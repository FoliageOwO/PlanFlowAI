package com.planflow.client;
import com.planflow.dto.AiAnalysisResultDTO;

public interface AiClient {
    AiAnalysisResultDTO analyze(String rawText, String sourceType);
    String providerName();
    String modelName();
}
