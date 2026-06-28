import React from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import dayjs from 'dayjs'
import { Button } from '../../components/ui/button'
import { Badge } from '../../components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card'
import { Textarea } from '../../components/ui/textarea'
import { Skeleton } from '../../components/ui/skeleton'
import EmptyState from '../../components/common/EmptyState'
import http from '../../services/api'
import { ArrowLeft, Bot, Calendar, FileText, ListTodo, RefreshCw, Route } from 'lucide-react'

type InputDetailData = {
  input: any
  aiResult?: any
  tasks: any[]
  events: any[]
  jobs: any[]
}

export default function InputDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [data, setData] = React.useState<InputDetailData | null>(null)
  const [rawText, setRawText] = React.useState('')
  const [loading, setLoading] = React.useState(true)
  const [saving, setSaving] = React.useState(false)
  const [error, setError] = React.useState('')

  React.useEffect(() => {
    ;(async () => {
      setLoading(true)
      try {
        const res: any = await http.get(`/inputs/${id}/detail`)
        setData(res.data)
        setRawText(res.data?.input?.rawText || res.data?.input?.originalText || '')
        setError('')
      } catch (err: any) {
        setError(err?.response?.data?.message || '无法加载输入源详情')
      } finally {
        setLoading(false)
      }
    })()
  }, [id])

  const reparse = async () => {
    if (!rawText.trim()) return
    setSaving(true)
    try {
      const res: any = await http.post(`/inputs/${id}/reparse`, { rawText })
      navigate(`/jobs/${res.data.jobId}`)
    } catch (err: any) {
      setError(err?.response?.data?.message || '重新解析失败')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="py-4 max-w-5xl mx-auto space-y-4">
        <Skeleton className="h-9 w-36" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="py-4 max-w-3xl mx-auto">
        <Button variant="ghost" onClick={() => navigate('/input')} className="mb-4">
          <ArrowLeft className="w-4 h-4 mr-1" /> 返回输入
        </Button>
        <Card className="border-slate-100"><CardContent className="py-12"><EmptyState description={error || '输入源不存在'} /></CardContent></Card>
      </div>
    )
  }

  const input = data.input
  const analysis = data.aiResult?.analysis

  return (
    <div className="py-4 max-w-5xl mx-auto animate-fade-in">
      <Button variant="ghost" onClick={() => navigate('/input')} className="mb-4">
        <ArrowLeft className="w-4 h-4 mr-1" /> 返回输入
      </Button>

      <div className="flex items-start justify-between gap-4 mb-4 flex-wrap">
        <div>
          <h2 className="text-xl font-bold text-slate-900">{input.title || '输入源详情'}</h2>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <Badge variant="secondary">{input.sourceType}</Badge>
            <Badge variant={input.status === 'COMPLETED' ? 'success' : input.status === 'FAILED' ? 'destructive' : 'outline'}>{input.status}</Badge>
            <span className="text-xs text-slate-400">{dayjs(input.createdAt).format('YYYY-MM-DD HH:mm')}</span>
          </div>
        </div>
        {data.jobs?.[0] && (
          <Button variant="outline" onClick={() => navigate(`/jobs/${data.jobs[0].id}/result`)}>
            <Bot className="w-4 h-4 mr-1.5" /> 查看最新结果页
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-4">
          <Card className="border-slate-100">
            <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><FileText className="w-4 h-4 text-blue-600" />原始内容</CardTitle></CardHeader>
            <CardContent>
              <div className="rounded-lg bg-slate-50 p-3 text-sm text-slate-700 whitespace-pre-wrap max-h-56 overflow-y-auto">
                {input.originalText || input.originalName || '暂无原始文本'}
              </div>
            </CardContent>
          </Card>

          <Card className="border-slate-100">
            <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><RefreshCw className="w-4 h-4 text-emerald-600" />OCR / 提取文本</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <Textarea rows={10} value={rawText} onChange={e => setRawText(e.target.value)} className="text-sm leading-relaxed" />
              <Button onClick={reparse} loading={saving} disabled={!rawText.trim()}>
                <RefreshCw className="w-4 h-4 mr-1.5" /> 保存文本并重新解析
              </Button>
            </CardContent>
          </Card>

          <Card className="border-slate-100">
            <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Bot className="w-4 h-4 text-blue-600" />AI 解析结果</CardTitle></CardHeader>
            <CardContent>
              {data.aiResult ? (
                <div className="space-y-3">
                  <p className="text-sm text-slate-700 whitespace-pre-wrap">{data.aiResult.summary || analysis?.summary || '暂无摘要'}</p>
                  <div className="flex flex-wrap gap-2">
                    {Array.isArray(analysis?.risks) && <Badge variant="secondary">风险 {analysis.risks.length}</Badge>}
                    {Array.isArray(analysis?.conflicts) && <Badge variant="secondary">冲突 {analysis.conflicts.length}</Badge>}
                    {Array.isArray(analysis?.planningSuggestions) && <Badge variant="secondary">建议 {analysis.planningSuggestions.length}</Badge>}
                  </div>
                </div>
              ) : <EmptyState description="暂无 AI 解析结果" />}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Card className="border-slate-100">
            <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><ListTodo className="w-4 h-4 text-blue-600" />生成任务</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {data.tasks.length > 0 ? data.tasks.map(task => (
                <button key={task.id} onClick={() => navigate(`/tasks/${task.id}`)} className="w-full text-left rounded-lg border border-slate-100 p-3 hover:bg-blue-50/40 hover:border-blue-200">
                  <p className="text-sm font-medium text-slate-900">{task.title}</p>
                  {task.deadline && <p className="text-xs text-slate-500 mt-1">{dayjs(task.deadline).format('MM-DD HH:mm')}</p>}
                </button>
              )) : <EmptyState description="暂无生成任务" />}
            </CardContent>
          </Card>

          <Card className="border-slate-100">
            <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Calendar className="w-4 h-4 text-emerald-600" />生成事件</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {data.events.length > 0 ? data.events.map(event => (
                <button key={event.id} onClick={() => navigate('/timeline')} className="w-full text-left rounded-lg border border-slate-100 p-3 hover:bg-emerald-50/40 hover:border-emerald-200">
                  <p className="text-sm font-medium text-slate-900 flex items-center gap-1"><Route className="w-3.5 h-3.5 text-slate-400" />{event.title}</p>
                  {event.startTime && <p className="text-xs text-slate-500 mt-1">{dayjs(event.startTime).format('MM-DD HH:mm')}</p>}
                </button>
              )) : <EmptyState description="暂无生成事件" />}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
