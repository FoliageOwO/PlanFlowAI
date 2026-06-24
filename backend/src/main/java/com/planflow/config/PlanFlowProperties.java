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

    @Data
    public static class Ocr {
        private boolean enabled = false;
        private String serviceUrl = "http://localhost:8000/ocr/image";
    }

    @Data
    public static class Ai {
        private String deepseekApiKey = "";
        private String deepseekBaseUrl = "https://api.deepseek.com/v1";
    }

    @Data
    public static class Upload {
        private String dir = "uploads";
    }
}
