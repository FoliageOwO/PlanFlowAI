package com.planflow.admin;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.planflow.common.ApiResponse;
import com.planflow.common.ErrorCode;
import com.planflow.common.SecurityUtils;
import com.planflow.entity.SourceInput;
import com.planflow.entity.Task;
import com.planflow.user.User;
import com.planflow.mapper.SourceInputMapper;
import com.planflow.mapper.TaskMapper;
import com.planflow.user.UserMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

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
        return ApiResponse.success(Map.of(
                "userCount", userCount,
                "taskCount", taskCount,
                "sourceInputCount", sourceInputCount,
                "doneTaskCount", doneTaskCount
        ));
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
        return ApiResponse.success(result);
    }

    @PutMapping("/users/{id}/toggle")
    public ApiResponse toggleUserStatus(@PathVariable Long id) {
        checkAdmin();
        User user = userMapper.selectById(id);
        if (user == null) return ApiResponse.error(ErrorCode.NOT_FOUND, "用户不存在");
        user.setStatus(user.getStatus() == 1 ? 0 : 1);
        userMapper.updateById(user);
        return ApiResponse.success(Map.of("id", id, "status", user.getStatus()));
    }
}
