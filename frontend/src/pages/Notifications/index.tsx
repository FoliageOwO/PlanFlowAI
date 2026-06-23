import React from 'react'
import { Card, Tabs, List, Tag, Button, Empty, Spin, Typography, Space, message } from 'antd'
import {
  BellOutlined, CheckCircleOutlined, WarningOutlined, ShareAltOutlined,
  InfoCircleOutlined, CheckOutlined,
} from '@ant-design/icons'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import 'dayjs/locale/zh-cn'
import { useNavigate } from 'react-router-dom'
import { mockApi, isMockMode } from '../../services/mockData'
import http from '../../services/api'
import type { NotificationItem } from '../../services/mockData'

dayjs.extend(relativeTime)
dayjs.locale('zh-cn')

const { Title, Text } = Typography

const typeConfig: Record<string, { icon: React.ReactNode; color: string }> = {
  TASK_DEADLINE: { icon: <WarningOutlined style={{ color: '#ff4d4f' }} />, color: '#fff2f0' },
  SYSTEM: { icon: <InfoCircleOutlined style={{ color: '#1677ff' }} />, color: '#e6f4ff' },
  REMINDER: { icon: <BellOutlined style={{ color: '#faad14' }} />, color: '#fffbe6' },
  SHARE: { icon: <ShareAltOutlined style={{ color: '#52c41a' }} />, color: '#f6ffed' },
}

const typeLabels: Record<string, string> = {
  TASK_DEADLINE: '任务截止',
  SYSTEM: '系统通知',
  REMINDER: '提醒',
  SHARE: '分享',
}

export default function Notifications() {
  const navigate = useNavigate()
  const [notifications, setNotifications] = React.useState<NotificationItem[]>([])
  const [loading, setLoading] = React.useState(true)
  const [tab, setTab] = React.useState('unread')
  const [page, setPage] = React.useState(1)
  const [total, setTotal] = React.useState(0)

  const loadNotifications = React.useCallback(async (p?: number) => {
    setLoading(true)
    try {
      const params = { page: p || page, pageSize: 20, unreadOnly: tab === 'unread' }
      if (isMockMode()) {
        const res = await mockApi.getNotifications(params)
        setNotifications(res.data.list)
        setTotal(res.data.total)
      } else {
        const res: any = await http.get('/notifications', { params })
        setNotifications(res.data.list)
        setTotal(res.data.total)
      }
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }, [tab, page])

  React.useEffect(() => { loadNotifications() }, [loadNotifications])

  const handleMarkAllRead = async () => {
    try {
      if (isMockMode()) {
        await mockApi.markAllNotificationsRead()
      } else {
        await http.post('/notifications/read-all')
      }
      message.success('已全部标记为已读')
      loadNotifications()
    } catch {
      message.error('操作失败')
    }
  }

  return (
    <div className="page-container" style={{ padding: '16px 0' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Title level={4} style={{ margin: 0 }}>通知中心</Title>
        <Button icon={<CheckOutlined />} onClick={handleMarkAllRead}>
          全部已读
        </Button>
      </div>

      <Card bodyStyle={{ padding: 0 }}>
        <Tabs
          activeKey={tab}
          onChange={(key) => { setTab(key); setPage(1) }}
          items={[
            {
              key: 'unread',
              label: '未读',
              children: (
                <Spin spinning={loading}>
                  {notifications.length > 0 ? (
                    <List
                      dataSource={notifications}
                      pagination={{
                        current: page,
                        pageSize: 20,
                        total,
                        onChange: (p) => setPage(p),
                        showSizeChanger: false,
                        size: 'small',
                      }}
                      renderItem={(item) => {
                        const cfg = typeConfig[item.type] || typeConfig.SYSTEM
                        return (
                          <List.Item
                            onClick={() => item.relatedTaskId && navigate(`/tasks/${item.relatedTaskId}`)}
                            style={{
                              cursor: item.relatedTaskId ? 'pointer' : 'default',
                              padding: '12px 16px',
                              background: item.read ? 'transparent' : '#f6f8ff',
                            }}
                            extra={
                              !item.read && <Tag color="blue">未读</Tag>
                            }
                          >
                            <List.Item.Meta
                              avatar={
                                <div style={{
                                  width: 36, height: 36, borderRadius: 8,
                                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                                  background: cfg.color,
                                  fontSize: 18,
                                }}>
                                  {cfg.icon}
                                </div>
                              }
                              title={
                                <Space>
                                  <Text strong style={{ fontSize: 14 }}>{item.title}</Text>
                                  <Text style={{ fontSize: 12, color: '#999' }}>
                                    {dayjs(item.createdAt).fromNow()}
                                  </Text>
                                </Space>
                              }
                              description={
                                <Text style={{ fontSize: 13, color: '#666' }}>{item.content}</Text>
                              }
                            />
                          </List.Item>
                        )
                      }}
                    />
                  ) : (
                    <Empty description="暂无通知" image={Empty.PRESENTED_IMAGE_SIMPLE} style={{ padding: 40 }} />
                  )}
                </Spin>
              ),
            },
            {
              key: 'all',
              label: '全部',
              children: (
                <Spin spinning={loading}>
                  {notifications.length > 0 ? (
                    <List
                      dataSource={notifications}
                      pagination={{
                        current: page,
                        pageSize: 20,
                        total,
                        onChange: (p) => setPage(p),
                        showSizeChanger: false,
                        size: 'small',
                      }}
                      renderItem={(item) => {
                        const cfg = typeConfig[item.type] || typeConfig.SYSTEM
                        return (
                          <List.Item
                            onClick={() => item.relatedTaskId && navigate(`/tasks/${item.relatedTaskId}`)}
                            style={{
                              cursor: item.relatedTaskId ? 'pointer' : 'default',
                              padding: '12px 16px',
                              background: item.read ? 'transparent' : '#f6f8ff',
                            }}
                            extra={
                              !item.read && <Tag color="blue">未读</Tag>
                            }
                          >
                            <List.Item.Meta
                              avatar={
                                <div style={{
                                  width: 36, height: 36, borderRadius: 8,
                                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                                  background: cfg.color,
                                  fontSize: 18,
                                }}>
                                  {cfg.icon}
                                </div>
                              }
                              title={
                                <Space>
                                  <Text strong style={{ fontSize: 14 }}>{item.title}</Text>
                                  <Tag style={{ fontSize: 11 }}>{typeLabels[item.type]}</Tag>
                                  <Text style={{ fontSize: 12, color: '#999' }}>
                                    {dayjs(item.createdAt).fromNow()}
                                  </Text>
                                </Space>
                              }
                              description={
                                <Text style={{ fontSize: 13, color: '#666' }}>{item.content}</Text>
                              }
                            />
                          </List.Item>
                        )
                      }}
                    />
                  ) : (
                    <Empty description="暂无通知" image={Empty.PRESENTED_IMAGE_SIMPLE} style={{ padding: 40 }} />
                  )}
                </Spin>
              ),
            },
          ]}
        />
      </Card>
    </div>
  )
}
