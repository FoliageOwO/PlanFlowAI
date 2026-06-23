package com.planflow.ai;

import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.time.format.DateTimeFormatter;

@Slf4j
@Component
public class AiPromptBuilder {

    public String buildPrompt(String rawText, String sourceType) {
        ZonedDateTime now = ZonedDateTime.now(ZoneId.of("Asia/Shanghai"));
        String currentTime = now.format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss"));
        String timezone = "Asia/Shanghai (UTC+8)";

        // Truncate rawText to avoid exceeding token limits
        String truncatedText = rawText;
        if (rawText != null && rawText.length() > 8000) {
            truncatedText = rawText.substring(0, 8000) + "\n...[内容过长已截断]";
        }

        return buildPromptContent(currentTime, timezone, sourceType, truncatedText);
    }

    private String buildPromptContent(String currentTime, String timezone, String sourceType, String text) {
        return "你是一个专业的时间管理与任务规划助手。请根据用户提供的原始文本，提取并分析其中包含的任务、事件、风险等信息。\n\n" +
            "## 当前时间\n- 当前日期时间: " + currentTime + "\n- 时区: " + timezone + "\n\n" +
            "## 输入来源类型: " + sourceType + "\n\n" +
            "## 原始文本内容\n```\n" + text + "\n```\n\n" +
            "## 输出要求\n你必须严格按照以下 JSON Schema 输出一个合法的 JSON 对象，不要输出任何其他内容。\n\n" +
            "### JSON Schema:\n" +
            "{\n" +
            "  \"summary\": \"对输入内容的整体概述（1-3句话）\",\n" +
            "  \"goals\": [{ \"title\": \"目标标题\", \"description\": \"目标描述\" }],\n" +
            "  \"tasks\": [{\n" +
            "    \"title\": \"任务标题\",\n" +
            "    \"description\": \"任务详细描述\",\n" +
            "    \"deadline\": \"YYYY-MM-DD HH:mm:ss 格式的截止时间\",\n" +
            "    \"priority\": \"LOW/MEDIUM/HIGH/URGENT\",\n" +
            "    \"estimatedMinutes\": 30,\n" +
            "    \"constraints\": [],\n" +
            "    \"checklist\": [],\n" +
            "    \"suggestedReminders\": [{ \"title\": \"提醒标题\", \"content\": \"提醒内容\", \"remindAt\": \"YYYY-MM-DD HH:mm:ss\" }],\n" +
            "    \"sourceEvidence\": \"原文证据\"\n" +
            "  }],\n" +
            "  \"events\": [{\n" +
            "    \"title\": \"事件标题\",\n" +
            "    \"startTime\": \"YYYY-MM-DD HH:mm:ss\",\n" +
            "    \"endTime\": \"YYYY-MM-DD HH:mm:ss\",\n" +
            "    \"location\": \"地点\",\n" +
            "    \"description\": \"事件描述\",\n" +
            "    \"sourceEvidence\": \"原文证据\"\n" +
            "  }],\n" +
            "  \"risks\": [{ \"title\": \"风险标题\", \"description\": \"风险描述\", \"level\": \"LOW/MEDIUM/HIGH\" }],\n" +
            "  \"conflicts\": [{ \"title\": \"冲突标题\", \"description\": \"冲突描述\", \"relatedItems\": [] }],\n" +
            "  \"planningSuggestions\": [{ \"title\": \"建议标题\", \"description\": \"建议详细描述\" }]\n" +
            "}\n\n" +
            "### 重要注意事项:\n" +
            "1. 所有日期时间必须是 \"yyyy-MM-dd HH:mm:ss\" 格式，如果原文没有明确时间则使用空字符串\n" +
            "2. priority 只能是 LOW, MEDIUM, HIGH, URGENT 之一\n" +
            "3. risk level 只能是 LOW, MEDIUM, HIGH 之一\n" +
            "4. 如果原文没有对应类型的信息，返回空数组 []\n" +
            "5. 严格输出纯 JSON，不要包含 markdown 代码块标记\n" +
            "6. 确保 JSON 是合法的，可以被直接解析\n" +
            "7. 所有任务的 deadline 必须晚于当前时间，如果原文中的时间已经过去，请基于当前时间合理推断";
    }
}
