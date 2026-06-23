package com.planflow.ai;

public interface AiClient {
    AiAnalysisResultDTO analyze(String rawText, String sourceType);
}
