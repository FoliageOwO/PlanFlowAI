import React from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Button } from '../../components/ui/button'
import { Card, CardContent } from '../../components/ui/card'
import { Progress } from '../../components/ui/progress'
import { Spinner } from '../../components/ui/spinner'
import { Badge } from '../../components/ui/badge'
import { mockApi, isMockMode } from '../../services/mockData'
import http from '../../services/api'
import type { JobItem } from '../../services/mockData'
import { ArrowLeft, CheckCircle2, XCircle, Loader2, Sparkles, RefreshCw, AlertTriangle } from 'lucide-react'

const stageLabel: Record<string, string> = {
  PENDING: '等待处理', RUNNING: '处理中',
  UPLOADED: '已上传', TEXT_EXTRACTED: '文本提取', EXTRACTING: '文本提取', EXTRACTED: '文本提取完成',
  AI_PARSING: 'AI 解析中', AI_ANALYZING: 'AI 解析中', AI_COMPLETED: 'AI 解析完成',
  GENERATING_TASKS: '任务生成', FINALIZING: '收尾中',
  COMPLETED: '任务生成',
  已上传: '已上传', 文本提取: '文本提取', 'AI 解析中': 'AI 解析中', 任务生成: '任务生成',
}
const stages = [
  { key: 'UPLOADED', label: '已上传', desc: '文件已成功上传到服务器' },
  { key: 'EXTRACTING', label: '文本提取', desc: '正在提取文件中的文字内容' },
  { key: 'AI_ANALYZING', label: 'AI 解析中', desc: 'AI 正在分析文本并生成任务' },
  { key: 'GENERATING_TASKS', label: '任务生成', desc: '正在生成任务和检查清单' },
  { key: 'COMPLETED', label: '任务生成', desc: '任务已全部生成完毕' },
]
const stageIndex: Record<string, number> = {
  PENDING: 0, RUNNING: 0,
  UPLOADED: 0, EXTRACTING: 1, TEXT_EXTRACTED: 1, EXTRACTED: 1,
  AI_ANALYZING: 2, AI_PARSING: 2, AI_COMPLETED: 2,
  GENERATING_TASKS: 3, FINALIZING: 3,
  COMPLETED: 4,
  已上传: 0, 文本提取: 1, 'AI 解析中': 2, 任务生成: 3,
}

function getErrorHelp(message?: string | null) {
  const text = message || ''
  const lower = text.toLowerCase()
  if (lower.includes('apikey') || lower.includes('api key') || lower.includes('not configured') || text.includes('未配置')) {
    return {
      title: 'AI 配置不可用',
      detail: '当前 AI Provider 缺少 API Key、Base URL 或模型名。请检查 .env 中的 AI_PROVIDER 以及对应的 *_API_KEY / *_BASE_URL / *_MODEL 配置，然后重启后端。',
    }
  }
  if (lower.includes('ocr') || text.includes('文字识别')) {
    return {
      title: 'OCR 服务不可用',
      detail: '图片文字识别失败。请确认 ocr-service 容器或本地 OCR 服务已启动，OCR_SERVICE_URL 指向 /ocr/image，或改用文本输入。',
    }
  }
  if (lower.includes('json') || lower.includes('parse failed') || text.includes('解析失败')) {
    return {
      title: 'AI 返回格式不合法',
      detail: 'AI 返回内容没有通过结构化 JSON 校验，系统已尝试自动修复一次但仍失败。可以重试，或缩短/改写输入内容后重新提交。',
    }
  }
  if (text.includes('文件不存在') || lower.includes('file')) {
    return {
      title: '文件读取失败',
      detail: '后端无法读取上传文件。请重新上传文件，并确认 uploads 挂载目录可写。',
    }
  }
  return {
    title: '处理失败',
    detail: text || '处理过程中出现未知错误，请重试或返回输入页重新提交。',
  }
}

export default function JobProgressPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [job, setJob] = React.useState<JobItem | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)

  const fetchJob = React.useCallback(async () => {
    try {
      if (isMockMode()) {
        const res = await mockApi.getJob(id!)
        if (res.code !== 0) { setError(res.message); return }
        setJob(res.data)
      } else {
        const res: any = await http.get(`/jobs/${id}`)
        setJob(res.data)
      }
      setError(null)
    } catch (err: any) {
      setError(err?.response?.data?.message || '获取任务状态失败')
    } finally { setLoading(false) }
  }, [id])

  React.useEffect(() => {
    if (!id) return
    fetchJob()
    const timer = setInterval(() => {
      if (!job || job.status === 'COMPLETED' || job.status === 'FAILED') return
      fetchJob()
    }, 2000)
    return () => clearInterval(timer)
  }, [fetchJob, id, job?.status])

  const handleRetry = async () => {
    setLoading(true)
    setError(null)
    try {
      await http.post(`/jobs/${id}/retry`)
      fetchJob()
    } catch (err: any) {
      setError(err?.response?.data?.message || '重试失败')
    } finally { setLoading(false) }
  }

  if (loading) return (
    <div className="py-4 max-w-lg mx-auto">
      <Card className="border-slate-100"><CardContent className="py-16 text-center"><Spinner size={36} /><p className="text-sm text-slate-400 mt-3">加载中...</p></CardContent></Card>
    </div>
  )

  if (error || !job) return (
    <div className="py-4 max-w-lg mx-auto">
      <Button variant="ghost" onClick={() => navigate('/input')} className="mb-4"><ArrowLeft className="w-4 h-4 mr-1" /> 返回输入</Button>
      <Card className="border-slate-100"><CardContent className="py-12 text-center">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-50 flex items-center justify-center"><XCircle className="w-8 h-8 text-red-500" /></div>
        <h3 className="text-lg font-semibold text-slate-900">获取任务状态失败</h3>
        <p className="text-sm text-slate-500 mt-1 mb-4">{error || '未知错误'}</p>
        <Button onClick={() => { setLoading(true); setError(null); fetchJob() }}>重试</Button>
      </CardContent></Card>
    </div>
  )

  const isFailed = job.status === 'FAILED'
  const isCompleted = job.status === 'COMPLETED'
  const currentStageKey = isCompleted ? 'COMPLETED' : (job.stage || job.status)
  const currentIdx = stageIndex[currentStageKey] ?? stageIndex[job.status] ?? 0
  const errorHelp = isFailed ? getErrorHelp(job.errorMessage) : null

  return (
    <div className="py-4 max-w-lg mx-auto animate-fade-in">
      <Button variant="ghost" onClick={() => navigate('/input')} className="mb-4"><ArrowLeft className="w-4 h-4 mr-1" /> 返回输入</Button>

      {/* Header */}
      <div className="text-center mb-6">
        <div className={`w-14 h-14 mx-auto mb-3 rounded-lg flex items-center justify-center ${
          isFailed ? 'bg-red-600' :
          isCompleted ? 'bg-pine-700' :
          'bg-zinc-950'
        }`}>
          {isFailed ? <XCircle className="w-7 h-7 text-white" /> :
           isCompleted ? <CheckCircle2 className="w-7 h-7 text-white" /> :
           <Loader2 className="w-7 h-7 text-white animate-spin" />}
        </div>
        <h3 className="text-lg font-semibold text-zinc-950">{isFailed ? '解析失败' : isCompleted ? '解析完成' : '正在解析'}</h3>
        <p className="text-sm text-zinc-500 mt-1">
          {isFailed ? errorHelp?.title || '处理过程中出现错误' :
           isCompleted ? `解析完成，生成了 ${job.taskCount ?? 0} 个任务 / ${job.eventCount ?? 0} 个事件` :
           '请稍候，系统正在处理您的输入'}
        </p>
      </div>

      <Card>
        <CardContent className="p-6">
          <Progress value={job.progress} className="mb-8" />

          {/* Steps */}
          <div className="space-y-3">
            {stages.map((s, idx) => {
              const done = isCompleted || idx < currentIdx
              const current = idx === currentIdx && !isFailed && !isCompleted
              const failed = idx === currentIdx && isFailed
              return (
                <div key={s.key} className="flex items-start gap-3">
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${
                    done ? 'bg-zinc-100 text-zinc-700' :
                    current ? 'bg-zinc-950 text-white' :
                    failed ? 'bg-red-100 text-red-500' :
                    'bg-zinc-100 text-zinc-400'
                  }`}>
                    {done ? <CheckCircle2 className="w-4 h-4" /> :
                     current ? <Loader2 className="w-4 h-4 animate-spin" /> :
                     failed ? <XCircle className="w-4 h-4" /> :
                     <span className="text-xs font-semibold">{idx + 1}</span>}
                  </div>
                  <div>
                    <p className={`text-sm font-medium ${done ? 'text-zinc-700' : current ? 'text-zinc-950' : failed ? 'text-red-600' : 'text-zinc-400'}`}>{s.label}</p>
                    <p className="text-xs text-zinc-400">{s.desc}</p>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Actions */}
          <div className="mt-6 text-center space-y-3">
            {isFailed && (
              <>
                <div className="flex items-start gap-3 p-3 bg-amber-50 border border-amber-200 rounded-lg text-left mb-4">
                  <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                  <div className="text-xs text-amber-800">
                    <p className="font-medium mb-1">排查建议</p>
                    <p>{errorHelp?.detail}</p>
                    {job.errorMessage && <p className="mt-2 text-amber-700/80 break-words">原始错误：{job.errorMessage}</p>}
                  </div>
                </div>
                <div className="flex gap-2 justify-center">
                  <Button variant="outline" onClick={handleRetry}><RefreshCw className="w-4 h-4 mr-1.5" /> 重试</Button>
                  <Button onClick={() => navigate('/input')}><ArrowLeft className="w-4 h-4 mr-1.5" /> 返回输入</Button>
                </div>
              </>
            )}
            {isCompleted && (
              <>
                {job.resultPath || job.taskId ? (
                  <Button size="lg" onClick={() => navigate(job.resultPath || `/tasks/${job.taskId}`)}>
                    <CheckCircle2 className="w-4 h-4 mr-1.5" /> 查看生成结果
                  </Button>
                ) : (
                  <div className="space-y-3">
                    <div className="flex items-start gap-3 p-3 bg-amber-50 border border-amber-200 rounded-lg text-left">
                      <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                      <div className="text-xs text-amber-800">
                        <p className="font-medium mb-1">解析完成，但未生成任务</p>
                        <p>AI 分析后未从输入内容中识别出可执行的任务，请尝试提供更明确的待办信息。</p>
                      </div>
                    </div>
                    <Button variant="outline" onClick={() => navigate('/tasks')}>
                      <CheckCircle2 className="w-4 h-4 mr-1.5" /> 返回任务列表
                    </Button>
                  </div>
                )}
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {!isFailed && !isCompleted && (
        <Card className="mt-4 bg-zinc-50/70">
          <CardContent className="p-4 flex items-start gap-3">
            <Sparkles className="w-5 h-5 text-zinc-600 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-zinc-600">解析完成后，系统会自动生成任务、检查清单和提醒规则</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
