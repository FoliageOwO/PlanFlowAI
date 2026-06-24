package com.planflow.repository;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.planflow.entity.ReminderRule;
import org.apache.ibatis.annotations.Mapper;

@Mapper
public interface ReminderRuleMapper extends BaseMapper<ReminderRule> {
}
