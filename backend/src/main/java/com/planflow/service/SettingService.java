package com.planflow.service;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.planflow.common.SecurityUtils;
import com.planflow.config.PlanFlowProperties;
import com.planflow.entity.UserSetting;
import com.planflow.repository.UserSettingMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.Map;

@Slf4j
@Service
@RequiredArgsConstructor
public class SettingService {

    private final UserSettingMapper userSettingMapper;
    private final SecurityUtils securityUtils;
    private final PlanFlowProperties planFlowProperties;

    public UserSetting getUserSetting() {
        Long userId = securityUtils.getCurrentUserId();
        UserSetting setting = userSettingMapper.selectOne(new LambdaQueryWrapper<UserSetting>()
                .eq(UserSetting::getUserId, userId));
        if (setting == null) {
            // Auto-create default settings
            setting = new UserSetting();
            setting.setUserId(userId);
            setting.setEnableInAppNotification(1);
            setting.setEnableLocalNotification(0);
            setting.setEnableBrowserNotification(0);
            setting.setCreatedAt(LocalDateTime.now());
            setting.setUpdatedAt(LocalDateTime.now());
            userSettingMapper.insert(setting);
            log.info("Auto-created default settings for userId={}", userId);
        }
        return setting;
    }

    public UserSetting updateSetting(UserSetting updates) {
        Long userId = securityUtils.getCurrentUserId();
        UserSetting setting = getUserSetting();

        if (updates.getDefaultReminderJson() != null) setting.setDefaultReminderJson(updates.getDefaultReminderJson());
        if (updates.getEnableInAppNotification() != null) setting.setEnableInAppNotification(updates.getEnableInAppNotification());
        if (updates.getEnableLocalNotification() != null) setting.setEnableLocalNotification(updates.getEnableLocalNotification());
        if (updates.getEnableBrowserNotification() != null) setting.setEnableBrowserNotification(updates.getEnableBrowserNotification());

        setting.setUpdatedAt(LocalDateTime.now());
        userSettingMapper.updateById(setting);
        log.info("Updated settings for userId={}", userId);
        return setting;
    }

    public Map<String, Object> getAiStatus() {
        PlanFlowProperties.Ai ai = planFlowProperties.getAi();
        String provider = ai.getProvider() == null || ai.getProvider().isBlank() ? "deepseek" : ai.getProvider();
        String baseUrl;
        String model;
        String apiKey;

        switch (provider) {
            case "qwen" -> {
                baseUrl = ai.getQwenBaseUrl();
                model = ai.getQwenModel();
                apiKey = ai.getQwenApiKey();
            }
            case "openai-compatible" -> {
                baseUrl = ai.getOpenaiCompatibleBaseUrl();
                model = ai.getOpenaiCompatibleModel();
                apiKey = ai.getOpenaiCompatibleApiKey();
            }
            case "deepseek" -> {
                baseUrl = ai.getDeepseekBaseUrl();
                model = ai.getDeepseekModel();
                apiKey = ai.getDeepseekApiKey();
            }
            default -> {
                baseUrl = "";
                model = "";
                apiKey = "";
            }
        }

        return Map.of(
                "provider", provider,
                "model", model == null ? "" : model,
                "baseUrl", baseUrl == null ? "" : baseUrl,
                "apiKeyConfigured", apiKey != null && !apiKey.isBlank(),
                "ready", baseUrl != null && !baseUrl.isBlank()
                        && model != null && !model.isBlank()
                        && apiKey != null && !apiKey.isBlank()
        );
    }
}
