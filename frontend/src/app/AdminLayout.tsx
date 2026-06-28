import React from 'react'
import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '../stores/authStore'
import { Button } from '../components/ui/button'
import { Avatar, AvatarFallback } from '../components/ui/avatar'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from '../components/ui/dropdown-menu'
import {
  LayoutDashboard, Users, ArrowLeft, LogOut, BarChart3, Bell,
  Cpu,
} from 'lucide-react'

const adminNavItems = [
  { key: '/admin', icon: BarChart3, label: '系统状态' },
  { key: '/admin/users', icon: Users, label: '用户管理' },
  { key: '/admin/ai', icon: Cpu, label: 'AI 配置' },
  { key: '/admin/notifications', icon: Bell, label: '通知配置' },
]

export default function AdminLayout() {
  const navigate = useNavigate()
  const location = useLocation()
  const { user, logout } = useAuthStore()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const isActive = (path: string) =>
    path === '/admin' ? location.pathname === '/admin' : location.pathname.startsWith(path)

  const firstLetter = (user?.nickname || user?.username || '?')[0].toUpperCase()

  return (
    <div className="min-h-screen bg-slate-50 font-sans">
      {/* Desktop Header */}
      <header className="hidden md:flex items-center justify-between h-14 px-6 bg-slate-900 text-white sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <LayoutDashboard className="w-5 h-5 text-zinc-500" />
          <span className="text-base font-semibold">PlanFlowAI 管理后台</span>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/')}
            className="text-gray-300 hover:text-white hover:bg-slate-800"
          >
            <ArrowLeft className="w-4 h-4 mr-1" />
            返回用户端
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-2 p-1 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer">
                <Avatar className="h-7 w-7">
                  <AvatarFallback className="bg-zinc-700 text-white text-xs">
                    {firstLetter}
                  </AvatarFallback>
                </Avatar>
                <span className="text-sm text-gray-200 hidden sm:block">
                  {user?.nickname || user?.username}
                </span>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={() => navigate('/')}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                返回用户端
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout} className="text-red-600">
                <LogOut className="w-4 h-4 mr-2" />
                退出登录
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      {/* Mobile Top Bar */}
      <div className="md:hidden flex items-center justify-between h-12 px-4 bg-slate-900 text-white">
        <span className="font-semibold text-sm">管理后台</span>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => navigate('/')} className="text-gray-300 h-8">
            <ArrowLeft className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <div className="flex">
        {/* Desktop Sidebar */}
        <aside className="hidden md:block w-48 min-h-[calc(100vh-56px)] bg-white border-r border-slate-100 py-3">
          <nav className="flex flex-col gap-0.5 px-2">
            {adminNavItems.map(item => {
              const active = isActive(item.key)
              const Icon = item.icon
              return (
                <button
                  key={item.key}
                  onClick={() => navigate(item.key)}
                  className={`
                    flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-150 w-full text-left
                    ${active
                      ? 'bg-zinc-50 text-zinc-900'
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
        </aside>

        {/* Content */}
        <main className="flex-1 p-4 min-h-[calc(100vh-56px)]">
          <Outlet />
        </main>
      </div>

      {/* Mobile Bottom Nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-100 flex justify-around items-center h-14 z-50">
        {adminNavItems.map(item => {
          const active = isActive(item.key)
          const Icon = item.icon
          return (
            <button
              key={item.key}
              onClick={() => navigate(item.key)}
              className={`flex flex-col items-center gap-0.5 px-3 py-1.5 min-w-[48px] min-h-[48px] ${
                active ? 'text-zinc-700' : 'text-slate-400'
              }`}
            >
              <Icon className="w-5 h-5" />
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
