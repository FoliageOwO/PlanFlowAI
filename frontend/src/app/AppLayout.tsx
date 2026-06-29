import React from 'react'
import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '../stores/authStore'
import { Button } from '../components/ui/button'
import { Badge } from '../components/ui/badge'
import { Avatar, AvatarFallback } from '../components/ui/avatar'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuLabel, DropdownMenuTrigger,
} from '../components/ui/dropdown-menu'
import {
  Home, ListTodo, FileText, Clock, Bell,
  User, LogOut, Settings, LayoutDashboard, X, Plus, Download,
} from 'lucide-react'
import { isAndroid } from '../services/platformService'

const APP_DOWNLOAD_URL = 'https://dl.planflowai.xyz/latest.apk'

const navItems = [
  { key: '/', icon: Home, label: '首页' },
  { key: '/tasks', icon: ListTodo, label: '任务' },
  { key: '/input', icon: FileText, label: '输入' },
  { key: '/timeline', icon: Clock, label: '日程' },
  { key: '/notifications', icon: Bell, label: '通知' },
]

export default function AppLayout() {
  const navigate = useNavigate()
  const location = useLocation()
  const { user, logout } = useAuthStore()
  const [unreadCount, setUnreadCount] = React.useState(0)
  const [toast, setToast] = React.useState<{ title: string; content?: string; taskId?: string | null } | null>(null)
  const isTaskDetailPage = /^\/tasks\/[^/]+$/.test(location.pathname)
  const showDownloadApp = !isAndroid()

  const loadUnread = React.useCallback(async () => {
    try {
      const { mockApi, isMockMode } = await import('../services/mockData')
      const http = (await import('../services/api')).default
      if (isMockMode()) {
        const res = await mockApi.getUnreadCount()
        setUnreadCount(res.data)
      } else {
        const res: any = await http.get('/notifications/unread-count')
        setUnreadCount(res?.data?.count || 0)
      }
    } catch { /* silent */ }
  }, [])

  React.useEffect(() => { loadUnread() }, [loadUnread])

  React.useEffect(() => {
    const handleNotificationChange = (event: Event) => {
      const delta = (event as CustomEvent<{ delta?: number }>).detail?.delta
      if (typeof delta === 'number') {
        setUnreadCount(prev => Math.max(0, prev + delta))
      } else {
        loadUnread()
      }
    }
    const handleFocus = () => loadUnread()
    const timer = window.setInterval(loadUnread, 30000)
    window.addEventListener('planflow:notifications-changed', handleNotificationChange)
    window.addEventListener('focus', handleFocus)
    return () => {
      window.clearInterval(timer)
      window.removeEventListener('planflow:notifications-changed', handleNotificationChange)
      window.removeEventListener('focus', handleFocus)
    }
  }, [loadUnread])

  // WebSocket 实时接收通知
  React.useEffect(() => {
    const token = localStorage.getItem('auth-token')
    if (!token) return

    const wsBase = import.meta.env.VITE_WS_BASE
      || `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}`
    let ws: WebSocket | null = null
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null
    let closedByEffect = false
    let retry = 0

    const connect = () => {
      ws = new WebSocket(`${wsBase}/ws/notifications?token=${encodeURIComponent(token)}`)

      ws.onopen = () => { retry = 0 }
      ws.onmessage = (event) => {
        try {
          const notif = JSON.parse(event.data)
          if (notif.channel === 'LOCAL_APP') {
            import('../services/localNotificationService')
              .then(({ notifyLocalReminderNow }) => notifyLocalReminderNow(notif))
              .catch((error) => console.error('[local-notification] websocket trigger failed', error))
            return
          }

          setUnreadCount(prev => prev + 1)

          if (window.location.pathname !== '/notifications') {
            setToast({
              title: notif.title || '新通知',
              content: notif.content,
              taskId: notif.taskId ? String(notif.taskId) : null,
            })
          }
        } catch { /* ignore parse errors */ }
      }

      ws.onclose = () => {
        if (closedByEffect) return
        const delay = Math.min(30000, 1000 * 2 ** retry)
        retry += 1
        reconnectTimer = setTimeout(connect, delay)
      }

      ws.onerror = () => {
        ws?.close()
      }
    }

    connect()

    return () => {
      closedByEffect = true
      if (reconnectTimer) clearTimeout(reconnectTimer)
      ws?.close()
    }
  }, [])

  React.useEffect(() => {
    if (!toast) return
    const timer = setTimeout(() => setToast(null), 5000)
    return () => clearTimeout(timer)
  }, [toast])

  const isActive = (path: string) =>
    path === '/' ? location.pathname === '/' : location.pathname.startsWith(path)

  const firstLetter = (user?.nickname || user?.username || '?')[0].toUpperCase()
  const isAdmin = user?.role === 'ADMIN'

  return (
    <div className="min-h-screen bg-zinc-50 font-sans">
      {/* Desktop Header */}
      <header className="hidden md:flex items-center justify-between h-14 px-6 bg-white/95 border-b border-zinc-200 sticky top-0 z-50 backdrop-blur">
        <div className="flex items-center gap-8">
          {/* Logo */}
          <button
            onClick={() => navigate('/')}
            className="text-lg font-semibold text-zinc-950 tracking-tight hover:text-zinc-700 transition-colors"
          >
            PlanFlowAI
          </button>

          {/* Desktop Nav */}
          <nav className="flex items-center gap-1">
            {navItems.map(item => {
              const active = isActive(item.key)
              const Icon = item.icon
              return (
                <button
                  key={item.key}
                  onClick={() => navigate(item.key)}
                  className={`
                    flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-150
                    ${active
                      ? 'bg-zinc-100 text-zinc-950'
                      : 'text-zinc-500 hover:text-zinc-900 hover:bg-zinc-50'
                    }
                  `}
                >
                  <Icon className="w-4 h-4" />
                  {item.label}
                </button>
              )
            })}
          </nav>
        </div>

        {/* Right side */}
        <div className="flex items-center gap-3">
          {showDownloadApp && (
            <a
              href={APP_DOWNLOAD_URL}
              className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-sm font-medium text-zinc-700 transition-colors hover:border-zinc-300 hover:bg-zinc-50 hover:text-zinc-950"
            >
              <Download className="h-4 w-4" />
              下载 App
            </a>
          )}

          {/* Notification bell */}
          <button
            onClick={() => navigate('/notifications')}
            className="relative p-2 rounded-md text-zinc-400 hover:text-zinc-700 hover:bg-zinc-50 transition-all"
          >
            <Bell className="w-5 h-5" />
            {unreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[10px] font-semibold text-white bg-red-500 rounded-full">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </button>

          {/* User dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-2 p-1 rounded-md hover:bg-zinc-50 transition-colors cursor-pointer">
                <Avatar className="h-8 w-8">
                  <AvatarFallback className={isAdmin
                    ? 'bg-zinc-950 text-white text-xs'
                    : 'bg-pine-700 text-white text-xs'
                  }>
                    {firstLetter}
                  </AvatarFallback>
                </Avatar>
                <span className="text-sm font-medium text-zinc-700 hidden sm:block">
                  {user?.nickname || user?.username}
                </span>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>
                <div className="flex flex-col">
                  <span className="font-semibold text-sm">{user?.nickname || user?.username}</span>
                  <span className="text-xs text-zinc-400 font-normal">
                    {isAdmin ? '管理员' : '用户'}
                  </span>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              {isAdmin && (
                <DropdownMenuItem onClick={() => navigate('/admin')}>
                  <LayoutDashboard className="w-4 h-4 mr-2" />
                  管理后台
                </DropdownMenuItem>
              )}
              <DropdownMenuItem onClick={() => navigate('/settings')}>
                <Settings className="w-4 h-4 mr-2" />
                设置
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => { logout(); navigate('/login') }}
                className="text-red-600 focus:text-red-700 focus:bg-red-50"
              >
                <LogOut className="w-4 h-4 mr-2" />
                退出登录
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      {/* Mobile Top Bar */}
      <div className="md:hidden flex items-center justify-between h-12 px-4 bg-white/95 border-b border-zinc-200 sticky top-0 z-50 backdrop-blur">
        <span className="text-lg font-semibold text-zinc-950">PlanFlowAI</span>
        <div className="flex items-center gap-2">
          {showDownloadApp && (
            <a
              href={APP_DOWNLOAD_URL}
              aria-label="下载 App"
              className="p-2 rounded-md text-zinc-400 hover:text-zinc-700 transition-all"
            >
              <Download className="w-5 h-5" />
            </a>
          )}
          <button
            onClick={() => navigate('/notifications')}
            className="relative p-2 rounded-md text-zinc-400 hover:text-zinc-700 transition-all"
          >
            <Bell className="w-5 h-5" />
            {unreadCount > 0 && (
              <span className="absolute top-0 right-0 flex items-center justify-center min-w-[16px] h-[16px] px-1 text-[10px] font-semibold text-white bg-red-500 rounded-full">
                {unreadCount}
              </span>
            )}
          </button>
          <button
            onClick={() => navigate('/settings')}
            className="p-2 rounded-md text-zinc-400 hover:text-zinc-700 transition-all"
          >
            <User className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Main Content */}
      <main className={`px-4 ${isTaskDetailPage ? 'pb-0' : 'pb-24'} md:pb-8 max-w-6xl mx-auto w-full min-h-[calc(100vh-56px)]`}>
        <Outlet />
      </main>

      {toast && (
      <div className="fixed right-4 top-16 z-[80] w-[min(360px,calc(100vw-32px))] rounded-lg border border-zinc-200 bg-white p-4 shadow-lg">
          <div className="flex items-start gap-3">
            <Bell className="w-5 h-5 text-zinc-700 flex-shrink-0 mt-0.5" />
            <button
              className="flex-1 text-left"
              onClick={() => {
                const taskId = toast.taskId
                setToast(null)
                if (taskId) navigate(`/tasks/${taskId}`)
                else navigate('/notifications')
              }}
            >
              <p className="text-sm font-semibold text-zinc-950">{toast.title}</p>
              {toast.content && <p className="text-xs text-zinc-500 mt-1 line-clamp-2">{toast.content}</p>}
            </button>
            <button className="text-zinc-400 hover:text-zinc-600" onClick={() => setToast(null)}>
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Mobile Bottom Nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-zinc-200 flex justify-around items-center h-14 z-50 pb-safe">
        {navItems.map(item => {
          const active = isActive(item.key)
          const Icon = item.icon
          if (item.key === '/input') {
            return (
              <button
                key={item.key}
                onClick={() => navigate(item.key)}
                aria-label="输入"
                className="relative flex min-w-[48px] items-center justify-center"
              >
                <span className={`flex h-10 w-10 items-center justify-center rounded-full shadow-sm transition-all ${
                  active
                    ? 'bg-zinc-950 text-white shadow-zinc-950/15'
                    : 'bg-zinc-900 text-white shadow-zinc-900/10 active:scale-95'
                }`}>
                  <Plus className="h-5 w-5" strokeWidth={2.4} />
                </span>
              </button>
            )
          }
          return (
            <button
              key={item.key}
              onClick={() => navigate(item.key)}
              className={`flex flex-col items-center justify-center gap-0.5 px-3 py-1.5 min-w-[48px] min-h-[48px] transition-colors ${
                active ? 'text-zinc-950' : 'text-zinc-400'
              }`}
            >
              {item.key === '/notifications' ? (
                <div className="relative">
                  <Icon className="w-5 h-5" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-2 flex items-center justify-center min-w-[16px] h-[16px] px-1 text-[10px] font-semibold text-white bg-red-500 rounded-full">
                      {unreadCount}
                    </span>
                  )}
                </div>
              ) : (
                <Icon className="w-5 h-5" />
              )}
              <span className={`text-[10px] font-medium ${active ? 'font-semibold' : ''}`}>
                {item.label}
              </span>
            </button>
          )
        })}
      </nav>
    </div>
  )
}
