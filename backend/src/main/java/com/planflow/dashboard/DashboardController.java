package com.planflow.dashboard;

import com.planflow.common.ApiResponse;
import com.planflow.task.TaskService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/dashboard")
@RequiredArgsConstructor
public class DashboardController {

    private final TaskService taskService;

    @GetMapping("/tasks")
    public ApiResponse getDashboardTasks() {
        return ApiResponse.success(Map.of(
                "today", taskService.getTodayTasks(),
                "upcoming", taskService.getUpcomingTasks(),
                "overdue", taskService.getOverdueTasks()
        ));
    }
}
