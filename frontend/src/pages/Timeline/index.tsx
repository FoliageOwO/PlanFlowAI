import React from 'react'
import { Card, Timeline as AntTimeline, Typography, Empty, Spin, Tag } from 'antd'
import {
  ClockCircleOutlined, CalendarOutlined, BellOutlined, FlagOutlined,
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

const typeConfig: Record<string, { color: string; icon: React.ReactNode; label: string }> = {
  TASK_DEADLINE: { color: 'red', icon: <ClockCircleOutlined />, label: '任务截止' },
  EVENT: { color: 'green', icon: <CalendarOutlined />, label: '事件' },
  REMINDER: { color: 'blue', icon: <BellOutlined />, label: '提醒' },
  PLAN_STEP: { color: 'gold', icon: <FlagOutlined />, label: '计划步骤' },
}

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
        // ignore
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
    events.forEach((evt) => {
      const label = getGroupLabel(dayjs(evt.time))
      if (groups[label]) {
        groups[label].push(evt)
      } else {
        groups['更晚'].push(evt)
      }
    })
    return Object.entries(groups).filter(([, evts]) => evts.length > 0)
  }, [events])

  return (
    <div className="page-container" style={{ padding: '16px 0' }}>
      <Title level={4} style={{ marginBottom: 16 }}>时间轴</Title>

      <Spin spinning={loading}>
        {grouped.length > 0 ? (
          grouped.map(([groupLabel, evts]) => (
            <Card
              key={groupLabel}
              title={groupLabel}
              size="small"
              style={{ marginBottom: 16 }}
            >
              <AntTimeline
                items={evts.map((evt) => {
                  const cfg = typeConfig[evt.type] || typeConfig.EVENT
                  return {
                    color: cfg.color,
                    children: (
                      <div
                        onClick={() => evt.relatedTaskId && navigate(`/tasks/${evt.relatedTaskId}`)}
                        style={{ cursor: evt.relatedTaskId ? 'pointer' : 'default' }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                          <Text strong>{evt.title}</Text>
                          <Tag color={cfg.color} style={{ fontSize: 11, lineHeight: '18px' }}>
                            {cfg.icon} {cfg.label}
                          </Tag>
                        </div>
                        <div style={{ fontSize: 13, color: '#666' }}>
                          {dayjs(evt.time).format('HH:mm')} - {evt.description}
                        </div>
                      </div>
                    ),
                  }
                })}
              />
            </Card>
          ))
        ) : (
          <Empty description="暂无时间轴事件" image={Empty.PRESENTED_IMAGE_SIMPLE} />
        )}
      </Spin>
    </div>
  )
}
