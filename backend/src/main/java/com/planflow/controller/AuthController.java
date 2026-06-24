package com.planflow.controller;
import com.planflow.service.AuthService;
import com.planflow.service.UserService;
import com.planflow.repository.UserMapper;
import com.planflow.dto.LoginRequest;
import com.planflow.dto.RegisterRequest;import com.planflow.dto.*;
import com.planflow.common.ApiResponse;
import com.planflow.common.ErrorCode;
import com.planflow.entity.User;
import com.planflow.service.UserService;
import com.planflow.repository.UserMapper;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;
    private final UserService userService;
    private final UserMapper userMapper;

    @PostMapping("/register")
    public ApiResponse register(@Valid @RequestBody RegisterRequest request) {
        try {
            String token = authService.register(request);
            return ApiResponse.success(Map.of("token", token != null ? token : ""));
        } catch (IllegalArgumentException e) {
            return ApiResponse.error(ErrorCode.BAD_REQUEST, e.getMessage());
        }
    }

    @PostMapping("/login")
    public ApiResponse login(@Valid @RequestBody LoginRequest request) {
        try {
            String token = authService.login(request);
            User user = authService.getCurrentUser(request.getUsername());
            Map<String, Object> loginData = new HashMap<>();
            loginData.put("token", token != null ? token : "");
            if (user != null) {
                Map<String, Object> safeUser = new HashMap<>();
                safeUser.put("id", user.getId() != null ? String.valueOf(user.getId()) : "");
                safeUser.put("username", user.getUsername());
                safeUser.put("nickname", user.getNickname());
                safeUser.put("role", user.getRole() != null ? user.getRole() : "USER");
                loginData.put("user", safeUser);
            }
            return ApiResponse.success(loginData);
        } catch (RuntimeException e) {
            return ApiResponse.error(ErrorCode.UNAUTHORIZED, e.getMessage());
        }
    }

    @GetMapping("/me")
    public ApiResponse me() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !authentication.isAuthenticated()) {
            return ApiResponse.error(ErrorCode.UNAUTHORIZED, "未认证");
        }
        String username = authentication.getName();
        User user = authService.getCurrentUser(username);
        if (user == null) {
            return ApiResponse.error(ErrorCode.NOT_FOUND, "用户不存在");
        }
        // return safe user info (without password hash)
        Map<String, Object> userInfo = new HashMap<>();
        userInfo.put("id", user.getId());
        userInfo.put("username", user.getUsername());
        userInfo.put("nickname", user.getNickname());
        userInfo.put("email", user.getEmail());
        userInfo.put("avatarUrl", user.getAvatarUrl());
        userInfo.put("status", user.getStatus());
        userInfo.put("role", user.getRole() != null ? user.getRole() : "USER");
        userInfo.put("createdAt", user.getCreatedAt());
        return ApiResponse.success(userInfo);
    }

    @PutMapping("/user/profile")
    public ApiResponse updateProfile(@RequestBody Map<String, String> body) {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !authentication.isAuthenticated()) {
            return ApiResponse.error(ErrorCode.UNAUTHORIZED, "未认证");
        }
        String username = authentication.getName();
        User user = authService.getCurrentUser(username);
        if (user == null) {
            return ApiResponse.error(ErrorCode.NOT_FOUND, "用户不存在");
        }
        if (body.containsKey("nickname")) user.setNickname(body.get("nickname"));
        if (body.containsKey("email")) user.setEmail(body.get("email"));
        if (body.containsKey("avatarUrl")) user.setAvatarUrl(body.get("avatarUrl"));
        user.setUpdatedAt(LocalDateTime.now());
        userMapper.updateById(user);
        Map<String, Object> profileData = new HashMap<>();
        profileData.put("nickname", user.getNickname());
        profileData.put("email", user.getEmail());
        return ApiResponse.success(profileData);
    }
}
