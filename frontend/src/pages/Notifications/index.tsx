import React from 'react'
import { useNavigate } from 'react-router-dom'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import 'dayjs/locale/zh-cn'
import { Button } from '../../components/ui/button'
import { Badge } from '../../components/ui/badge'
import { Card, CardContent } from '../../components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs'
import { Skeleton } from '../../components/ui/skeleton'
import EmptyState from '../../components/common/EmptyState'
import { mockApi, isMockMode } from '../../services/mockData'
import http from '../../services/api'
import type { NotificationItem } from '../../services/mockData'
import { Bell, Info, AlertTriangle, Share2, CheckCheck, ChevronRight } from 'lucide-react'

dayjs.extend(relativeTime)
dayjs.locale('zh-cn')

const typeConfig: Record<string, { icon: React.ReactNode; bg: string; label: string }> = {
  TASK_DEADLINE: { icon: <AlertTriangle className="w-4 h-4 text-red-500" />, bg: 'bg-red-50', label: '任务截止' },
  SYSTEM: { icon: <Info className="w-4 h-4 text-zinc-600" />, bg: 'bg-zinc-50', label: '系统通知' },
  REMINDER: { icon: <Bell className="w-4 h-4 text-orange-500" />, bg: 'bg-orange-50', label: '提醒' },
  SHARE: { icon: <Share2 className="w-4 h-4 text-emerald-500" />, bg: 'bg-emerald-50', label: '分享' },
}

function notifyUnreadCountChanged(delta?: number) {
  window.dispatchEvent(new CustomEvent('planflow:notifications-changed', { detail: { delta } }))
}

export default function NotificationsPage() {
  const navigate = useNavigate()
  const [notifications, setNotifications] = React.useState<NotificationItem[]>([])
  const [loading, setLoading] = React.useState(true)
  const [tab, setTab] = React.useState('unread')
  const [page, setPage] = React.useState(1)
  const [total, setTotal] = React.useState(0)
  const pageSize = 20

  const load = React.useCallback(async (p?: number) => {
    setLoading(true)
    try {
      const params = { page: p || page, size: pageSize, unreadOnly: tab === 'unread' }
      if (isMockMode()) { const res = await mockApi.getNotifications(params); setNotifications(res.data?.list || []); setTotal(res.data?.total || 0) }
      else {
        const res: any = await http.get('/notifications', { params })
        setNotifications((res?.data?.list || []).map((item: any) => ({
          ...item,
          read: item.read ?? item.readStatus === 'READ',
          relatedTaskId: item.relatedTaskId ?? item.taskId,
        })))
        setTotal(res?.data?.total || 0)
      }
    } catch { } finally { setLoading(false) }
  }, [tab, page])

  React.useEffect(() => { load() }, [load])

  const markAllRead = async () => {
    const previous = notifications
    const previousTotal = total
    setNotifications(prev => tab === 'unread' ? [] : prev.map(item => ({ ...item, read: true })))
    if (tab === 'unread') setTotal(0)
    notifyUnreadCountChanged()
    try {
      if (isMockMode()) await mockApi.markAllNotificationsRead()
      else await http.post('/notifications/read-all')
      load()
    } catch {
      setNotifications(previous)
      setTotal(previousTotal)
      notifyUnreadCountChanged()
    }
  }

  const markRead = async (item: NotificationItem) => {
    if (item.read) return
    const previous = notifications
    const previousTotal = total
    setNotifications(prev => tab === 'unread'
      ? prev.filter(notification => notification.id !== item.id)
      : prev.map(notification => notification.id === item.id ? { ...notification, read: true } : notification))
    if (tab === 'unread') setTotal(prev => Math.max(0, prev - 1))
    notifyUnreadCountChanged(-1)
    try {
      if (!isMockMode()) await http.patch(`/notifications/${item.id}/read`)
    } catch {
      setNotifications(previous)
      setTotal(previousTotal)
      notifyUnreadCountChanged()
    }
  }

  const renderItem = (item: NotificationItem) => {
    const cfg = typeConfig[item.type] || typeConfig.SYSTEM
    return (
      <div key={item.id}
        onClick={() => {
          if (!item.read) markRead(item)
          if (item.relatedTaskId) navigate(`/tasks/${item.relatedTaskId}`)
        }}
        className={`flex items-start gap-3 p-4 cursor-pointer transition-all duration-150 hover:bg-slate-50 rounded-lg border-l-4 ${
          item.read ? 'border-l-transparent bg-white' : `${cfg.bg} bg-opacity-50 border-l-current`
        }`}
      >
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${cfg.bg}`}>
          {cfg.icon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`text-sm font-medium ${item.read ? 'text-slate-500' : 'text-slate-900'}`}>{item.title}</span>
            {!item.read && <Badge variant="destructive" className="text-[10px] px-1 py-0 h-auto">未读</Badge>}
          </div>
          <p className={`text-xs mt-0.5 ${item.read ? 'text-slate-400' : 'text-slate-600'}`}>{item.content}</p>
          <p className="text-[10px] text-slate-400 mt-1">{dayjs(item.createdAt).fromNow()}</p>
        </div>
        {item.relatedTaskId && <ChevronRight className="w-4 h-4 text-gray-300 flex-shrink-0 mt-2" />}
      </div>
    )
  }

  return (
    <div className="py-4 animate-fade-in">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="text-xl font-bold text-slate-900">🔔 通知中心</h2>
          <p className="text-sm text-slate-400 mt-0.5">{tab === 'unread' ? `你有 ${total} 条未读通知` : `共 ${total} 条通知`}</p>
        </div>
        {tab === 'unread' && total > 0 && (
          <Button variant="outline" size="sm" onClick={markAllRead}><CheckCheck className="w-4 h-4 mr-1" /> 全部已读</Button>
        )}
      </div>

      <Card className="border-slate-100">
        <CardContent className="p-0">
          <Tabs value={tab} onValueChange={t => { setTab(t); setPage(1) }} className="w-full">
            <div className="px-4 pt-3">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="unread" className="flex items-center gap-2">
                  <Bell className="w-4 h-4" /> 未读 {total > 0 && <Badge variant="default" className="text-[10px] px-1 py-0 h-auto">{total}</Badge>}
                </TabsTrigger>
                <TabsTrigger value="all" className="flex items-center gap-2">
                  <Info className="w-4 h-4" /> 全部
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="unread" className="mt-2 px-0">
              {loading ? <div className="space-y-3 p-4"><Skeleton className="h-20 w-full" /><Skeleton className="h-20 w-full" /></div>
              : notifications.length > 0 ? (
                <div className="divide-y divide-slate-100">{notifications.map(renderItem)}</div>
              ) : (
                <div className="py-12"><EmptyState description="暂无未读通知" actionText="查看全部通知" onAction={() => setTab('all')} /></div>
              )}
            </TabsContent>

            <TabsContent value="all" className="mt-2 px-0">
              {loading ? <div className="space-y-3 p-4"><Skeleton className="h-20 w-full" /><Skeleton className="h-20 w-full" /></div>
              : notifications.length > 0 ? (
                <div className="divide-y divide-slate-100">{notifications.map(renderItem)}</div>
              ) : (
                <div className="py-12"><EmptyState description="暂无通知" /></div>
              )}
            </TabsContent>
          </Tabs>
          {total > pageSize && (
            <div className="flex justify-center gap-2 p-4">
              <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage(p => p - 1)}>上一页</Button>
              <span className="text-sm text-slate-400 self-center">第 {page} 页</span>
              <Button variant="outline" size="sm" disabled={page >= Math.ceil(total / pageSize)} onClick={() => setPage(p => p + 1)}>下一页</Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
