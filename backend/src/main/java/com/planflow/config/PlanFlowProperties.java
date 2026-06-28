package com.planflow.config;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

@Data
@Component
@ConfigurationProperties(prefix = "planflow")
public class PlanFlowProperties {

    private Ocr ocr = new Ocr();
    private Ai ai = new Ai();
    private Upload upload = new Upload();
    private Notification notification = new Notification();

    @Data
    public static class Ocr {
        private boolean enabled = false;
        private String serviceUrl = "http://localhost:8000/ocr/image";
    }

    @Data
    public static class Ai {
        private String provider = "deepseek";
        private String deepseekApiKey = "";
        private String deepseekBaseUrl = "https://api.deepseek.com/v1";
        private String deepseekModel = "deepseek-v4-pro";
        private String qwenApiKey = "";
        private String qwenBaseUrl = "https://dashscope.aliyuncs.com/compatible-mode/v1";
        private String qwenModel = "qwen3.7-plus";
        private String openaiCompatibleApiKey = "";
        private String openaiCompatibleBaseUrl = "";
        private String openaiCompatibleModel = "";
    }

    @Data
    public static class Upload {
        private String dir = "uploads";
    }

    @Data
    public static class Notification {
        private boolean emailEnabled = false;
        private String emailProvider = "smtp";
        private String emailFrom = "";
        private boolean smsEnabled = false;
        private String smsProvider = "aliyun";
    }
}
