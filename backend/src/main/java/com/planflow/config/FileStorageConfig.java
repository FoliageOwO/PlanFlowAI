package com.planflow.config;

import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;

/**
 * Ensures the upload directory exists on application startup.
 * Resolves relative paths to absolute ones to avoid Tomcat working-directory issues.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class FileStorageConfig {

    private final PlanFlowProperties planFlowProperties;

    @PostConstruct
    public void init() {
        String rawDir = planFlowProperties.getUpload().getDir();
        Path uploadDir = resolveUploadDir(rawDir);

        // Store the resolved absolute path back into properties
        planFlowProperties.getUpload().setDir(uploadDir.toString());
        log.info("Upload directory resolved to: {}", uploadDir);

        // Create the directory (and parents) if it doesn't exist
        try {
            Files.createDirectories(uploadDir);
            log.info("Upload directory ready: {}", uploadDir.toAbsolutePath());
        } catch (IOException e) {
            log.error("Cannot create upload directory: {}", uploadDir, e);
            throw new RuntimeException("Failed to initialize upload directory: " + uploadDir, e);
        }
    }

    private Path resolveUploadDir(String dir) {
        Path path = Paths.get(dir);
        if (path.isAbsolute()) {
            return path;
        }
        // Resolve relative path against user's home directory for portability
        Path homeDir = Paths.get(System.getProperty("user.home"), ".planflow");
        Path resolved = homeDir.resolve(dir);
        log.info("Resolved relative upload dir '{}' to absolute path: {}", dir, resolved);
        return resolved;
    }
}
