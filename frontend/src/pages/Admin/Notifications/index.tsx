import React from 'react'
import { Button } from '../../../components/ui/button'
import { Input } from '../../../components/ui/input'
import { Label } from '../../../components/ui/label'
import { Badge } from '../../../components/ui/badge'
import { Switch } from '../../../components/ui/switch'
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card'
import { Separator } from '../../../components/ui/separator'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../components/ui/select'
import { Skeleton } from '../../../components/ui/skeleton'
import http from '../../../services/api'
import { Mail, MessageSquare, Server, KeyRound } from 'lucide-react'

type NotificationConfig = {
  smtpEnabled: string
  smtpHost: string
  smtpPort: string
  smtpSecurity: string
  smtpUsername: string
  smtpPassword: string
  smtpFrom: string
  smsEnabled: string
  smsProvider: string
  smsAccessKeyId: string
  smsAccessKeySecret: string
  smsSignName: string
  smsTemplateCode: string
}

const defaultConfig: NotificationConfig = {
  smtpEnabled: 'false',
  smtpHost: '',
  smtpPort: '465',
  smtpSecurity: 'SSL',
  smtpUsername: '',
  smtpPassword: '',
  smtpFrom: '',
  smsEnabled: 'false',
  smsProvider: 'aliyun',
  smsAccessKeyId: '',
  smsAccessKeySecret: '',
  smsSignName: '',
  smsTemplateCode: '',
}

export default function AdminNotifications() {
  const [config, setConfig] = React.useState<NotificationConfig>(defaultConfig)
  const [loading, setLoading] = React.useState(true)
  const [saving, setSaving] = React.useState(false)
  const [message, setMessage] = React.useState('')

  React.useEffect(() => {
    ;(async () => {
      try {
        const res: any = await http.get('/admin/notification-config')
        setConfig({ ...defaultConfig, ...(res?.data || {}) })
      } catch {
        setMessage('配置加载失败')
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  const update = (patch: Partial<NotificationConfig>) => {
    setConfig(prev => ({ ...prev, ...patch }))
  }

  const save = async () => {
    setSaving(true)
    try {
      const res: any = await http.patch('/admin/notification-config', config)
      setConfig({ ...defaultConfig, ...(res?.data || {}) })
      setMessage('通知通道配置已保存')
    } catch {
      setMessage('保存失败')
    } finally {
      setSaving(false)
      setTimeout(() => setMessage(''), 2200)
    }
  }

  if (loading) {
    return <div className="space-y-4"><Skeleton className="h-8 w-48" /><Skeleton className="h-64 w-full" /></div>
  }

  const smtpOn = config.smtpEnabled === 'true'
  const smsOn = config.smsEnabled === 'true'

  return (
    <div className="animate-fade-in max-w-5xl">
      <div className="mb-5 flex items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-bold text-slate-900">通知通道配置</h3>
          <p className="text-sm text-slate-400 mt-0.5">统一管理邮件与短信服务参数</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={smtpOn ? 'success' : 'secondary'} className="text-[10px]">SMTP {smtpOn ? '启用' : '关闭'}</Badge>
          <Badge variant={smsOn ? 'success' : 'secondary'} className="text-[10px]">短信 {smsOn ? '启用' : '关闭'}</Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <Card className="border-slate-100">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Mail className="w-4 h-4 text-zinc-700" />邮件服务
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between rounded-md bg-zinc-50 px-3 py-2">
              <div>
                <p className="text-sm font-medium text-slate-700">启用 SMTP 通道</p>
                <p className="text-xs text-slate-400">任务提醒可使用邮件通道</p>
              </div>
              <Switch checked={smtpOn} onCheckedChange={checked => update({ smtpEnabled: checked ? 'true' : 'false' })} />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="md:col-span-2 space-y-1.5">
                <Label>SMTP 服务器</Label>
                <Input value={config.smtpHost} onChange={e => update({ smtpHost: e.target.value })} placeholder="smtp.example.com" />
              </div>
              <div className="space-y-1.5">
                <Label>端口</Label>
                <Input value={config.smtpPort} onChange={e => update({ smtpPort: e.target.value })} placeholder="465" />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>加密方式</Label>
                <Select value={config.smtpSecurity} onValueChange={value => update({ smtpSecurity: value })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="SSL">SSL</SelectItem>
                    <SelectItem value="TLS">TLS</SelectItem>
                    <SelectItem value="NONE">无</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>发件邮箱</Label>
                <Input value={config.smtpFrom} onChange={e => update({ smtpFrom: e.target.value })} placeholder="noreply@example.com" />
              </div>
            </div>
            <Separator />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="flex items-center gap-1.5"><Server className="w-3.5 h-3.5" />账号</Label>
                <Input value={config.smtpUsername} onChange={e => update({ smtpUsername: e.target.value })} placeholder="SMTP 用户名" />
              </div>
              <div className="space-y-1.5">
                <Label className="flex items-center gap-1.5"><KeyRound className="w-3.5 h-3.5" />授权码</Label>
                <Input type="password" value={config.smtpPassword} onChange={e => update({ smtpPassword: e.target.value })} placeholder="SMTP 授权码" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-100">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-zinc-700" />短信服务
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between rounded-md bg-zinc-50 px-3 py-2">
              <div>
                <p className="text-sm font-medium text-slate-700">启用短信通道</p>
                <p className="text-xs text-slate-400">重要提醒可使用短信通道</p>
              </div>
              <Switch checked={smsOn} onCheckedChange={checked => update({ smsEnabled: checked ? 'true' : 'false' })} />
            </div>
            <div className="space-y-1.5">
              <Label>服务商</Label>
              <Select value={config.smsProvider} onValueChange={value => update({ smsProvider: value })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="aliyun">阿里云短信</SelectItem>
                  <SelectItem value="tencent">腾讯云短信</SelectItem>
                  <SelectItem value="huawei">华为云短信</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>AccessKey ID</Label>
                <Input value={config.smsAccessKeyId} onChange={e => update({ smsAccessKeyId: e.target.value })} placeholder="AccessKey ID" />
              </div>
              <div className="space-y-1.5">
                <Label>AccessKey Secret</Label>
                <Input type="password" value={config.smsAccessKeySecret} onChange={e => update({ smsAccessKeySecret: e.target.value })} placeholder="AccessKey Secret" />
              </div>
            </div>
            <Separator />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>短信签名</Label>
                <Input value={config.smsSignName} onChange={e => update({ smsSignName: e.target.value })} placeholder="PlanFlowAI" />
              </div>
              <div className="space-y-1.5">
                <Label>模板 Code</Label>
                <Input value={config.smsTemplateCode} onChange={e => update({ smsTemplateCode: e.target.value })} placeholder="SMS_000000000" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="mt-4 flex items-center justify-end gap-3">
        {message && <span className="text-xs text-zinc-600">{message}</span>}
        <Button onClick={save} loading={saving}>保存配置</Button>
      </div>
    </div>
  )
}
