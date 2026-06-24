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
  User, LogOut, Settings, LayoutDashboard,
} from 'lucide-react'

const navItems = [
  { key: '/', icon: Home, label: '首页' },
  { key: '/tasks', icon: ListTodo, label: '任务' },
  { key: '/input', icon: FileText, label: '输入' },
  { key: '/timeline', icon: Clock, label: '时间轴' },
  { key: '/notifications', icon: Bell, label: '通知' },
]

export default function AppLayout() {
  const navigate = useNavigate()
  const location = useLocation()
  const { user, logout } = useAuthStore()
  const [unreadCount, setUnreadCount] = React.useState(0)

  React.useEffect(() => {
    const loadUnread = async () => {
      try {
        const { mockApi, isMockMode } = await import('../services/mockData')
        if (isMockMode()) {
          const res = await mockApi.getUnreadCount()
          setUnreadCount(res.data)
        }
      } catch { /* silent */ }
    }
    loadUnread()
    const timer = setInterval(loadUnread, 15000)
    return () => clearInterval(timer)
  }, [])

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
