import React from 'react'
import { Card, Tabs, List, Tag, Button, Empty, Spin, Typography, Space, message, Badge, Tooltip } from 'antd'
import {
  BellOutlined, CheckCircleOutlined, WarningOutlined, ShareAltOutlined,
  InfoCircleOutlined, CheckOutlined, DeleteOutlined, FilterOutlined,
  ClockCircleOutlined, RightOutlined,
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

const typeConfig: Record<string, { icon: React.ReactNode; color: string; bg: string; label: string }> = {
  TASK_DEADLINE: {
    icon: <WarningOutlined style={{ color: '#ff4d4f' }} />,
    color: '#ff4d4f',
    bg: '#fff2f0',
    label: '任务截止',
  },
  SYSTEM: {
    icon: <InfoCircleOutlined style={{ color: '#1677ff' }} />,
    color: '#1677ff',
    bg: '#e6f4ff',
    label: '系统通知',
  },
  REMINDER: {
    icon: <BellOutlined style={{ color: '#faad14' }} />,
    color: '#faad14',
    bg: '#fffbe6',
    label: '提醒',
  },
  SHARE: {
    icon: <ShareAltOutlined style={{ color: '#52c41a' }} />,
    color: '#52c41a',
    bg: '#f6ffed',
    label: '分享',
  },
}

export default function Notifications() {
  const navigate = useNavigate()
  const [notifications, setNotifications] = React.useState<NotificationItem[]>([])
  const [loading, setLoading] = React.useState(true)
  const [tab, setTab] = React.useState('unread')
  const [page, setPage] = React.useState(1)
  const [total, setTotal] = React.useState(0)
  const pageSize = 20

  const loadNotifications = React.useCallback(async (p?: number) => {
    setLoading(true)
    try {
      const params = { page: p || page, pageSize: pageSize, unreadOnly: tab === 'unread' }
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
      // silent
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

  const handleMarkRead = async (item: NotificationItem) => {
    if (item.read) return
    try {
      if (isMockMode()) {
        // In mock mode, just update locally
      } else {
        await http.patch(`/notifications/${item.id}/read`)
      }
      loadNotifications()
    } catch {
      // silent
    }
  }

  const renderNotification = (item: NotificationItem) => {
    const cfg = typeConfig[item.type] || typeConfig.SYSTEM
    return (
      <List.Item
        onClick={() => {
          if (!item.read) handleMarkRead(item)
          if (item.relatedTaskId) navigate(`/tasks/${item.relatedTaskId}`)
        }}
        style={{
          cursor: 'pointer',
          padding: '14px 16px',
          borderLeft: `3px solid ${item.read ? 'transparent' : cfg.color}`,
          background: item.read ? '#fff' : `${cfg.bg}88`,
          transition: 'all 0.2s',
          borderRadius: 0,
        }}
        onMouseEnter={e => { e.currentTarget.style.background = '#f5f5f5' }}
        onMouseLeave={e => { e.currentTarget.style.background = item.read ? '#fff' : `${cfg.bg}88` }}
        extra={
          <Space size={4}>
            {!item.read && (
              <Tag color={cfg.color} style={{ fontSize: 11, borderRadius: 4 }}>
                未读
              </Tag>
            )}
            {item.relatedTaskId && (
              <Button type="text" size="small" icon={<RightOutlined />} style={{ color: '#999' }} />
            )}
          </Space>
        }
      >
        <List.Item.Meta
          avatar={
            <div style={{
              width: 40,
              height: 40,
              borderRadius: 10,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: cfg.bg,
              fontSize: 18,
            }}>
              {cfg.icon}
            </div>
          }
          title={
            <Space size={8}>
              <Text strong style={{ fontSize: 14, color: item.read ? '#666' : undefined }}>
                {item.title}
              </Text>
              <Text style={{ fontSize: 12, color: '#999' }}>
                {dayjs(item.createdAt).fromNow()}
              </Text>
            </Space>
          }
          description={
            <Text
              style={{
                fontSize: 13,
                color: item.read ? '#999' : '#555',
                display: 'block',
                lineHeight: 1.5,
                marginTop: 2,
              }}
            >
              {item.content}
            </Text>
          }
        />
      </List.Item>
    )
  }

  return (
    <div className="page-container" style={{ padding: '16px 0' }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
      }}>
        <div>
          <Title level={4} style={{ margin: 0 }}>🔔 通知中心</Title>
          <Text style={{ color: '#999', fontSize: 13, marginTop: 2, display: 'block' }}>
            {tab === 'unread'
              ? `你有 ${total} 条未读通知`
              : `共 ${total} 条通知`
            }
          </Text>
        </div>
        {tab === 'unread' && total > 0 && (
          <Tooltip title="全部标记为已读">
            <Button
              icon={<CheckOutlined />}
              onClick={handleMarkAllRead}
              style={{ borderRadius: 'var(--radius-sm)' }}
            >
              全部已读
            </Button>
          </Tooltip>
        )}
      </div>

      <Card bodyStyle={{ padding: 0 }} style={{ borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
        <Tabs
          activeKey={tab}
          onChange={(key) => { setTab(key); setPage(1) }}
          style={{ padding: '0 16px' }}
          tabBarExtraContent={
            tab === 'unread' && (
              <Text style={{ fontSize: 12, color: '#999' }}>
                {total > 0 ? `剩余 ${total} 条` : ''}
              </Text>
            )
          }
          items={[
            {
              key: 'unread',
              label: (
                <span>
                  <BellOutlined style={{ marginRight: 4 }} />
                  未读
                  {total > 0 && <Tag color="blue" style={{ marginLeft: 4, fontSize: 10 }}>{total}</Tag>}
                </span>
              ),
              children: (
                <Spin spinning={loading}>
                  {notifications.length > 0 ? (
                    <List
                      dataSource={notifications}
                      pagination={{
                        current: page,
                        pageSize,
                        total,
                        onChange: (p) => setPage(p),
                        showSizeChanger: false,
                        size: 'small',
                      }}
                      renderItem={renderNotification}
                    />
                  ) : (
                    <Empty
                      description="暂无未读通知"
                      image={Empty.PRESENTED_IMAGE_SIMPLE}
                      style={{ padding: '40px 0' }}
                    >
                      <Button type="primary" onClick={() => setTab('all')}>
                        查看全部通知
                      </Button>
                    </Empty>
                  )}
                </Spin>
              ),
            },
            {
              key: 'all',
              label: <span><InfoCircleOutlined style={{ marginRight: 4 }} />全部</span>,
              children: (
                <Spin spinning={loading}>
                  {notifications.length > 0 ? (
                    <List
                      dataSource={notifications}
                      pagination={{
                        current: page,
                        pageSize,
                        total,
                        onChange: (p) => setPage(p),
                        showSizeChanger: false,
                        size: 'small',
                      }}
                      renderItem={renderNotification}
                    />
                  ) : (
                    <Empty
                      description="暂无通知"
                      image={Empty.PRESENTED_IMAGE_SIMPLE}
                      style={{ padding: '40px 0' }}
                    />
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
