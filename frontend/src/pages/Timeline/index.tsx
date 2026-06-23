import React from 'react'
import { Card, Tag, Typography, Empty, Spin, Space, Button, Row, Col } from 'antd'
import {
  ClockCircleOutlined, CalendarOutlined, BellOutlined, FlagOutlined,
  RightOutlined, ArrowRightOutlined,
} from '@ant-design/icons'
import dayjs from 'dayjs'
import isSameOrAfter from 'dayjs/plugin/isSameOrAfter'
import isSameOrBefore from 'dayjs/plugin/isSameOrBefore'
import { useNavigate } from 'react-router-dom'
import { mockApi, isMockMode } from '../../services/mockData'
import http from '../../services/api'
import type { TimelineEvent } from '../../services/mockData'

dayjs.extend(isSameOrAfter)
dayjs.extend(isSameOrBefore)

const { Title, Text } = Typography

const typeConfig: Record<string, { color: string; bg: string; icon: React.ReactNode; label: string }> = {
  TASK_DEADLINE: {
    color: 'red',
    bg: '#fff2f0',
    icon: <ClockCircleOutlined style={{ color: '#ff4d4f' }} />,
    label: '任务截止',
  },
  EVENT: {
    color: 'green',
    bg: '#f6ffed',
    icon: <CalendarOutlined style={{ color: '#52c41a' }} />,
    label: '事件',
  },
  REMINDER: {
    color: 'blue',
    bg: '#e6f4ff',
    icon: <BellOutlined style={{ color: '#1677ff' }} />,
    label: '提醒',
  },
  PLAN_STEP: {
    color: 'gold',
    bg: '#fffbe6',
    icon: <FlagOutlined style={{ color: '#faad14' }} />,
    label: '计划步骤',
  },
}

const groupOrder = ['今天', '明天', '本周', '更晚']

function getGroupLabel(date: dayjs.Dayjs): string {
  const now = dayjs()
  if (date.isSame(now, 'day')) return '今天'
  if (date.isSame(now.add(1, 'day'), 'day')) return '明天'
  if (date.isSame(now, 'week')) return '本周'
  return '更晚'
}

export default function TimelinePage() {
  const navigate = useNavigate()
  const [events, setEvents] = React.useState<TimelineEvent[]>([])
  const [loading, setLoading] = React.useState(true)

  React.useEffect(() => {
    const load = async () => {
      setLoading(true)
      try {
        if (isMockMode()) {
          const res = await mockApi.getTimelineEvents()
          setEvents(res.data)
        } else {
          const res: any = await http.get('/timeline')
          setEvents(res.data)
        }
      } catch {
        // silent
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  // Group events by day category
  const grouped = React.useMemo(() => {
    const groups: Record<string, TimelineEvent[]> = {
      '今天': [],
      '明天': [],
      '本周': [],
      '更晚': [],
    }
    events.forEach(evt => {
      const label = getGroupLabel(dayjs(evt.time))
      if (groups[label]) {
        groups[label].push(evt)
      } else {
        groups['更晚'].push(evt)
      }
    })
    // Sort by time within each group
    Object.values(groups).forEach(arr => {
      arr.sort((a, b) => dayjs(a.time).diff(dayjs(b.time)))
    })
    return groupOrder.filter(key => groups[key].length > 0).map(key => ({ label: key, events: groups[key] }))
  }, [events])

  return (
    <div className="page-container" style={{ padding: '16px 0' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <Title level={4} style={{ margin: 0 }}>📅 时间轴</Title>
        <Text style={{ color: '#999', fontSize: 13 }}>
          {events.length} 个事件
        </Text>
      </div>

      <Spin spinning={loading}>
        {grouped.length > 0 ? (
          <div style={{ position: 'relative' }}>
            {/* Timeline vertical line */}
            <div style={{
              position: 'absolute',
              left: 20,
              top: 0,
              bottom: 0,
              width: 2,
              background: 'var(--border-light)',
              zIndex: 0,
            }} />

            {grouped.map(({ label, events: groupEvents }) => (
              <div key={label} style={{ marginBottom: 24, position: 'relative', zIndex: 1 }}>
                {/* Group header */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  marginBottom: 12,
                  paddingLeft: 8,
                }}>
                  <div style={{
                    width: 28,
                    height: 28,
                    borderRadius: '50%',
                    background: label === '今天'
                      ? 'var(--primary)'
                      : label === '明天'
                        ? 'var(--success)'
                        : label === '本周'
                          ? 'var(--warning)'
                          : '#d9d9d9',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#fff',
                    fontSize: 12,
                    fontWeight: 700,
                    boxShadow: '0 2px 6px rgba(0,0,0,0.15)',
                    flexShrink: 0,
                  }}>
                    {label === '今天' ? '今' : label === '明天' ? '明' : label === '本周' ? '周' : '更'}
                  </div>
                  <Text strong style={{ fontSize: 16 }}>{label}</Text>
                  <Text style={{ color: '#999', fontSize: 13 }}>{groupEvents.length} 项</Text>
                </div>

                {/* Events */}
                <Space direction="vertical" style={{ width: '100%' }} size={8}>
                  {groupEvents.map((evt, idx) => {
                    const cfg = typeConfig[evt.type] || typeConfig.EVENT
                    return (
                      <div
                        key={evt.id}
                        onClick={() => evt.relatedTaskId && navigate(`/tasks/${evt.relatedTaskId}`)}
                        style={{
                          marginLeft: 40,
                          padding: '14px 16px',
                          background: '#fff',
                          borderRadius: 'var(--radius-md)',
                          border: '1px solid var(--border-light)',
                          cursor: evt.relatedTaskId ? 'pointer' : 'default',
                          transition: 'all 0.2s',
                          position: 'relative',
                        }}
                        onMouseEnter={e => {
                          e.currentTarget.style.borderColor = cfg.color === 'red' ? '#ff4d4f' : cfg.color === 'green' ? '#52c41a' : cfg.color === 'blue' ? '#1677ff' : '#faad14'
                          e.currentTarget.style.boxShadow = 'var(--shadow-sm)'
                          e.currentTarget.style.transform = 'translateX(4px)'
                        }}
                        onMouseLeave={e => {
                          e.currentTarget.style.borderColor = 'var(--border-light)'
                          e.currentTarget.style.boxShadow = 'none'
                          e.currentTarget.style.transform = 'translateX(0)'
                        }}
                      >
                        {/* Connector dot */}
                        <div style={{
                          position: 'absolute',
                          left: -28,
                          top: 18,
                          width: 12,
                          height: 12,
                          borderRadius: '50%',
                          background: cfg.bg,
                          border: `3px solid ${cfg.color === 'red' ? '#ff4d4f' : cfg.color === 'green' ? '#52c41a' : cfg.color === 'blue' ? '#1677ff' : '#faad14'}`,
                        }} />

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                          <div style={{ flex: 1 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
                              <Text strong style={{ fontSize: 14 }}>{evt.title}</Text>
                              <Tag
                                color={cfg.color}
                                style={{ fontSize: 11, lineHeight: '18px', margin: 0 }}
                              >
                                {cfg.icon} {cfg.label}
                              </Tag>
                            </div>
                            <Text style={{ fontSize: 13, color: '#666', display: 'block' }}>
                              {dayjs(evt.time).format('HH:mm')}
                              {evt.description ? ` - ${evt.description}` : ''}
                            </Text>
                          </div>
                          {evt.relatedTaskId && (
                            <Button
                              type="text"
                              size="small"
                              icon={<ArrowRightOutlined />}
                              style={{ color: '#999', flexShrink: 0 }}
                            />
                          )}
                        </div>
                      </div>
                    )
                  })}
                </Space>
              </div>
            ))}
          </div>
        ) : (
          <Card>
            <Empty
              description="暂无时间轴事件"
              image={Empty.PRESENTED_IMAGE_SIMPLE}
            >
              <Button type="primary" onClick={() => navigate('/input')}>
                添加新任务
              </Button>
            </Empty>
          </Card>
        )}
      </Spin>
    </div>
  )
}
