package com.planflow.entity;

import com.baomidou.mybatisplus.annotation.*;
import lombok.Data;
import java.time.LocalDateTime;

@Data
@TableName("source_input")
public class SourceInput {
    @TableId(type = IdType.AUTO)
    private Long id;
    private Long userId;
    private String sourceType;
    private String title;
    private String originalName;
    private String filePath;
    private Long fileSize;
    private String mimeType;
    private String originalText;
    private String rawText;
    private String status;
    private String errorMessage;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
