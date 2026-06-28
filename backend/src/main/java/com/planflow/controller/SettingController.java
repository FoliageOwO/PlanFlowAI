package com.planflow.controller;
import com.planflow.service.*;
import com.planflow.common.ApiResponse;
import com.planflow.entity.UserSetting;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/settings")
@RequiredArgsConstructor
public class SettingController {

    private final SettingService settingService;

    @GetMapping
    public ApiResponse getSettings() {
        UserSetting setting = settingService.getUserSetting();
        return ApiResponse.success(setting);
    }

    @GetMapping("/ai-status")
    public ApiResponse getAiStatus() {
        return ApiResponse.success(settingService.getAiStatus());
    }

    @PatchMapping
    public ApiResponse updateSettings(@RequestBody UserSetting updates) {
        UserSetting updated = settingService.updateSetting(updates);
        return ApiResponse.success(updated);
    }
}
