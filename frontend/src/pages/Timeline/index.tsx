import React from 'react'
import { useNavigate } from 'react-router-dom'
import dayjs from 'dayjs'
import isSameOrAfter from 'dayjs/plugin/isSameOrAfter'
import isSameOrBefore from 'dayjs/plugin/isSameOrBefore'
import { Button } from '../../components/ui/button'
import { Badge } from '../../components/ui/badge'
import { Card, CardContent } from '../../components/ui/card'
import { Tabs, TabsList, TabsTrigger } from '../../components/ui/tabs'
import { Spinner } from '../../components/ui/spinner'
import EmptyState from '../../components/common/EmptyState'
import { mockApi, isMockMode } from '../../services/mockData'
import http from '../../services/api'
import type { TimelineEvent } from '../../services/mockData'
import { ChevronLeft, ChevronRight, Clock, Calendar, Bell, Flag, ListCollapse } from 'lucide-react'

dayjs.extend(isSameOrAfter)
dayjs.extend(isSameOrBefore)

const typeConfig: Record<string, { color: string; bg: string; dot: string; label: string; border: string }> = {
  TASK_DEADLINE: { color: '#ef4444', bg: 'bg-red-50', dot: 'bg-red-500', label: '截止', border: 'border-red-300' },
  EVENT: { color: '#10b981', bg: 'bg-emerald-50', dot: 'bg-emerald-500', label: '事件', border: 'border-emerald-300' },
  REMINDER: { color: '#3b82f6', bg: 'bg-blue-50', dot: 'bg-blue-500', label: '提醒', border: 'border-blue-300' },
  PLAN_STEP: { color: '#f59e0b', bg: 'bg-orange-50', dot: 'bg-orange-500', label: '计划', border: 'border-orange-300' },
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
  const today = dayjs()
  const [viewDate, setViewDate] = React.useState(today)
  const [viewMode, setViewMode] = React.useState<'timeline' | 'calendar'>('timeline')
  const [selectedDay, setSelectedDay] = React.useState<string>(today.format('YYYY-MM-DD'))

  React.useEffect(() => {
    (async () => {
      setLoading(true)
      try {
        if (isMockMode()) { const res = await mockApi.getTimelineEvents(); setEvents(res.data) }
        else {
          const res: any = await http.get('/timeline')
          const raw = Array.isArray(res?.data) ? res.data : (res?.data?.list || [])
          setEvents(raw.map((evt: any) => ({
            id: String(evt.id || ''),
            type: evt.eventType || evt.type || 'EVENT',
            title: evt.title || '',
            description: evt.description || '',
            time: evt.startTime || evt.time || '',
            relatedTaskId: evt.taskId ? String(evt.taskId) : undefined,
          })))
        }
      } catch { } finally { setLoading(false) }
    })()
  }, [])

  const monthStart = viewDate.startOf('month').startOf('week')
  const monthEnd = viewDate.endOf('month').endOf('week')
  const days: dayjs.Dayjs[] = []
  let d = monthStart
  while (d.isSameOrBefore(monthEnd, 'day')) { days.push(d); d = d.add(1, 'day') }

  const eventsByDate = React.useMemo(() => {
    const map: Record<string, TimelineEvent[]> = {}
    for (const evt of events) {
      const key = dayjs(evt.time).format('YYYY-MM-DD')
      if (!map[key]) map[key] = []
      map[key].push(evt)
    }
    for (const key of Object.keys(map)) {
      map[key].sort((a, b) => dayjs(a.time).diff(dayjs(b.time)))
    }
    return map
  }, [events])

  const selectedEvents = eventsByDate[selectedDay] || []
  const weekDays = ['日', '一', '二', '三', '四', '五', '六']

  // Timeline grouping (must be before early return to keep hook order consistent)
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

  if (loading) return <div className="py-4"><Spinner size={36} /></div>

  return (
    <div className="py-4 animate-fade-in max-w-5xl mx-auto">
      {/* Tabs */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-slate-900">📅 日程</h2>
        <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as any)} className="w-auto">
          <TabsList className="h-8">
            <TabsTrigger value="timeline" className="text-xs px-3"><ListCollapse className="w-3.5 h-3.5 mr-1" />时间轴</TabsTrigger>
            <TabsTrigger value="calendar" className="text-xs px-3"><Calendar className="w-3.5 h-3.5 mr-1" />日历</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Timeline View */}
      {viewMode === 'timeline' && (
        grouped.length > 0 ? (
          <div className="relative">
            <div className="absolute left-5 top-0 bottom-0 w-0.5 bg-slate-200 z-0" />
            {grouped.map(({ label, events: groupEvents }) => (
              <div key={label} className="mb-6 relative z-10">
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
                <div className="space-y-2 ml-12">
                  {groupEvents.map(evt => {
                    const cfg = typeConfig[evt.type] || typeConfig.EVENT
                    return (
                      <div key={evt.id}
                        onClick={() => evt.relatedTaskId && navigate(`/tasks/${evt.relatedTaskId}`)}
                        className={`p-4 bg-white rounded-xl border border-slate-100 hover:shadow-sm transition-all duration-150 hover:translate-x-1 relative ${
                          evt.relatedTaskId ? 'cursor-pointer hover:border-blue-200' : ''
                        }`}
                      >
                        <div className={`absolute -left-[37px] top-4 w-3 h-3 rounded-full border-2 bg-white ${cfg.border}`} />
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                              <span className={`w-2 h-2 rounded-full ${cfg.dot}`} />
                              <span className="font-medium text-sm text-slate-900">{evt.title}</span>
                              <Badge variant="outline" className={`text-[10px] px-1.5 py-0 h-auto ${cfg.bg} border-0`}>
                                {cfg.label}
                              </Badge>
                            </div>
                            <span className="text-xs text-slate-500">
                              {dayjs(evt.time).isValid() ? dayjs(evt.time).format('MM-DD HH:mm') : ''}
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
          <Card className="border-slate-100"><CardContent className="py-12">
            <EmptyState description="暂无时间轴事件" actionText="添加新任务" actionPath="/input" />
          </CardContent></Card>
        )
      )}

      {/* Calendar View */}
      {viewMode === 'calendar' && (
        <>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-1">
              <Button variant="outline" size="sm" onClick={() => setViewDate(today)}>今天</Button>
              <Button variant="ghost" size="icon" onClick={() => setViewDate(viewDate.subtract(1, 'month'))}>
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <span className="text-base font-semibold min-w-[140px] text-center">
                {viewDate.year()}年{viewDate.month() + 1}月
              </span>
              <Button variant="ghost" size="icon" onClick={() => setViewDate(viewDate.add(1, 'month'))}>
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-7 mb-px">
            {weekDays.map(w => (
              <div key={w} className="text-center text-xs font-medium text-slate-400 py-2">{w}</div>
            ))}
          </div>

          <Card className="border-slate-100 overflow-hidden">
            <div className="grid grid-cols-7">
              {days.map(day => {
                const key = day.format('YYYY-MM-DD')
                const dayEvents = eventsByDate[key] || []
                const isToday = day.isSame(today, 'day')
                const isSelected = key === selectedDay
                const isOtherMonth = day.month() !== viewDate.month()
                return (
                  <div key={key}
                    onClick={() => setSelectedDay(key)}
                    className={`min-h-[88px] border-b border-r border-slate-50 p-1 cursor-pointer transition-colors relative
                      ${isSelected ? 'bg-blue-50' : 'hover:bg-slate-50'}
                      ${isOtherMonth ? 'opacity-30' : ''}
                    `}
                  >
                    <div className={`text-xs mb-1 w-6 h-6 flex items-center justify-center rounded-full
                      ${isToday ? 'bg-blue-600 text-white font-bold' : isSelected && !isToday ? 'bg-blue-100 text-blue-700 font-medium' : 'text-slate-600'}
                    `}>
                      {day.date()}
                    </div>
                    <div className="space-y-0.5">
                      {dayEvents.slice(0, 3).map(evt => {
                        const cfg = typeConfig[evt.type] || typeConfig.EVENT
                        return (
                          <div key={evt.id}
                            onClick={(e) => { e.stopPropagation(); evt.relatedTaskId && navigate(`/tasks/${evt.relatedTaskId}`) }}
                            className={`flex items-center gap-1 px-1 py-0.5 rounded text-[11px] leading-tight cursor-pointer ${cfg.bg} hover:opacity-80`}
                            title={evt.title}
                          >
                            <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${cfg.dot}`} />
                            <span className="truncate text-slate-700">{evt.title}</span>
                          </div>
                        )
                      })}
                      {dayEvents.length > 3 && (
                        <div className="text-[10px] text-blue-500 pl-1 font-medium">+{dayEvents.length - 3}</div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </Card>

          <div className="mt-4 grid grid-cols-1 lg:grid-cols-3 gap-4">
            <Card className="border-slate-100"><CardContent className="p-3">
              <p className="text-xs font-medium text-slate-500 mb-2">图例</p>
              <div className="flex flex-wrap gap-x-4 gap-y-1.5">
                {Object.entries(typeConfig).map(([key, cfg]) => (
                  <div key={key} className="flex items-center gap-1.5 text-xs text-slate-600">
                    <span className={`w-2 h-2 rounded-full ${cfg.dot}`} />{cfg.label}
                  </div>
                ))}
              </div>
              <p className="text-xs text-slate-400 mt-2">点击日期查看详情</p>
            </CardContent></Card>
            <Card className="border-slate-100 lg:col-span-2"><CardContent className="p-3">
              <p className="text-xs font-medium text-slate-500 mb-2">
                {selectedDay === today.format('YYYY-MM-DD') ? '📌 今天' : selectedDay}
                {selectedEvents.length > 0 ? ` · ${selectedEvents.length} 项` : ''}
              </p>
              {selectedEvents.length > 0 ? (
                <div className="space-y-1 max-h-[200px] overflow-y-auto">
                  {selectedEvents.map(evt => {
                    const cfg = typeConfig[evt.type] || typeConfig.EVENT
                    return (
                      <div key={evt.id}
                        onClick={() => evt.relatedTaskId && navigate(`/tasks/${evt.relatedTaskId}`)}
                        className={`flex items-center gap-2 p-2 rounded-lg text-sm ${cfg.bg} ${evt.relatedTaskId ? 'cursor-pointer hover:opacity-80' : ''}`}
                      >
                        <span className={`w-2 h-2 rounded-full flex-shrink-0 ${cfg.dot}`} />
                        <span className="text-xs text-slate-500 flex-shrink-0 w-10">
                          {dayjs(evt.time).isValid() ? dayjs(evt.time).format('HH:mm') : ''}
                        </span>
                        <span className="text-sm text-slate-800 truncate flex-1">{evt.title}</span>
                        {evt.description && (
                          <span className="text-[11px] text-slate-400 truncate max-w-[120px] hidden sm:block">{evt.description}</span>
                        )}
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full text-slate-500 bg-slate-100 flex-shrink-0">{cfg.label}</span>
                      </div>
                    )
                  })}
                </div>
              ) : <p className="text-xs text-slate-400">这天没有安排</p>}
            </CardContent></Card>
          </div>
        </>
      )}
    </div>
  )
}
