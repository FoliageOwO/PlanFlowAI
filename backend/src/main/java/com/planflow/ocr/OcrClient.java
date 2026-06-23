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
                throw new RuntimeException("OCR service returned empty response");
            }

            log.info("OCR recognition completed, text length: {}", response.getBody().length());
            return response.getBody();
        } catch (Exception e) {
            log.error("OCR service call failed", e);
            throw new RuntimeException("OCR recognition failed: " + e.getMessage(), e);
        }
    }
}
