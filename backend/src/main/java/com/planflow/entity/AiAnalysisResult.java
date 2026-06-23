package com.planflow.entity;

import com.baomidou.mybatisplus.annotation.*;
import lombok.Data;
import java.time.LocalDateTime;

@Data
@TableName("ai_analysis_result")
public class AiAnalysisResult {
    @TableId(type = IdType.AUTO)
    private Long id;
    private Long userId;
    private Long sourceInputId;
    private String modelName;
    private String promptText;
    private String rawResponse;
    private String parsedJson;
    private String summary;
    private LocalDateTime createdAt;
}
