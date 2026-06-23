package com.planflow.entity;

import com.baomidou.mybatisplus.annotation.*;
import lombok.Data;
import java.time.LocalDateTime;

@Data
@TableName("device_sync_record")
public class DeviceSyncRecord {
    @TableId(type = IdType.AUTO)
    private Long id;
    private Long userId;
    private String deviceId;
    private LocalDateTime lastSyncAt;
    private String appPlatform;
    private String appVersion;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
