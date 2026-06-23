package com.planflow.entity;

import com.baomidou.mybatisplus.annotation.*;
import lombok.Data;
import java.time.LocalDateTime;

@Data
@TableName("parse_job")
public class ParseJob {
    @TableId(type = IdType.AUTO)
    private Long id;
    private Long userId;
    private Long sourceInputId;
    private String status;
    private String stage;
    private Integer progress;
    private Integer retryCount;
    private String errorMessage;
    private LocalDateTime startedAt;
    private LocalDateTime finishedAt;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
