package com.planflow.extract;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.File;

@Slf4j
@Service
@RequiredArgsConstructor
public class TextExtractService {

    private final PdfExtractService pdfExtractService;
    private final DocxExtractService docxExtractService;

    public String extract(File file, String sourceType) {
        return switch (sourceType.toUpperCase()) {
            case "PDF" -> {
                log.info("Extracting text from PDF: {}", file.getName());
                yield cleanText(pdfExtractService.extract(file));
            }
            case "DOCX" -> {
                log.info("Extracting text from DOCX: {}", file.getName());
                yield cleanText(docxExtractService.extract(file));
            }
            default -> throw new IllegalArgumentException("Unsupported source type for extraction: " + sourceType);
        };
    }

    private String cleanText(String text) {
        if (text == null || text.isBlank()) {
            return "";
        }
        // Trim
        String cleaned = text.trim();
        // Merge broken lines (single line breaks to spaces)
        cleaned = cleaned.replaceAll("([^\\n])\\n([^\\n])", "$1 $2");
        // Collapse multiple spaces
        cleaned = cleaned.replaceAll("\\s+", " ");
        // Limit to 8000 characters
        if (cleaned.length() > 8000) {
            cleaned = cleaned.substring(0, 8000);
        }
        return cleaned;
    }
}
