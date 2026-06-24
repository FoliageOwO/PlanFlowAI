package com.planflow.dto;

import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class CreateInputResult {
    private Long inputId;
    private Long jobId;
    private String fileName;
}
