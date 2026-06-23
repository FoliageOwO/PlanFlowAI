package com.planflow.extract;

import lombok.extern.slf4j.Slf4j;
import org.apache.pdfbox.Loader;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.springframework.stereotype.Service;

import java.io.File;
import java.io.IOException;

@Slf4j
@Service
public class PdfExtractService {

    public String extract(File file) {
        try (PDDocument document = Loader.loadPDF(file)) {
            String text = new org.apache.pdfbox.text.PDFTextStripper().getText(document);
            if (text == null || text.isBlank()) {
                log.warn("PDF text is empty, may be a scanned PDF: {}", file.getName());
                return "[SCANNED_PDF]";
            }
            log.info("PDF text extracted, length: {}", text.length());
            return text;
        } catch (IOException e) {
            log.error("Failed to extract PDF text", e);
            throw new RuntimeException("PDF text extraction failed: " + e.getMessage(), e);
        }
    }
}
