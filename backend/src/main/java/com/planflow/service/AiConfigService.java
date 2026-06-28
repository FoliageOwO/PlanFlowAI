package com.planflow.service;

import com.planflow.config.PlanFlowProperties;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class AiConfigService {

    private final PlanFlowProperties planFlowProperties;
    private final JdbcTemplate jdbcTemplate;

    public Map<String, String> getConfig() {
        PlanFlowProperties.Ai ai = planFlowProperties.getAi();
        Map<String, String> config = new LinkedHashMap<>();
        config.put("provider", get("ai.provider", ai.getProvider()));
        config.put("deepseekApiKey", get("ai.deepseek.api-key", ai.getDeepseekApiKey()));
        config.put("deepseekBaseUrl", get("ai.deepseek.base-url", ai.getDeepseekBaseUrl()));
        config.put("deepseekModel", get("ai.deepseek.model", ai.getDeepseekModel()));
        config.put("qwenApiKey", get("ai.qwen.api-key", ai.getQwenApiKey()));
        config.put("qwenBaseUrl", get("ai.qwen.base-url", ai.getQwenBaseUrl()));
        config.put("qwenModel", get("ai.qwen.model", ai.getQwenModel()));
        config.put("openaiCompatibleApiKey", get("ai.openai-compatible.api-key", ai.getOpenaiCompatibleApiKey()));
        config.put("openaiCompatibleBaseUrl", get("ai.openai-compatible.base-url", ai.getOpenaiCompatibleBaseUrl()));
        config.put("openaiCompatibleModel", get("ai.openai-compatible.model", ai.getOpenaiCompatibleModel()));
        return config;
    }

    public void updateConfig(Map<String, Object> updates) {
        Map<String, String> current = getConfig();
        for (String key : current.keySet()) {
            if (updates.containsKey(key)) {
                upsert(storageKey(key), valueToString(updates.get(key)), description(key));
            }
        }
    }

    public String provider() {
        String provider = getConfig().get("provider");
        return provider == null || provider.isBlank() ? "deepseek" : provider;
    }

    public String value(String key) {
        return getConfig().getOrDefault(key, "");
    }

    private String get(String storageKey, String defaultValue) {
        try {
            List<String> values = jdbcTemplate.query(
                    "SELECT config_value FROM system_config WHERE config_key = ?",
                    (rs, rowNum) -> rs.getString("config_value"),
                    storageKey);
            return values.isEmpty() ? blankToDefault(defaultValue) : blankToDefault(values.get(0));
        } catch (Exception e) {
            return blankToDefault(defaultValue);
        }
    }

    private void upsert(String storageKey, String value, String description) {
        Integer count = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM system_config WHERE config_key = ?",
                Integer.class,
                storageKey);
        if (count != null && count > 0) {
            jdbcTemplate.update(
                    "UPDATE system_config SET config_value = ?, description = ?, updated_at = CURRENT_TIMESTAMP WHERE config_key = ?",
                    value, description, storageKey);
        } else {
            jdbcTemplate.update(
                    "INSERT INTO system_config (config_key, config_value, description) VALUES (?, ?, ?)",
                    storageKey, value, description);
        }
    }

    private String storageKey(String key) {
        return switch (key) {
            case "provider" -> "ai.provider";
            case "deepseekApiKey" -> "ai.deepseek.api-key";
            case "deepseekBaseUrl" -> "ai.deepseek.base-url";
            case "deepseekModel" -> "ai.deepseek.model";
            case "qwenApiKey" -> "ai.qwen.api-key";
            case "qwenBaseUrl" -> "ai.qwen.base-url";
            case "qwenModel" -> "ai.qwen.model";
            case "openaiCompatibleApiKey" -> "ai.openai-compatible.api-key";
            case "openaiCompatibleBaseUrl" -> "ai.openai-compatible.base-url";
            case "openaiCompatibleModel" -> "ai.openai-compatible.model";
            default -> key;
        };
    }

    private String description(String key) {
        return switch (key) {
            case "provider" -> "当前 AI 服务商";
            case "deepseekApiKey" -> "DeepSeek API Key";
            case "deepseekBaseUrl" -> "DeepSeek Base URL";
            case "deepseekModel" -> "DeepSeek 模型";
            case "qwenApiKey" -> "Qwen API Key";
            case "qwenBaseUrl" -> "Qwen Base URL";
            case "qwenModel" -> "Qwen 模型";
            case "openaiCompatibleApiKey" -> "OpenAI-compatible API Key";
            case "openaiCompatibleBaseUrl" -> "OpenAI-compatible Base URL";
            case "openaiCompatibleModel" -> "OpenAI-compatible 模型";
            default -> "AI 配置";
        };
    }

    private String valueToString(Object value) {
        return value == null ? "" : String.valueOf(value).trim();
    }

    private String blankToDefault(String value) {
        return value == null ? "" : value;
    }
}
