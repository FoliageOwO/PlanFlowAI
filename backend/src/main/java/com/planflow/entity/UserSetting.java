package com.planflow.entity;

import com.baomidou.mybatisplus.annotation.*;
import lombok.Data;
import java.time.LocalDateTime;

@Data
@TableName("user_setting")
public class UserSetting {
    @TableId(type = IdType.AUTO)
    private Long id;
    private Long userId;
    private String defaultReminderJson;
    private Integer enableInAppNotification;
    private Integer enableLocalNotification;
    private Integer enableBrowserNotification;
    private Integer enableEmailNotification;
    private Integer enableSmsNotification;
    private Integer enableQqNotification;
    private String notificationEmail;
    private String notificationPhone;
    private String notificationQq;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
