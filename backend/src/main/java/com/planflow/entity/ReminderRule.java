package com.planflow.entity;

import com.baomidou.mybatisplus.annotation.*;
import lombok.Data;
import java.time.LocalDateTime;

@Data
@TableName("reminder_rule")
public class ReminderRule {
    @TableId(type = IdType.AUTO)
    private Long id;
    private Long userId;
    private Long taskId;
    private Long eventId;
    private String title;
    private String content;
    private LocalDateTime remindAt;
    private String channel;
    private String status;
    private String localNotificationId;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
