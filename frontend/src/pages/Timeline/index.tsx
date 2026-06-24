import React from 'react'
import { useNavigate } from 'react-router-dom'
import dayjs from 'dayjs'
import isSameOrAfter from 'dayjs/plugin/isSameOrAfter'
import isSameOrBefore from 'dayjs/plugin/isSameOrBefore'
import { Button } from '../../components/ui/button'
import { Badge } from '../../components/ui/badge'
import { Card, CardContent } from '../../components/ui/card'
import { Spinner } from '../../components/ui/spinner'
import EmptyState from '../../components/common/EmptyState'
import { mockApi, isMockMode } from '../../services/mockData'
import http from '../../services/api'
import type { TimelineEvent } from '../../services/mockData'
import { Clock, Calendar, Bell, Flag, ChevronRight } from 'lucide-react'

dayjs.extend(isSameOrAfter)
dayjs.extend(isSameOrBefore)

const typeConfig: Record<string, { color: string; bg: string; icon: React.ReactNode; label: string; borderColor: string }> = {
  TASK_DEADLINE: { color: '#ef4444', bg: 'bg-red-50', icon: <Clock className="w-4 h-4 text-red-500" />, label: '任务截止', borderColor: 'border-red-300' },
  EVENT: { color: '#10b981', bg: 'bg-emerald-50', icon: <Calendar className="w-4 h-4 text-emerald-500" />, label: '事件', borderColor: 'border-emerald-300' },
  REMINDER: { color: '#3b82f6', bg: 'bg-blue-50', icon: <Bell className="w-4 h-4 text-blue-500" />, label: '提醒', borderColor: 'border-blue-300' },
  PLAN_STEP: { color: '#f59e0b', bg: 'bg-orange-50', icon: <Flag className="w-4 h-4 text-orange-500" />, label: '计划步骤', borderColor: 'border-orange-300' },
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
    (async () => {
      setLoading(true)
      try {
        if (isMockMode()) { const res = await mockApi.getTimelineEvents(); setEvents(res.data) }
        else { const res: any = await http.get('/timeline'); setEvents(res.data) }
      } catch { } finally { setLoading(false) }
    })()
  }, [])

  const grouped = React.useMemo(() => {
    const groups: Record<string, TimelineEvent[]> = { '今天': [], '明天': [], '本周': [], '更晚': [] }
    events.forEach(evt => {
      const label = getGroupLabel(dayjs(evt.time))
      if (groups[label]) groups[label].push(evt)
      else groups['更晚'].push(evt)
    })
    Object.values(groups).forEach(arr => arr.sort((a, b) => dayjs(a.time).diff(dayjs(b.time))))
    return groupOrder.filter(key => groups[key].length > 0).map(key => ({ label: key, events: groups[key] }))
  }, [events])

  return (
    <div className="py-4 animate-fade-in">
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-xl font-bold text-slate-900">📅 时间轴</h2>
        <span className="text-sm text-slate-400">{events.length} 个事件</span>
      </div>

      {loading ? <div className="py-20"><Spinner size={36} /></div>
      : grouped.length > 0 ? (
        <div className="relative">
          {/* Timeline vertical line */}
          <div className="absolute left-5 top-0 bottom-0 w-0.5 bg-slate-200 z-0" />

          {grouped.map(({ label, events: groupEvents }) => (
            <div key={label} className="mb-6 relative z-10">
              {/* Group header */}
              <div className="flex items-center gap-3 mb-3 pl-0.5">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white text-xs font-bold shadow-sm flex-shrink-0 ${
                  label === '今天' ? 'bg-blue-600' : label === '明天' ? 'bg-emerald-500' : label === '本周' ? 'bg-orange-500' : 'bg-slate-300'
                }`}>
                  {label === '今天' ? '今' : label === '明天' ? '明' : label === '本周' ? '周' : '更'}
                </div>
                <div>
                  <span className="font-semibold text-base text-slate-900">{label}</span>
                  <span className="text-sm text-slate-400 ml-2">{groupEvents.length} 项</span>
                </div>
              </div>

              {/* Events */}
              <div className="space-y-2 ml-12">
                {groupEvents.map(evt => {
                  const cfg = typeConfig[evt.type] || typeConfig.EVENT
                  return (
                    <div key={evt.id}
                      onClick={() => evt.relatedTaskId && navigate(`/tasks/${evt.relatedTaskId}`)}
                      className={`p-4 bg-white rounded-xl border border-slate-100 hover:shadow-sm transition-all duration-150 hover:translate-x-1 cursor-pointer relative ${
                        evt.relatedTaskId ? 'hover:border-blue-200' : ''
                      }`}
                    >
                      {/* Connector dot */}
                      <div className={`absolute -left-[37px] top-4 w-3 h-3 rounded-full border-2 bg-white ${cfg.borderColor}`} />

                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <span className="font-medium text-sm text-slate-900">{evt.title}</span>
                            <Badge variant="outline" className={`text-[10px] px-1.5 py-0 h-auto ${cfg.bg} border-0`}>
                              {cfg.icon} <span className="ml-1">{cfg.label}</span>
                            </Badge>
                          </div>
                          <span className="text-xs text-slate-500">
                            {dayjs(evt.time).format('HH:mm')}
                            {evt.description ? ` — ${evt.description}` : ''}
                          </span>
                        </div>
                        {evt.relatedTaskId && <ChevronRight className="w-4 h-4 text-gray-300 flex-shrink-0" />}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <Card className="border-slate-100">
          <CardContent className="py-12">
            <EmptyState description="暂无时间轴事件" actionText="添加新任务" actionPath="/input" />
          </CardContent>
        </Card>
      )}
    </div>
  )
}
