package com.planflow.auth;

import com.planflow.common.ApiResponse;
import com.planflow.common.ErrorCode;
import com.planflow.user.User;
import com.planflow.user.UserService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;
    private final UserService userService;

    @PostMapping("/register")
    public ApiResponse register(@Valid @RequestBody RegisterRequest request) {
        try {
            String token = authService.register(request);
            return ApiResponse.success(Map.of("token", token));
        } catch (IllegalArgumentException e) {
            return ApiResponse.error(ErrorCode.BAD_REQUEST, e.getMessage());
        }
    }

    @PostMapping("/login")
    public ApiResponse login(@Valid @RequestBody LoginRequest request) {
        try {
            String token = authService.login(request);
            return ApiResponse.success(Map.of("token", token));
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
        Map<String, Object> userInfo = Map.of(
                "id", user.getId(),
                "username", user.getUsername(),
                "nickname", user.getNickname(),
                "email", user.getEmail(),
                "avatarUrl", user.getAvatarUrl(),
                "status", user.getStatus(),
                "createdAt", user.getCreatedAt()
        );
        return ApiResponse.success(userInfo);
    }
}
