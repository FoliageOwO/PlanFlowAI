package com.planflow.repository;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.planflow.entity.Notification;
import org.apache.ibatis.annotations.Mapper;

@Mapper
public interface NotificationMapper extends BaseMapper<Notification> {
}
