package com.planflow.entity;

import com.baomidou.mybatisplus.annotation.*;
import lombok.Data;
import java.time.LocalDateTime;

@Data
@TableName("timeline_event")
public class TimelineEvent {
    @TableId(type = IdType.AUTO)
    private Long id;
    private Long userId;
    private Long sourceInputId;
    private Long taskId;
    private String title;
    private String eventType;
    private LocalDateTime startTime;
    private LocalDateTime endTime;
    private String location;
    private String description;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
