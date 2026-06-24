package com.planflow.repository;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.planflow.entity.TimelineEvent;
import org.apache.ibatis.annotations.Mapper;

@Mapper
public interface TimelineEventMapper extends BaseMapper<TimelineEvent> {
}
