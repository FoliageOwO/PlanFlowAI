package com.planflow.extract;

import lombok.extern.slf4j.Slf4j;
import org.apache.poi.xwpf.usermodel.XWPFDocument;
import org.springframework.stereotype.Service;

import java.io.File;
import java.io.FileInputStream;
import java.io.IOException;

@Slf4j
@Service
public class DocxExtractService {

    public String extract(File file) {
        StringBuilder sb = new StringBuilder();
        try (FileInputStream fis = new FileInputStream(file);
             XWPFDocument document = new XWPFDocument(fis)) {

            document.getParagraphs().forEach(paragraph -> {
                String text = paragraph.getText();
                if (text != null && !text.isBlank()) {
                    sb.append(text).append("\n");
                }
            });

            String result = sb.toString();
            log.info("DOCX text extracted, length: {}", result.length());
            return result;
        } catch (IOException e) {
            log.error("Failed to extract DOCX text", e);
            throw new RuntimeException("DOCX text extraction failed: " + e.getMessage(), e);
        }
    }
}
