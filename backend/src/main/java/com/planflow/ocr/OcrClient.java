package com.planflow.ocr;

import com.planflow.config.PlanFlowProperties;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.io.FileSystemResource;
import org.springframework.http.*;
import org.springframework.stereotype.Component;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.RestTemplate;

import java.io.File;

@Slf4j
@Component
@RequiredArgsConstructor
public class OcrClient {

    private final PlanFlowProperties planFlowProperties;
    private final RestTemplate restTemplate = new RestTemplate();

    public String recognize(File imageFile) {
        if (!planFlowProperties.getOcr().isEnabled()) {
            throw new RuntimeException("图片识别功能未启用（planflow.ocr.enabled=false）");
        }
        String serviceUrl = planFlowProperties.getOcr().getServiceUrl();
        log.info("Calling OCR service: {}", serviceUrl);

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.MULTIPART_FORM_DATA);

        MultiValueMap<String, Object> body = new LinkedMultiValueMap<>();
        body.add("file", new FileSystemResource(imageFile));

        HttpEntity<MultiValueMap<String, Object>> entity = new HttpEntity<>(body, headers);

        try {
            ResponseEntity<String> response = restTemplate.exchange(
                    serviceUrl, HttpMethod.POST, entity, String.class);

            if (response.getBody() == null || response.getBody().isBlank()) {
                throw new RuntimeException("OCR 服务返回空结果，图片可能没有文字");
            }

            log.info("OCR recognition completed, text length: {}", response.getBody().length());
            return response.getBody();
        } catch (Exception e) {
            log.error("OCR service call failed: serviceUrl={}, file={}", serviceUrl, imageFile.getAbsolutePath(), e);
            String msg = e.getMessage();
            if (msg != null && msg.contains("Connection refused")) {
                throw new RuntimeException("OCR 服务未启动，请先启动 OCR 服务（cd ocr-service && python app/main.py）", e);
            }
            if (msg != null && msg.contains("Unexpected end of file")) {
                throw new RuntimeException("OCR 服务连接失败，请确认 OCR 服务正在运行", e);
            }
            throw new RuntimeException("图片文字识别失败: " + msg, e);
        }
    }
}
