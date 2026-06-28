package com.planflow.controller;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.planflow.common.ApiResponse;
import com.planflow.common.ErrorCode;
import com.planflow.common.SecurityUtils;
import com.planflow.config.PlanFlowProperties;
import com.planflow.entity.SourceInput;
import com.planflow.entity.Task;
import com.planflow.entity.User;
import com.planflow.entity.ParseJob;
import com.planflow.repository.ParseJobMapper;
import com.planflow.repository.SourceInputMapper;
import com.planflow.repository.TaskMapper;
import com.planflow.repository.UserMapper;
import com.planflow.service.SettingService;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.client.RestTemplate;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/admin")
@RequiredArgsConstructor
public class AdminController {

    private final UserMapper userMapper;
    private final TaskMapper taskMapper;
    private final SourceInputMapper sourceInputMapper;
    private final ParseJobMapper parseJobMapper;
    private final SecurityUtils securityUtils;
    private final PlanFlowProperties planFlowProperties;
    private final JdbcTemplate jdbcTemplate;
    private final SettingService settingService;
    private final RestTemplate restTemplate = new RestTemplate();

    private void checkAdmin() {
        String username = securityUtils.getCurrentUsername();
        User user = userMapper.selectOne(new LambdaQueryWrapper<User>().eq(User::getUsername, username));
        if (user == null || !"ADMIN".equals(user.getRole())) {
            throw new RuntimeException("无管理员权限");
        }
    }

    @GetMapping("/stats")
    public ApiResponse getStats() {
        checkAdmin();
        LocalDateTime todayStart = LocalDate.now().atStartOfDay();
        long userCount = userMapper.selectCount(null);
        long taskCount = taskMapper.selectCount(null);
        long sourceInputCount = sourceInputMapper.selectCount(null);
        long doneTaskCount = taskMapper.selectCount(
                new LambdaQueryWrapper<Task>().eq(Task::getStatus, "DONE"));
        long todayRegistrations = userMapper.selectCount(
                new LambdaQueryWrapper<User>().ge(User::getCreatedAt, todayStart));
        long todayParseJobs = parseJobMapper.selectCount(
                new LambdaQueryWrapper<ParseJob>().ge(ParseJob::getCreatedAt, todayStart));
        long todaySuccessCount = parseJobMapper.selectCount(
                new LambdaQueryWrapper<ParseJob>()
                        .ge(ParseJob::getCreatedAt, todayStart)
                        .eq(ParseJob::getStatus, "COMPLETED"));
        long todayFailCount = parseJobMapper.selectCount(
                new LambdaQueryWrapper<ParseJob>()
                        .ge(ParseJob::getCreatedAt, todayStart)
                        .eq(ParseJob::getStatus, "FAILED"));

        Page<ParseJob> recentJobPage = parseJobMapper.selectPage(
                new Page<>(1, 10),
                new LambdaQueryWrapper<ParseJob>().orderByDesc(ParseJob::getCreatedAt));
        List<Map<String, Object>> recentJobs = new ArrayList<>();
        for (ParseJob job : recentJobPage.getRecords()) {
            User user = userMapper.selectById(job.getUserId());
            SourceInput sourceInput = sourceInputMapper.selectById(job.getSourceInputId());
            Map<String, Object> item = new HashMap<>();
            item.put("id", job.getId());
            item.put("userName", user != null ? user.getNickname() : "未知用户");
            item.put("sourceType", sourceInput != null ? sourceInput.getSourceType() : "UNKNOWN");
            item.put("status", job.getStatus());
            item.put("createdAt", job.getCreatedAt());
            recentJobs.add(item);
        }

        Map<String, Object> systemHealth = new HashMap<>();
        systemHealth.put("api", true);
        systemHealth.put("database", isDatabaseHealthy());
        systemHealth.put("ocr", isOcrHealthy());
        systemHealth.put("ai", Boolean.TRUE.equals(settingService.getAiStatus().get("ready")));

        Map<String, Object> stats = new HashMap<>();
        stats.put("userCount", userCount);
        stats.put("taskCount", taskCount);
        stats.put("sourceInputCount", sourceInputCount);
        stats.put("doneTaskCount", doneTaskCount);
        stats.put("todayRegistrations", todayRegistrations);
        stats.put("todayParseJobs", todayParseJobs);
        stats.put("todaySuccessCount", todaySuccessCount);
        stats.put("todayFailCount", todayFailCount);
        stats.put("systemHealth", systemHealth);
        stats.put("recentJobs", recentJobs);
        return ApiResponse.success(stats);
    }

    @GetMapping("/users")
    public ApiResponse getUsers(@RequestParam(defaultValue = "1") int page,
                                 @RequestParam(defaultValue = "20") int size,
                                 @RequestParam(required = false) String keyword,
                                 @RequestParam(required = false) String search) {
        checkAdmin();
        Page<User> pageParam = new Page<>(page, size);
        LambdaQueryWrapper<User> wrapper = new LambdaQueryWrapper<>();
        String query = keyword != null && !keyword.isBlank() ? keyword : search;
        if (query != null && !query.isBlank()) {
            wrapper.and(w -> w.like(User::getUsername, query).or().like(User::getNickname, query));
        }
        wrapper.orderByDesc(User::getCreatedAt);
        Page<User> result = userMapper.selectPage(pageParam, wrapper);
        Map<String, Object> data = new HashMap<>();
        data.put("list", result.getRecords().stream().map(this::toAdminUserItem).toList());
        data.put("total", result.getTotal());
        return ApiResponse.success(data);
    }

    @PutMapping("/users/{id}/toggle")
    public ApiResponse toggleUserStatus(@PathVariable Long id) {
        checkAdmin();
        User user = userMapper.selectById(id);
        if (user == null) return ApiResponse.error(ErrorCode.NOT_FOUND, "用户不存在");
        Integer currentStatus = user.getStatus();
        user.setStatus(currentStatus != null && currentStatus == 1 ? 0 : 1);
        userMapper.updateById(user);
        Map<String, Object> toggleResult = new HashMap<>();
        toggleResult.put("id", String.valueOf(id));
        toggleResult.put("status", toUserStatus(user.getStatus()));
        return ApiResponse.success(toggleResult);
    }

    private Map<String, Object> toAdminUserItem(User user) {
        Map<String, Object> item = new HashMap<>();
        item.put("id", String.valueOf(user.getId()));
        item.put("username", user.getUsername());
        item.put("nickname", user.getNickname());
        item.put("email", user.getEmail());
        item.put("role", user.getRole() != null ? user.getRole() : "USER");
        item.put("status", toUserStatus(user.getStatus()));
        item.put("createdAt", user.getCreatedAt());
        return item;
    }

    private String toUserStatus(Integer status) {
        return status != null && status == 1 ? "ACTIVE" : "DISABLED";
    }

    private boolean isDatabaseHealthy() {
        try {
            Integer result = jdbcTemplate.queryForObject("SELECT 1", Integer.class);
            return result != null && result == 1;
        } catch (Exception e) {
            return false;
        }
    }

    private boolean isOcrHealthy() {
        if (!planFlowProperties.getOcr().isEnabled()) return false;
        try {
            String serviceUrl = planFlowProperties.getOcr().getServiceUrl();
            String healthUrl = serviceUrl.replaceFirst("/ocr/image$", "/health");
            restTemplate.getForObject(healthUrl, Map.class);
            return true;
        } catch (Exception e) {
            return false;
        }
    }
}
