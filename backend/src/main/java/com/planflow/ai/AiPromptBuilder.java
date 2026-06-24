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
            "    \"title\": \"任务标题（必须包含来源课程/项目/公告名称，让用户一看就知道是哪个场景的任务）\",\n" +
            "    \"description\": \"任务详细描述（包含完整上下文信息：课程名称、提交要求、格式规范、邮箱地址等全部细节）\",\n" +
            "    \"deadline\": \"YYYY-MM-DD HH:mm:ss 格式的截止时间，没有截止时间则填null\",\n" +
            "    \"priority\": \"LOW/MEDIUM/HIGH/URGENT\",\n" +
            "    \"estimatedMinutes\": 30,\n" +
            "    \"constraints\": [],\n" +
            "    \"checklist\": [\"具体的可核对项1\", \"具体的可核对项2\", \"...\"],\n" +
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
            "1. 所有日期时间必须是 \"yyyy-MM-dd HH:mm:ss\" 格式，没有明确时间则填null\n" +
            "2. priority 只能是 LOW, MEDIUM, HIGH, URGENT 之一\n" +
            "3. risk level 只能是 LOW, MEDIUM, HIGH 之一\n" +
            "4. 如果原文没有对应类型的信息，返回空数组 []\n" +
            "5. 严格输出纯 JSON，不要包含 markdown 代码块标记\n" +
            "6. 确保 JSON 是合法的，可以被直接解析\n" +
            "7. 所有任务的 deadline 必须晚于当前时间，如果原文中的时间已经过去，请基于当前时间合理推断\n" +
            "8. checklist 必须包含具体可操作的检查项，例如\"将源码打包为zip格式，命名：组号_项目名_源码.zip\"，不要笼统写\"提交源码\"\n" +
            "9. title 必须包含课程或项目名称，例如\"《软件项目开发与实践》课程项目材料提交\"\n" +
            "10. description 必须包含完整的要求，例如提交格式、命名规范、邮箱地址、截止时间等全部细节\n" +
            "11. **任务合并规则（重要）**：同一份公告/通知中，相同截止时间和同一场景的多项要求，合并为 **一个任务**，用 checklist 区分不同交付物。\n" +
            "    示例（正确）：\n" +
            "    原始文本：\"7月14日前提交源码(zip)、文档(PDF)、PPT，发到xxx@edu.cn\"\n" +
            "    正确输出：tasks = [{\n" +
            "      \"title\": \"《课程名》期末项目材料提交\",\n" +
            "      \"deadline\": \"2026-07-14 18:00:00\",\n" +
            "      \"checklist\": [\"将源码打包为zip，命名：组号_项目名_源码.zip\", \"整理项目文档为PDF，命名：组号_项目名_文档.pdf\", \"制作答辩PPT，命名：组号_项目名_答辩.pptx\"],\n" +
            "      \"description\": \"将项目源码、文档和PPT按格式要求提交至xxx@edu.cn，截止7月14日18:00\"\n" +
            "    }]\n" +
            "    错误输出（严禁）：tasks = [{\"title\":\"提交源码\"}, {\"title\":\"提交文档\"}, {\"title\":\"提交PPT\"}]\n" +
            "    请严格遵循上述合并规则。\n" +
            "12. **事件提取规则**：答辩、会议、演讲等有时间地点的事件单独提取到 events 数组中，不要作为任务\n" +
            "13. **每条截止信息都是独立任务**：原文中每提到一个有明确时间或独立含义的事项（考试、提交、会议等），无论句子长短，都单独作为一个 task 或 event 提取，不能合并到相邻的任务中";
    }
}
