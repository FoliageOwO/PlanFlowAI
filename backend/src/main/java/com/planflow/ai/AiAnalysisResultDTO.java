package com.planflow.ai;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Data;
import java.util.List;

@Data
public class AiAnalysisResultDTO {

    private String summary;

    @JsonProperty("goals")
    private List<Goal> goals;

    @JsonProperty("tasks")
    private List<TaskItem> tasks;

    @JsonProperty("events")
    private List<EventItem> events;

    @JsonProperty("risks")
    private List<Risk> risks;

    @JsonProperty("conflicts")
    private List<Conflict> conflicts;

    @JsonProperty("planningSuggestions")
    private List<PlanningSuggestion> planningSuggestions;

    // ---------- Inner DTOs ----------

    @Data
    public static class Goal {
        private String title;
        private String description;
    }

    @Data
    public static class TaskItem {
        private String title;
        private String description;
        private String deadline;
        private String priority;
        private Integer estimatedMinutes;
        private List<String> constraints;
        private List<String> checklist;
        private List<SuggestedReminder> suggestedReminders;
        private String sourceEvidence;
    }

    @Data
    public static class SuggestedReminder {
        private String title;
        private String content;
        private String remindAt;
    }

    @Data
    public static class EventItem {
        private String title;
        private String startTime;
        private String endTime;
        private String location;
        private String description;
        private String sourceEvidence;
    }

    @Data
    public static class Risk {
        private String title;
        private String description;
        private String level;
    }

    @Data
    public static class Conflict {
        private String title;
        private String description;
        private List<String> relatedItems;
    }

    @Data
    public static class PlanningSuggestion {
        private String title;
        private String description;
    }
}
