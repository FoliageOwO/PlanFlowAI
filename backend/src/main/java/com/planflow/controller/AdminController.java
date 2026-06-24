package com.planflow.controller;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.planflow.common.ApiResponse;
import com.planflow.common.ErrorCode;
import com.planflow.common.SecurityUtils;
import com.planflow.entity.SourceInput;
import com.planflow.entity.Task;
import com.planflow.entity.User;
import com.planflow.repository.SourceInputMapper;
import com.planflow.repository.TaskMapper;
import com.planflow.repository.UserMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/admin")
@RequiredArgsConstructor
public class AdminController {

    private final UserMapper userMapper;
    private final TaskMapper taskMapper;
    private final SourceInputMapper sourceInputMapper;
    private final SecurityUtils securityUtils;

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
        long userCount = userMapper.selectCount(null);
        long taskCount = taskMapper.selectCount(null);
        long sourceInputCount = sourceInputMapper.selectCount(null);
        long doneTaskCount = taskMapper.selectCount(
                new LambdaQueryWrapper<Task>().eq(Task::getStatus, "DONE"));
        Map<String, Object> stats = new HashMap<>();
        stats.put("userCount", userCount);
        stats.put("taskCount", taskCount);
        stats.put("sourceInputCount", sourceInputCount);
        stats.put("doneTaskCount", doneTaskCount);
        return ApiResponse.success(stats);
    }

    @GetMapping("/users")
    public ApiResponse getUsers(@RequestParam(defaultValue = "1") int page,
                                 @RequestParam(defaultValue = "20") int size,
                                 @RequestParam(required = false) String keyword) {
        checkAdmin();
        Page<User> pageParam = new Page<>(page, size);
        LambdaQueryWrapper<User> wrapper = new LambdaQueryWrapper<>();
        if (keyword != null && !keyword.isBlank()) {
            wrapper.like(User::getUsername, keyword).or().like(User::getNickname, keyword);
        }
        wrapper.orderByDesc(User::getCreatedAt);
        Page<User> result = userMapper.selectPage(pageParam, wrapper);
        // Remove password hash from response
        result.getRecords().forEach(u -> u.setPasswordHash(null));
        Map<String, Object> data = new HashMap<>();
        data.put("list", result.getRecords());
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
        toggleResult.put("id", id);
        toggleResult.put("status", user.getStatus());
        return ApiResponse.success(toggleResult);
    }
}
