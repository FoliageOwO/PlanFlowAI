package com.planflow.service;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.planflow.common.SecurityUtils;
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
    private final AiConfigService aiConfigService;

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
            setting.setEnableEmailNotification(0);
            setting.setEnableSmsNotification(0);
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
        if (updates.getEnableEmailNotification() != null) setting.setEnableEmailNotification(updates.getEnableEmailNotification());
        if (updates.getEnableSmsNotification() != null) setting.setEnableSmsNotification(updates.getEnableSmsNotification());
        if (updates.getNotificationEmail() != null) setting.setNotificationEmail(updates.getNotificationEmail().isBlank() ? null : updates.getNotificationEmail().trim());
        if (updates.getNotificationPhone() != null) setting.setNotificationPhone(updates.getNotificationPhone().isBlank() ? null : updates.getNotificationPhone().trim());

        setting.setUpdatedAt(LocalDateTime.now());
        userSettingMapper.updateById(setting);
        log.info("Updated settings for userId={}", userId);
        return setting;
    }

    public Map<String, Object> getAiStatus() {
        Map<String, String> ai = aiConfigService.getConfig();
        String provider = ai.get("provider") == null || ai.get("provider").isBlank() ? "deepseek" : ai.get("provider");
        String baseUrl;
        String model;
        String apiKey;

        switch (provider) {
            case "qwen" -> {
                baseUrl = ai.get("qwenBaseUrl");
                model = ai.get("qwenModel");
                apiKey = ai.get("qwenApiKey");
            }
            case "openai-compatible" -> {
                baseUrl = ai.get("openaiCompatibleBaseUrl");
                model = ai.get("openaiCompatibleModel");
                apiKey = ai.get("openaiCompatibleApiKey");
            }
            case "deepseek" -> {
                baseUrl = ai.get("deepseekBaseUrl");
                model = ai.get("deepseekModel");
                apiKey = ai.get("deepseekApiKey");
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
