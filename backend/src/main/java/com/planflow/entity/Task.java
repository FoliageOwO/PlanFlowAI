package com.planflow.entity;

import com.baomidou.mybatisplus.annotation.*;
import lombok.Data;
import java.time.LocalDateTime;

@Data
@TableName("task")
public class Task {
    @TableId(type = IdType.AUTO)
    private Long id;
    private Long userId;
    private Long sourceInputId;
    private String title;
    private String description;
    private String taskType;
    private String priority;
    private String status;
    private LocalDateTime deadline;
    private Integer estimatedMinutes;
    private String constraintsJson;
    private String checklistJson;
    private String sourceEvidence;
    private String createdBy;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
