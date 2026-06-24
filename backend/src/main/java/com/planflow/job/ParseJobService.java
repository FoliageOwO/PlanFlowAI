package com.planflow.job;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.planflow.entity.ParseJob;
import com.planflow.mapper.ParseJobMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class ParseJobService {

    private final ParseJobMapper parseJobMapper;

    public ParseJob createJob(Long userId, Long sourceInputId) {
        ParseJob job = new ParseJob();
        job.setUserId(userId);
        job.setSourceInputId(sourceInputId);
        job.setStatus("PENDING");
        job.setProgress(0);
        job.setRetryCount(0);
        job.setCreatedAt(LocalDateTime.now());
        job.setUpdatedAt(LocalDateTime.now());
        parseJobMapper.insert(job);
        log.info("Created parse job: id={}, sourceInputId={}", job.getId(), sourceInputId);
        return job;
    }

    public ParseJob getJobById(Long id) {
        return parseJobMapper.selectById(id);
    }

    public List<ParseJob> getPendingJobs(int limit) {
        LambdaQueryWrapper<ParseJob> wrapper = new LambdaQueryWrapper<ParseJob>()
                .eq(ParseJob::getStatus, "PENDING")
                .orderByAsc(ParseJob::getCreatedAt)
                .last("LIMIT " + limit);
        return parseJobMapper.selectList(wrapper);
    }

    public void updateStatus(Long jobId, String status) {
        ParseJob job = new ParseJob();
        job.setId(jobId);
        job.setStatus(status);
        job.setUpdatedAt(LocalDateTime.now());
        parseJobMapper.updateById(job);
    }

    public void updateProgress(Long jobId, int progress, String stage) {
        ParseJob job = new ParseJob();
        job.setId(jobId);
        job.setProgress(progress);
        job.setStage(stage);
        job.setUpdatedAt(LocalDateTime.now());
        parseJobMapper.updateById(job);
    }

    public void markRunning(Long jobId) {
        ParseJob job = new ParseJob();
        job.setId(jobId);
        job.setStatus("RUNNING");
        job.setStartedAt(LocalDateTime.now());
        job.setUpdatedAt(LocalDateTime.now());
        parseJobMapper.updateById(job);
    }

    public void markCompleted(Long jobId) {
        ParseJob job = new ParseJob();
        job.setId(jobId);
        job.setStatus("COMPLETED");
        job.setProgress(100);
        job.setStage("COMPLETED");
        job.setFinishedAt(LocalDateTime.now());
        job.setUpdatedAt(LocalDateTime.now());
        parseJobMapper.updateById(job);
    }

    public void markFailed(Long jobId, String errorMessage) {
        ParseJob job = new ParseJob();
        job.setId(jobId);
        job.setStatus("FAILED");
        job.setErrorMessage(errorMessage);
        job.setFinishedAt(LocalDateTime.now());
        job.setUpdatedAt(LocalDateTime.now());
        parseJobMapper.updateById(job);
    }

    public void retryJob(Long jobId) {
        ParseJob job = parseJobMapper.selectById(jobId);
        if (job == null) {
            throw new RuntimeException("解析任务不存在");
        }
        if (!"FAILED".equals(job.getStatus())) {
            throw new RuntimeException("只能重试已失败的任务");
        }
        int maxRetry = 3;
        if (job.getRetryCount() >= maxRetry) {
            throw new RuntimeException("已达到最大重试次数(" + maxRetry + ")，无法继续重试");
        }
        job.setStatus("PENDING");
        job.setStage(null);
        job.setProgress(0);
        job.setErrorMessage(null);
        job.setRetryCount(job.getRetryCount() + 1);
        job.setUpdatedAt(LocalDateTime.now());
        parseJobMapper.updateById(job);
        log.info("Retrying job: id={}, retryCount={}", jobId, job.getRetryCount());
    }
}
