import React from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import dayjs from 'dayjs'
import { Button } from '../../components/ui/button'
import { Badge } from '../../components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card'
import { Skeleton } from '../../components/ui/skeleton'
import EmptyState from '../../components/common/EmptyState'
import http from '../../services/api'
import {
  AlertTriangle, ArrowLeft, Calendar, CheckCircle2, Clock, FileText,
  Lightbulb, ListTodo, MapPin, Route, ShieldAlert,
} from 'lucide-react'

type GeneratedTask = {
  id: number | string
  title: string
  description?: string
  status?: string
  priority?: string
  deadline?: string
}

type GeneratedEvent = {
  id: number | string
  title: string
  description?: string
  startTime?: string
  endTime?: string
  location?: string
}

type ResultData = {
  jobId: number | string
  sourceInputId?: number | string
  summary?: string
  modelName?: string
  createdAt?: string
  analysis?: any
  tasks: GeneratedTask[]
  events: GeneratedEvent[]
}

function asArray<T = any>(value: unknown): T[] {
  return Array.isArray(value) ? value as T[] : []
}

export default function JobResultPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [data, setData] = React.useState<ResultData | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState('')

  React.useEffect(() => {
    ;(async () => {
      setLoading(true)
      try {
        const res: any = await http.get(`/jobs/${id}/result`)
        setData(res.data)
        setError('')
      } catch (err: any) {
        setError(err?.response?.data?.message || '无法加载解析结果')
      } finally {
        setLoading(false)
      }
    })()
  }, [id])

  if (loading) {
    return (
      <div className="py-4 max-w-5xl mx-auto space-y-4">
        <Skeleton className="h-9 w-36" />
        <Skeleton className="h-32 w-full" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Skeleton className="h-56 w-full" />
          <Skeleton className="h-56 w-full" />
        </div>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="py-4 max-w-3xl mx-auto">
        <Button variant="ghost" onClick={() => navigate(`/jobs/${id}`)} className="mb-4">
          <ArrowLeft className="w-4 h-4 mr-1" /> 返回解析进度
        </Button>
        <Card className="border-slate-100">
          <CardContent className="py-12">
            <EmptyState description={error || '解析结果不存在'} />
          </CardContent>
        </Card>
      </div>
    )
  }

  const risks = asArray(data.analysis?.risks)
  const conflicts = asArray(data.analysis?.conflicts)
  const suggestions = asArray(data.analysis?.planningSuggestions)

  return (
    <div className="py-4 max-w-5xl mx-auto animate-fade-in">
      <Button variant="ghost" onClick={() => navigate(`/jobs/${id}`)} className="mb-4">
        <ArrowLeft className="w-4 h-4 mr-1" /> 返回解析进度
      </Button>

      <div className="flex items-start justify-between gap-4 mb-4 flex-wrap">
        <div>
          <h2 className="text-xl font-bold text-slate-900">解析结果</h2>
          <p className="text-sm text-slate-500 mt-1">
            生成了 {data.tasks.length} 个任务 / {data.events.length} 个事件
            {data.modelName ? ` · ${data.modelName}` : ''}
          </p>
        </div>
        {data.sourceInputId && (
          <Button variant="outline" onClick={() => navigate(`/inputs/${data.sourceInputId}`)}>
            <FileText className="w-4 h-4 mr-1.5" /> 查看输入源
          </Button>
        )}
      </div>

      <Card className="border-slate-100 mb-4">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />AI 摘要
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">{data.summary || data.analysis?.summary || '暂无摘要'}</p>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        <Card className="border-slate-100">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2"><ListTodo className="w-4 h-4 text-zinc-700" />任务</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {data.tasks.length > 0 ? data.tasks.map(task => (
              <button key={task.id} onClick={() => navigate(`/tasks/${task.id}`)} className="w-full text-left p-3 rounded-lg border border-slate-100 hover:border-zinc-300 hover:bg-zinc-50/40 transition-colors">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-medium text-slate-900">{task.title}</span>
                  {task.priority && <Badge variant="secondary" className="text-[10px]">{task.priority}</Badge>}
                  {task.status && <Badge variant="outline" className="text-[10px]">{task.status}</Badge>}
                </div>
                {task.deadline && <p className="text-xs text-slate-500 mt-1"><Clock className="w-3 h-3 inline mr-1" />{dayjs(task.deadline).format('YYYY-MM-DD HH:mm')}</p>}
              </button>
            )) : <EmptyState description="未生成任务" />}
          </CardContent>
        </Card>

        <Card className="border-slate-100">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2"><Calendar className="w-4 h-4 text-emerald-600" />事件</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {data.events.length > 0 ? data.events.map(event => (
              <button key={event.id} onClick={() => navigate('/timeline')} className="w-full text-left p-3 rounded-lg border border-slate-100 hover:border-emerald-200 hover:bg-emerald-50/40 transition-colors">
                <p className="text-sm font-medium text-slate-900">{event.title}</p>
                {event.startTime && <p className="text-xs text-slate-500 mt-1"><Clock className="w-3 h-3 inline mr-1" />{dayjs(event.startTime).format('YYYY-MM-DD HH:mm')}{event.endTime ? ` - ${dayjs(event.endTime).format('HH:mm')}` : ''}</p>}
                {event.location && <p className="text-xs text-slate-500 mt-1"><MapPin className="w-3 h-3 inline mr-1" />{event.location}</p>}
              </button>
            )) : <EmptyState description="未生成事件" />}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <ResultList title="风险" icon={<ShieldAlert className="w-4 h-4 text-red-500" />} items={risks} empty="未识别到风险" />
        <ResultList title="冲突" icon={<AlertTriangle className="w-4 h-4 text-orange-500" />} items={conflicts} empty="未识别到冲突" />
        <ResultList title="规划建议" icon={<Lightbulb className="w-4 h-4 text-zinc-700" />} items={suggestions} empty="暂无规划建议" />
      </div>
    </div>
  )
}

function ResultList({ title, icon, items, empty }: { title: string; icon: React.ReactNode; items: any[]; empty: string }) {
  return (
    <Card className="border-slate-100">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">{icon}{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {items.length > 0 ? items.map((item, idx) => (
          <div key={idx} className="rounded-lg bg-slate-50 p-3">
            <p className="text-sm font-medium text-slate-800 flex items-center gap-1.5">
              <Route className="w-3.5 h-3.5 text-slate-400" />{item.title || title}
            </p>
            {item.description && <p className="text-xs text-slate-500 mt-1 leading-relaxed">{item.description}</p>}
            {Array.isArray(item.relatedItems) && item.relatedItems.length > 0 && (
              <p className="text-xs text-slate-400 mt-1">相关：{item.relatedItems.join('、')}</p>
            )}
          </div>
        )) : <EmptyState description={empty} />}
      </CardContent>
    </Card>
  )
}
