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
import { User, Bell, Smartphone, LogOut, Shield, Cpu } from 'lucide-react'

type AiStatus = {
  provider: string
  model: string
  baseUrl: string
  apiKeyConfigured: boolean
  ready: boolean
}

export default function SettingsPage() {
  const navigate = useNavigate()
  const { user, logout } = useAuthStore()
  const [nickname, setNickname] = React.useState(user?.nickname || '')
  const [saving, setSaving] = React.useState(false)
  const [savingSettings, setSavingSettings] = React.useState(false)
  const [inAppNotify, setInAppNotify] = React.useState(true)
  const [localNotify, setLocalNotify] = React.useState(false)
  const [aiStatus, setAiStatus] = React.useState<AiStatus | null>(null)
  const [message, setMessage] = React.useState('')

  React.useEffect(() => {
    if (isMockMode()) return
    ;(async () => {
      try {
        const res: any = await http.get('/settings')
        const setting = res?.data
        if (!setting) return
        setInAppNotify(setting.enableInAppNotification !== 0)
        setLocalNotify(setting.enableLocalNotification === 1)
        const aiRes: any = await http.get('/settings/ai-status')
        setAiStatus(aiRes?.data || null)
      } catch {
        // Keep local defaults if settings cannot be loaded.
      }
    })()
  }, [])

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

  const updateNotificationSettings = async (next: { inAppNotify?: boolean; localNotify?: boolean }) => {
    const merged = {
      inAppNotify: next.inAppNotify ?? inAppNotify,
      localNotify: next.localNotify ?? localNotify,
    }
    setInAppNotify(merged.inAppNotify)
    setLocalNotify(merged.localNotify)
    if (isMockMode()) return

    setSavingSettings(true)
    try {
      await http.patch('/settings', {
        enableInAppNotification: merged.inAppNotify ? 1 : 0,
        enableLocalNotification: merged.localNotify ? 1 : 0,
      })
      setMessage('通知设置已保存')
    } catch {
      setMessage('通知设置保存失败')
    } finally {
      setSavingSettings(false)
      setTimeout(() => setMessage(''), 2000)
    }
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
                ? 'bg-zinc-950 text-white text-xl'
                : 'bg-pine-700 text-white text-xl'
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
          {message && <p className="text-xs text-zinc-700 mt-2">{message}</p>}
        </CardContent>
      </Card>

      {/* Notification Settings */}
      <Card className="border-slate-100 mb-4">
        <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Bell className="w-4 h-4 text-zinc-700" />通知设置</CardTitle></CardHeader>
        <CardContent className="space-y-1">
          <div className="flex items-center justify-between py-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-zinc-50 flex items-center justify-center"><Bell className="w-4 h-4 text-zinc-700" /></div>
              <div>
                <p className="text-sm font-medium text-slate-700">站内通知</p>
                <p className="text-xs text-slate-400">接收系统内的通知消息</p>
              </div>
            </div>
            <Switch checked={inAppNotify} onCheckedChange={(checked) => updateNotificationSettings({ inAppNotify: checked })} disabled={savingSettings} />
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
            <Switch checked={localNotify} onCheckedChange={(checked) => updateNotificationSettings({ localNotify: checked })} disabled={savingSettings} />
          </div>
        </CardContent>
      </Card>

      {/* AI Provider */}
      {aiStatus && (
        <Card className="border-slate-100 mb-4">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Cpu className="w-4 h-4 text-zinc-700" />AI 模型
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-slate-700">{aiStatus.provider}</p>
                <p className="text-xs text-slate-400">{aiStatus.model || '未配置模型'}</p>
              </div>
              <Badge variant={aiStatus.ready ? 'success' : 'destructive'} className="text-[10px]">
                {aiStatus.ready ? '可用' : '未配置'}
              </Badge>
            </div>
            <Separator />
            <div className="space-y-1">
              <div className="flex justify-between gap-3 text-xs">
                <span className="text-slate-400">Base URL</span>
                <span className="text-slate-600 text-right break-all">{aiStatus.baseUrl || '-'}</span>
              </div>
              <div className="flex justify-between gap-3 text-xs">
                <span className="text-slate-400">API Key</span>
                <span className={aiStatus.apiKeyConfigured ? 'text-emerald-600' : 'text-red-500'}>
                  {aiStatus.apiKeyConfigured ? '已配置' : '未配置'}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Account */}
      <Card className="border-slate-100">
        <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Shield className="w-4 h-4 text-zinc-700" />账号</CardTitle></CardHeader>
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
