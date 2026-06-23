package com.planflow.common;

import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class ApiResponse {

    private int code;
    private Object data;
    private String message;

    public static ApiResponse success(Object data) {
        return new ApiResponse(ErrorCode.SUCCESS.getCode(), data, "success");
    }

    public static ApiResponse success() {
        return new ApiResponse(ErrorCode.SUCCESS.getCode(), null, "success");
    }

    public static ApiResponse error(int code, String message) {
        return new ApiResponse(code, null, message);
    }

    public static ApiResponse error(ErrorCode errorCode, String message) {
        return new ApiResponse(errorCode.getCode(), null, message);
    }

    public static ApiResponse error(ErrorCode errorCode) {
        return new ApiResponse(errorCode.getCode(), null, errorCode.name());
    }
}
