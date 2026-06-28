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
  User, LogOut, Settings, LayoutDashboard, X,
} from 'lucide-react'

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

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const host = window.location.host
    let ws: WebSocket | null = null
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null
    let closedByEffect = false
    let retry = 0

    const connect = () => {
      ws = new WebSocket(`${protocol}//${host}/ws/notifications?token=${encodeURIComponent(token)}`)

      ws.onopen = () => { retry = 0 }
      ws.onmessage = (event) => {
        try {
          const notif = JSON.parse(event.data)
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
    <div className="min-h-screen bg-slate-50 font-sans">
      {/* Desktop Header */}
      <header className="hidden md:flex items-center justify-between h-14 px-6 bg-white border-b border-slate-100 sticky top-0 z-50">
        <div className="flex items-center gap-8">
          {/* Logo */}
          <button
            onClick={() => navigate('/')}
            className="text-lg font-bold text-blue-700 tracking-tight hover:text-blue-800 transition-colors"
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
                      ? 'bg-blue-50 text-blue-700'
                      : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
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
          {/* Notification bell */}
          <button
            onClick={() => navigate('/notifications')}
            className="relative p-2 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition-all"
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
              <button className="flex items-center gap-2 p-1 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer">
                <Avatar className="h-8 w-8">
                  <AvatarFallback className={isAdmin
                    ? 'bg-gradient-to-br from-blue-500 to-blue-700 text-white text-xs'
                    : 'bg-gradient-to-br from-blue-400 to-blue-600 text-white text-xs'
                  }>
                    {firstLetter}
                  </AvatarFallback>
                </Avatar>
                <span className="text-sm font-medium text-slate-700 hidden sm:block">
                  {user?.nickname || user?.username}
                </span>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>
                <div className="flex flex-col">
                  <span className="font-semibold text-sm">{user?.nickname || user?.username}</span>
                  <span className="text-xs text-slate-400 font-normal">
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
      <div className="md:hidden flex items-center justify-between h-12 px-4 bg-white border-b border-slate-100 sticky top-0 z-50">
        <span className="text-lg font-bold text-blue-700">PlanFlowAI</span>
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate('/notifications')}
            className="relative p-2 rounded-lg text-slate-400 hover:text-slate-600 transition-all"
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
            className="p-2 rounded-lg text-slate-400 hover:text-slate-600 transition-all"
          >
            <User className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Main Content */}
      <main className="px-4 pb-24 md:pb-8 max-w-6xl mx-auto w-full min-h-[calc(100vh-56px)]">
        <Outlet />
      </main>

      {toast && (
        <div className="fixed right-4 top-16 z-[80] w-[min(360px,calc(100vw-32px))] rounded-lg border border-slate-200 bg-white p-4 shadow-lg">
          <div className="flex items-start gap-3">
            <Bell className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <button
              className="flex-1 text-left"
              onClick={() => {
                const taskId = toast.taskId
                setToast(null)
                if (taskId) navigate(`/tasks/${taskId}`)
                else navigate('/notifications')
              }}
            >
              <p className="text-sm font-semibold text-slate-900">{toast.title}</p>
              {toast.content && <p className="text-xs text-slate-500 mt-1 line-clamp-2">{toast.content}</p>}
            </button>
            <button className="text-slate-400 hover:text-slate-600" onClick={() => setToast(null)}>
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Mobile Bottom Nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-100 flex justify-around items-center h-14 z-50 pb-safe">
        {navItems.map(item => {
          const active = isActive(item.key)
          const Icon = item.icon
          return (
            <button
              key={item.key}
              onClick={() => navigate(item.key)}
              className={`flex flex-col items-center justify-center gap-0.5 px-3 py-1.5 min-w-[48px] min-h-[48px] transition-colors ${
                active ? 'text-blue-600' : 'text-slate-400'
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
