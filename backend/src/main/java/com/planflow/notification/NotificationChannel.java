package com.planflow.notification;

import com.planflow.entity.Notification;

/**
 * 通知渠道接口。
 * 实现此接口并注册为 Spring Bean 即可接入新的通知方式。
 */
public interface NotificationChannel {

    /** 渠道唯一标识 */
    String channelType();

    /** 该渠道是否对指定用户启用 */
    boolean isEnabled(Long userId);

    /** 发送通知 */
    void send(Notification notification);

    /** 优先级，数值越小越优先 */
    default int getOrder() { return 0; }
}
