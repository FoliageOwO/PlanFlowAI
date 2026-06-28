import React from 'react'
import { Button } from '../../../components/ui/button'
import { Input } from '../../../components/ui/input'
import { Label } from '../../../components/ui/label'
import { Badge } from '../../../components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card'
import { Separator } from '../../../components/ui/separator'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../components/ui/select'
import { Skeleton } from '../../../components/ui/skeleton'
import http from '../../../services/api'
import { Cpu, KeyRound, Network } from 'lucide-react'

type AiConfig = {
  provider: string
  deepseekApiKey: string
  deepseekBaseUrl: string
  deepseekModel: string
  qwenApiKey: string
  qwenBaseUrl: string
  qwenModel: string
  openaiCompatibleApiKey: string
  openaiCompatibleBaseUrl: string
  openaiCompatibleModel: string
}

const defaultConfig: AiConfig = {
  provider: 'deepseek',
  deepseekApiKey: '',
  deepseekBaseUrl: 'https://api.deepseek.com/v1',
  deepseekModel: 'deepseek-v4-pro',
  qwenApiKey: '',
  qwenBaseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
  qwenModel: 'qwen3.7-plus',
  openaiCompatibleApiKey: '',
  openaiCompatibleBaseUrl: '',
  openaiCompatibleModel: '',
}

export default function AdminAiConfig() {
  const [config, setConfig] = React.useState<AiConfig>(defaultConfig)
  const [loading, setLoading] = React.useState(true)
  const [saving, setSaving] = React.useState(false)
  const [message, setMessage] = React.useState('')

  React.useEffect(() => {
    ;(async () => {
      try {
        const res: any = await http.get('/admin/ai-config')
        setConfig({ ...defaultConfig, ...(res?.data || {}) })
      } catch {
        setMessage('配置加载失败')
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  const update = (patch: Partial<AiConfig>) => {
    setConfig(prev => ({ ...prev, ...patch }))
  }

  const save = async () => {
    setSaving(true)
    try {
      const res: any = await http.patch('/admin/ai-config', config)
      setConfig({ ...defaultConfig, ...(res?.data || {}) })
      setMessage('AI 配置已保存')
    } catch {
      setMessage('保存失败')
    } finally {
      setSaving(false)
      setTimeout(() => setMessage(''), 2200)
    }
  }

  if (loading) {
    return <div className="space-y-4"><Skeleton className="h-8 w-48" /><Skeleton className="h-80 w-full" /></div>
  }

  const currentModel = config.provider === 'qwen'
    ? config.qwenModel
    : config.provider === 'openai-compatible'
      ? config.openaiCompatibleModel
      : config.deepseekModel

  return (
    <div className="animate-fade-in max-w-5xl">
      <div className="mb-5 flex items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-bold text-slate-900">AI 服务配置</h3>
          <p className="text-sm text-slate-400 mt-0.5">统一管理解析模型、接口地址和密钥</p>
        </div>
        <Badge variant="success" className="text-[10px]">{config.provider} / {currentModel || '未选择模型'}</Badge>
      </div>

      <Card className="border-slate-100 mb-4">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Cpu className="w-4 h-4 text-zinc-700" />当前服务商
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="space-y-1.5">
            <Label>Provider</Label>
            <Select value={config.provider} onValueChange={value => update({ provider: value })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="deepseek">DeepSeek</SelectItem>
                <SelectItem value="qwen">Qwen</SelectItem>
                <SelectItem value="openai-compatible">OpenAI-compatible</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="md:col-span-2 rounded-md bg-zinc-50 px-3 py-2">
            <p className="text-xs text-slate-400">当前解析任务会使用选中的服务商配置</p>
            <p className="text-sm font-medium text-slate-700 mt-1">{currentModel || '-'}</p>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <ProviderCard title="DeepSeek">
          <ConfigInput label="Base URL" icon={<Network className="w-3.5 h-3.5" />} value={config.deepseekBaseUrl} onChange={value => update({ deepseekBaseUrl: value })} />
          <ConfigInput label="模型" value={config.deepseekModel} onChange={value => update({ deepseekModel: value })} />
          <ConfigInput label="API Key" icon={<KeyRound className="w-3.5 h-3.5" />} type="password" value={config.deepseekApiKey} onChange={value => update({ deepseekApiKey: value })} />
        </ProviderCard>

        <ProviderCard title="Qwen">
          <ConfigInput label="Base URL" icon={<Network className="w-3.5 h-3.5" />} value={config.qwenBaseUrl} onChange={value => update({ qwenBaseUrl: value })} />
          <ConfigInput label="模型" value={config.qwenModel} onChange={value => update({ qwenModel: value })} />
          <ConfigInput label="API Key" icon={<KeyRound className="w-3.5 h-3.5" />} type="password" value={config.qwenApiKey} onChange={value => update({ qwenApiKey: value })} />
        </ProviderCard>

        <ProviderCard title="OpenAI-compatible">
          <ConfigInput label="Base URL" icon={<Network className="w-3.5 h-3.5" />} value={config.openaiCompatibleBaseUrl} onChange={value => update({ openaiCompatibleBaseUrl: value })} />
          <ConfigInput label="模型" value={config.openaiCompatibleModel} onChange={value => update({ openaiCompatibleModel: value })} />
          <ConfigInput label="API Key" icon={<KeyRound className="w-3.5 h-3.5" />} type="password" value={config.openaiCompatibleApiKey} onChange={value => update({ openaiCompatibleApiKey: value })} />
        </ProviderCard>
      </div>

      <div className="mt-4 flex items-center justify-end gap-3">
        {message && <span className="text-xs text-zinc-600">{message}</span>}
        <Button onClick={save} loading={saving}>保存配置</Button>
      </div>
    </div>
  )
}

function ProviderCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card className="border-slate-100">
      <CardHeader className="pb-2"><CardTitle className="text-sm">{title}</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        {children}
      </CardContent>
    </Card>
  )
}

function ConfigInput({ label, value, onChange, type = 'text', icon }: {
  label: string
  value: string
  onChange: (value: string) => void
  type?: string
  icon?: React.ReactNode
}) {
  return (
    <div className="space-y-1.5">
      <Label className="flex items-center gap-1.5">{icon}{label}</Label>
      <Input type={type} value={value} onChange={e => onChange(e.target.value)} />
      {label === 'API Key' && <Separator className="hidden" />}
    </div>
  )
}
