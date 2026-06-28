import React from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Button } from '../../components/ui/button'
import { Textarea } from '../../components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card'
import { Badge } from '../../components/ui/badge'
import { mockApi, isMockMode } from '../../services/mockData'
import http from '../../services/api'
import { Send, UploadCloud, File, Sparkles, Lightbulb } from 'lucide-react'

const examples = [
  '下周五前提交软件项目立项书，包括背景、需求、功能模块、技术路线，周三答辩',
  '帮我安排下周的团队周会，准备会议议程和周报，周三前发会议纪要',
  '机房明天下午2点到4点停电，请提前备份数据和关闭服务器',
]

function getRequestErrorMessage(err: any, fallback: string) {
  return err?.response?.data?.message || err?.message || fallback
}

function inferSourceType(file: File): string {
  const name = file.name.toLowerCase()
  if (file.type === 'application/pdf' || name.endsWith('.pdf')) return 'PDF'
  if (file.type.includes('wordprocessingml') || name.endsWith('.docx')) return 'DOCX'
  return 'IMAGE'
}

export default function InputPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [textValue, setTextValue] = React.useState(searchParams.get('content') || '')
  const [submitting, setSubmitting] = React.useState(false)
  const [dragOver, setDragOver] = React.useState(false)
  const [selectedFile, setSelectedFile] = React.useState<File | null>(null)
  const [error, setError] = React.useState('')
  const fileInputRef = React.useRef<HTMLInputElement>(null)

  const handleSubmit = async () => {
    const content = textValue.trim()
    if (!content && !selectedFile) { setError('请输入文本或选择文件'); return }
    setError('')
    setSubmitting(true)
    try {
      if (isMockMode()) {
        const res = await mockApi.createJob({ content, file: selectedFile || undefined })
        navigate(`/jobs/${res.data.jobId}`)
      } else if (selectedFile) {
        const formData = new FormData()
        formData.append('file', selectedFile)
        if (content) formData.append('content', content)
        formData.append('sourceType', inferSourceType(selectedFile))
        const res: any = await http.post('/inputs/upload', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        })
        navigate(`/jobs/${res.data.jobId}`)
      } else {
        const res: any = await http.post('/inputs/text', { content })
        navigate(`/jobs/${res.data.jobId}`)
      }
    } catch (err: any) {
      setError(getRequestErrorMessage(err, '提交失败，请重试'))
    } finally { setSubmitting(false) }
  }

  const validateFile = (file: File): boolean => {
    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
    if (!validTypes.includes(file.type)) { setError('不支持的文件格式，仅支持 jpg/png/webp/pdf/docx'); return false }
    if (file.size > 20 * 1024 * 1024) { setError('文件大小不能超过 20MB'); return false }
    return true
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file && validateFile(file)) {
      setSelectedFile(file)
      setError('')
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files?.[0]
    if (file && validateFile(file)) {
      setSelectedFile(file)
      setError('')
    }
  }

  return (
    <div className="py-4 max-w-3xl mx-auto animate-fade-in">
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-zinc-950">智能输入</h2>
        <p className="text-sm text-zinc-500 mt-1">
          输入一段文本或上传文件，AI 会自动识别目标、拆解任务、设置截止时间并生成检查清单
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <Card>
            <CardContent className="p-5">
              <div className="space-y-4">
                <Textarea
                  rows={8}
                  placeholder="输入任务描述、补充说明或对文件内容的修正。例如：图片里的时间以这段文字为准..."
                  value={textValue}
                  onChange={e => { setTextValue(e.target.value); setError('') }}
                  className="text-[15px] leading-relaxed"
                />
                <div
                  onDragOver={e => { e.preventDefault(); setDragOver(true) }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`border border-dashed rounded-lg p-6 text-center cursor-pointer transition-all duration-200 ${
                    dragOver ? 'border-zinc-900 bg-zinc-50' : 'border-zinc-300 hover:border-zinc-500 hover:bg-zinc-50'
                  }`}
                >
                  <input ref={fileInputRef} type="file" className="hidden" accept=".jpg,.jpeg,.png,.webp,.pdf,.docx"
                    onChange={handleFileSelect} />
                  <UploadCloud className="w-9 h-9 mx-auto mb-2 text-zinc-500" />
                  <p className="text-sm font-medium text-zinc-800">可选：上传图片、PDF 或 Word</p>
                  <p className="text-xs text-zinc-400 mt-1">文本和文件会一起解析，文本会作为补充说明优先参考</p>
                </div>
                {selectedFile && (
                  <div className="flex items-center gap-3 px-4 py-3 bg-zinc-50 rounded-md border border-zinc-200">
                    <File className="w-5 h-5 text-zinc-700" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-zinc-800 truncate">{selectedFile.name}</p>
                      <p className="text-xs text-zinc-400">{(selectedFile.size / 1024).toFixed(1)} KB</p>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => setSelectedFile(null)}>移除</Button>
                  </div>
                )}
                <div className="flex flex-wrap gap-1.5">
                  <span className="text-xs text-zinc-400 self-center mr-1">试试：</span>
                  {examples.map((ex, i) => (
                    <Badge key={i} variant="outline" className="max-w-full cursor-pointer hover:bg-zinc-100 hover:border-zinc-300 text-xs whitespace-normal break-words text-left leading-snug"
                      onClick={() => setTextValue(ex)}>
                      {ex}
                    </Badge>
                  ))}
                </div>
                {error && <p className="text-sm text-red-500 bg-red-50 rounded-lg px-3 py-2">{error}</p>}
                <Button size="lg" onClick={handleSubmit} loading={submitting} className="gap-2">
                  <Send className="w-4 h-4" /> 提交解析
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tips sidebar */}
        <div className="space-y-3">
          <Card className="bg-zinc-50/60">
            <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Sparkles className="w-4 h-4 text-zinc-700" />系统会整理什么</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {['从公告文本中提取任务和截止时间','解析图片/PDF中的通知文字','自动生成检查清单和提醒规则','识别时间冲突和潜在风险'].map((t,i) => (
                <p key={i} className="text-xs text-zinc-600 flex items-start gap-2">
                  <Lightbulb className="w-3.5 h-3.5 text-orange-400 flex-shrink-0 mt-0.5" />{t}
                </p>
              ))}
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">支持的文件格式</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              <div className="flex gap-1.5"><Badge variant="default" className="text-xs">JPG</Badge><Badge variant="default" className="text-xs">PNG</Badge><Badge variant="default" className="text-xs">WebP</Badge></div>
              <div className="flex gap-1.5"><Badge variant="success" className="text-xs">PDF</Badge><Badge variant="success" className="text-xs">DOCX</Badge></div>
              <p className="text-xs text-zinc-400">单文件最大 20MB</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
