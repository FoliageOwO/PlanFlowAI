import React from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../../stores/authStore'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Label } from '../../components/ui/label'
import { Badge } from '../../components/ui/badge'
import { Switch } from '../../components/ui/switch'
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card'
import { Separator } from '../../components/ui/separator'
import { Avatar, AvatarFallback } from '../../components/ui/avatar'
import { mockApi, isMockMode } from '../../services/mockData'
import http from '../../services/api'
import { User, Bell, Smartphone, LogOut, Shield } from 'lucide-react'

export default function SettingsPage() {
  const navigate = useNavigate()
  const { user, logout } = useAuthStore()
  const [nickname, setNickname] = React.useState(user?.nickname || '')
  const [saving, setSaving] = React.useState(false)
  const [inAppNotify, setInAppNotify] = React.useState(true)
  const [localNotify, setLocalNotify] = React.useState(false)
  const [message, setMessage] = React.useState('')

  const handleSave = async () => {
    if (!nickname.trim()) return
    setSaving(true)
    try {
      if (isMockMode()) await mockApi.updateProfile({ nickname })
      else await http.put('/auth/user/profile', { nickname })
      setMessage('昵称修改成功')
    } catch {
      setMessage('修改失败')
    } finally {
      setSaving(false)
      setTimeout(() => setMessage(''), 2000)
    }
  }

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const firstLetter = (user?.nickname || user?.username || '?')[0].toUpperCase()
  const isAdmin = user?.role === 'ADMIN'

  return (
    <div className="py-4 max-w-lg mx-auto animate-fade-in">
      <h2 className="text-xl font-bold text-slate-900 mb-5">⚙️ 设置</h2>

      {/* User Profile */}
      <Card className="border-slate-100 mb-4">
        <CardContent className="p-5">
          <div className="flex items-center gap-4 mb-4">
            <Avatar className="h-14 w-14">
              <AvatarFallback className={isAdmin
                ? 'bg-gradient-to-br from-blue-500 to-blue-700 text-white text-xl'
                : 'bg-gradient-to-br from-blue-400 to-blue-600 text-white text-xl'
              }>{firstLetter}</AvatarFallback>
            </Avatar>
            <div>
              <h3 className="font-semibold text-slate-900">{user?.nickname || user?.username}</h3>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="text-sm text-slate-400">@{user?.username}</span>
                <Badge variant={isAdmin ? 'default' : 'success'} className="text-[10px] px-1.5 py-0 h-auto">
                  {isAdmin ? '管理员' : '用户'}
                </Badge>
              </div>
            </div>
          </div>

          <Separator className="mb-4" />

          <div className="space-y-1.5">
            <Label>昵称</Label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input className="pl-10" placeholder="输入昵称" value={nickname} onChange={e => setNickname(e.target.value)} />
              </div>
              <Button onClick={handleSave} loading={saving}>保存</Button>
            </div>
          </div>
          {message && <p className="text-xs text-blue-600 mt-2">{message}</p>}
        </CardContent>
      </Card>

      {/* Notification Settings */}
      <Card className="border-slate-100 mb-4">
        <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Bell className="w-4 h-4 text-blue-600" />通知设置</CardTitle></CardHeader>
        <CardContent className="space-y-1">
          <div className="flex items-center justify-between py-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center"><Bell className="w-4 h-4 text-blue-600" /></div>
              <div>
                <p className="text-sm font-medium text-slate-700">站内通知</p>
                <p className="text-xs text-slate-400">接收系统内的通知消息</p>
              </div>
            </div>
            <Switch checked={inAppNotify} onCheckedChange={setInAppNotify} />
          </div>
          <Separator />
          <div className="flex items-center justify-between py-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-orange-50 flex items-center justify-center"><Smartphone className="w-4 h-4 text-orange-500" /></div>
              <div>
                <p className="text-sm font-medium text-slate-700">本地通知</p>
                <p className="text-xs text-slate-400">接收浏览器推送通知（仅 Android App）</p>
              </div>
            </div>
            <Switch checked={localNotify} onCheckedChange={setLocalNotify} />
          </div>
        </CardContent>
      </Card>

      {/* Account */}
      <Card className="border-slate-100">
        <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Shield className="w-4 h-4 text-blue-600" />账号</CardTitle></CardHeader>
        <CardContent>
          <Button variant="destructive" size="lg" className="w-full" onClick={handleLogout}>
            <LogOut className="w-4 h-4 mr-2" /> 退出登录
          </Button>
          <p className="text-center text-xs text-slate-300 mt-3">PlanFlow AI v1.0</p>
        </CardContent>
      </Card>
    </div>
  )
}
