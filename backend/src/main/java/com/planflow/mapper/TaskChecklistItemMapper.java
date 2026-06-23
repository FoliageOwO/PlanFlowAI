package com.planflow.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.planflow.entity.TaskChecklistItem;
import org.apache.ibatis.annotations.Mapper;

@Mapper
public interface TaskChecklistItemMapper extends BaseMapper<TaskChecklistItem> {
}
