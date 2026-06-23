package com.planflow.entity;

import com.baomidou.mybatisplus.annotation.*;
import lombok.Data;
import java.time.LocalDateTime;

@Data
@TableName("notification")
public class Notification {
    @TableId(type = IdType.AUTO)
    private Long id;
    private Long userId;
    private Long taskId;
    private Long reminderRuleId;
    private String title;
    private String content;
    private String type;
    private String readStatus;
    private LocalDateTime createdAt;
    private LocalDateTime readAt;
}
