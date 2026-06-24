import React from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import 'dayjs/locale/zh-cn'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Textarea } from '../../components/ui/textarea'
import { Badge } from '../../components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../components/ui/dialog'
import { Label } from '../../components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select'
import { Checkbox } from '../../components/ui/checkbox'
import { Separator } from '../../components/ui/separator'
import { Skeleton } from '../../components/ui/skeleton'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '../../components/ui/alert-dialog'
import EmptyState from '../../components/common/EmptyState'
import { mockApi, isMockMode } from '../../services/mockData'
import http from '../../services/api'
import type { TaskItem, ChecklistItem } from '../../services/mockData'
import {
  ArrowLeft, Edit, Trash2, Plus, CheckCircle2, Clock, Bell, Calendar, Flag, Link2,
  Sparkles, Send, RotateCw, XCircle, FileText, Image, File, AlertTriangle,
} from 'lucide-react'

dayjs.extend(relativeTime)
dayjs.locale('zh-cn')

const priorityConfig: Record<string, { label: string; variant: 'destructive' | 'warning' | 'default' | 'secondary' }> = {
  URGENT: { label: '紧急', variant: 'destructive' },
  HIGH: { label: '高', variant: 'warning' },
  MEDIUM: { label: '中', variant: 'default' },
  LOW: { label: '低', variant: 'secondary' },
}
const statusConfig: Record<string, { label: string; variant: 'default' | 'success' | 'secondary' | 'destructive'; nextLabel: string }> = {
  TODO: { label: '待处理', variant: 'secondary', nextLabel: '开始处理' },
  DOING: { label: '进行中', variant: 'default', nextLabel: '标记完成' },
  DONE: { label: '已完成', variant: 'success', nextLabel: '已完成 ✓' },
  CANCELLED: { label: '已取消', variant: 'destructive', nextLabel: '重新打开' },
}
const nextStatus: Record<string, TaskItem['status']> = { TODO: 'DOING', DOING: 'DONE', DONE: 'DONE', CANCELLED: 'TODO' }
const channelLabel: Record<string, string> = { IN_APP: '站内通知', EMAIL: '邮件', SMS: '短信', WEIXIN: '微信', LOCAL_APP: '本地通知' }
const sourceIcons: Record<string, React.ReactNode> = { TEXT: <FileText className="w-4 h-4" />, IMAGE: <Image className="w-4 h-4" />, FILE: <File className="w-4 h-4" />, AUDIO: <File className="w-4 h-4" /> }

export default function TaskDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [task, setTask] = React.useState<TaskItem | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [checklist, setChecklist] = React.useState<ChecklistItem[]>([])
  const [newCheckItem, setNewCheckItem] = React.useState('')
  const [savingChecklist, setSavingChecklist] = React.useState(false)

  const fetchTask = React.useCallback(async () => {
    setLoading(true)
    try {
      if (isMockMode()) {
        const res = await mockApi.getTaskDetail(id!)
        if (res.code === 0 && res.data) { setTask(res.data); setChecklist(res.data.checklist || []) }
      } else {
        const res: any = await http.get(`/tasks/${id}`)
        setTask(res.data); setChecklist(res.data.checklist || [])
      }
    } catch { /* silent */ } finally { setLoading(false) }
  }, [id])

  React.useEffect(() => { fetchTask() }, [fetchTask])

  const saveChecklist = async (items: ChecklistItem[]) => {
    setSavingChecklist(true)
    try {
      if (isMockMode()) await mockApi.updateChecklist(id!, items)
      else {
        const backendItems = items.map(item => ({ content: item.text, checked: item.done ? 1 : 0 }))
        await http.put(`/tasks/${id}/checklist`, { items: backendItems })
      }
      setChecklist(items)
    } catch { } finally { setSavingChecklist(false) }
  }

  const toggleCheck = (item: ChecklistItem) => {
    saveChecklist(checklist.map(c => c.id === item.id ? { ...c, done: !c.done } : c))
  }

  const addCheckItem = () => {
    if (!newCheckItem.trim()) return
    saveChecklist([...checklist, { id: `cl-${Date.now()}`, text: newCheckItem.trim(), done: false }])
    setNewCheckItem('')
  }

  const handleChangeStatus = async (status: TaskItem['status']) => {
    try {
      if (isMockMode()) await mockApi.updateTask(id!, { status })
      else await http.patch(`/tasks/${id}/status`, { status })
      setTask(prev => prev ? { ...prev, status } : prev)

      // Cancel local notifications when task is marked as done or cancelled
      if (status === 'DONE' || status === 'CANCELLED') {
        try {
          const { cancelReminder } = await import('../../services/localNotificationService')
          const { isNative } = await import('../../services/platformService')
          if (isNative() && task?.reminders) {
            for (const reminder of task.reminders) {
              await cancelReminder(Number(reminder.id))
            }
          }
        } catch { /* non-critical */ }
      }
    } catch { }
  }

  const [editOpen, setEditOpen] = React.useState(false)
  const [editForm, setEditForm] = React.useState({ title: '', description: '', deadline: '', priority: 'MEDIUM', estimatedHours: 0 })
  const [savingEdit, setSavingEdit] = React.useState(false)

  const openEdit = () => {
    if (task) {
      setEditForm({ title: task.title, description: task.description, deadline: task.deadline ? dayjs(task.deadline).format('YYYY-MM-DDTHH:mm') : '', priority: task.priority, estimatedHours: task.estimatedHours || 0 })
      setEditOpen(true)
    }
  }

  const saveEdit = async () => {
    if (!task || !editForm.title.trim()) return
    setSavingEdit(true)
    try {
      const data = { ...editForm, deadline: editForm.deadline ? dayjs(editForm.deadline).format('YYYY-MM-DD HH:mm:ss') : task.deadline }
      if (isMockMode()) await mockApi.updateTask(id!, data as any)
      else await http.put(`/tasks/${id}`, data)
      setEditOpen(false); fetchTask()
    } catch { } finally { setSavingEdit(false) }
  }

  const handleDelete = async () => {
    try {
      if (isMockMode()) await mockApi.deleteTask(id!)
      else await http.delete(`/tasks/${id}`)
      navigate('/tasks')
    } catch { }
  }

  if (loading) return (
    <div className="py-4 max-w-4xl mx-auto space-y-3">
      <Skeleton className="h-8 w-32" /><Skeleton className="h-40 w-full" /><Skeleton className="h-60 w-full" />
    </div>
  )

  if (!task) return (
    <div className="py-4 max-w-4xl mx-auto">
      <Button variant="ghost" onClick={() => navigate('/tasks')} className="mb-4"><ArrowLeft className="w-4 h-4 mr-1" /> 返回列表</Button>
      <EmptyState description="任务不存在或已被删除" actionText="返回任务列表" actionPath="/tasks" />
    </div>
  )

  const isOverdue = dayjs(task.deadline).isBefore(dayjs()) && task.status !== 'DONE'
  const checkedCount = checklist.filter(c => c.done).length
  const priCfg = priorityConfig[task.priority]
  const stCfg = statusConfig[task.status]
  const ns = nextStatus[task.status]

  return (
    <div className="py-4 max-w-4xl mx-auto animate-fade-in">
      <Button variant="ghost" onClick={() => navigate('/tasks')} className="mb-4"><ArrowLeft className="w-4 h-4 mr-1" /> 返回列表</Button>

      {/* Header Card */}
      <Card className="mb-4 border-slate-100">
        <CardContent className="p-5">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-2">
                <h3 className="text-xl font-bold text-slate-900">{task.title}</h3>
                <Badge variant={stCfg.variant} className="text-xs">{stCfg.label}</Badge>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant={priCfg.variant} className="text-xs">{priCfg.label}优先级</Badge>
                {isOverdue && <Badge variant="destructive" className="text-xs"><AlertTriangle className="w-3 h-3 mr-0.5" />已过期</Badge>}
                <span className={`text-sm flex items-center gap-1 ${isOverdue ? 'text-red-500' : 'text-slate-500'}`}>
                  <Calendar className="w-3.5 h-3.5" />
                  {dayjs(task.deadline).format('YYYY-MM-DD HH:mm')}
                  {isOverdue && ` (已逾期 ${Math.abs(dayjs(task.deadline).diff(dayjs(), 'day'))} 天)`}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={openEdit}><Edit className="w-4 h-4 mr-1" /> 编辑</Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" size="sm" className="text-red-500 border-red-200 hover:bg-red-50"><Trash2 className="w-4 h-4 mr-1" /> 删除</Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader><AlertDialogTitle>确认删除</AlertDialogTitle>
                  <AlertDialogDescription>确定要删除这个任务吗？删除后不可恢复。</AlertDialogDescription></AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>取消</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDelete} className="bg-red-500 hover:bg-red-600">确认删除</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Left Column */}
        <div className="lg:col-span-2 space-y-4">
          {/* Description */}
          <Card className="border-slate-100">
            <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><FileText className="w-4 h-4 text-blue-600" />描述</CardTitle></CardHeader>
            <CardContent><p className="text-sm text-slate-600 leading-relaxed whitespace-pre-wrap">{task.description || '暂无描述'}</p></CardContent>
          </Card>

          {/* Checklist */}
          <Card className="border-slate-100">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <CheckCircle2 className={`w-4 h-4 ${checkedCount === checklist.length && checklist.length > 0 ? 'text-emerald-500' : 'text-slate-400'}`} />
                检查清单
                {checklist.length > 0 && <Badge variant={checkedCount === checklist.length ? 'success' : 'secondary'} className="text-[10px]">{checkedCount}/{checklist.length}</Badge>}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {checklist.length > 0 ? (
                <div className="space-y-1 mb-3">
                  {checklist.map(item => (
                    <div key={item.id} onClick={() => toggleCheck(item)} className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-50 cursor-pointer transition-colors">
                      <Checkbox checked={item.done} className="mt-0.5" />
                      <span className={`text-sm flex-1 transition-all ${item.done ? 'line-through text-slate-400' : 'text-slate-700'}`}>{item.text}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyState description="暂无检查项" />
              )}
              <div className="flex gap-2">
                <Input placeholder="添加检查项" value={newCheckItem} onChange={e => setNewCheckItem(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') addCheckItem() }}
                />
                <Button variant="outline" size="icon" onClick={addCheckItem} disabled={!newCheckItem.trim()} loading={savingChecklist}>
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Source Evidence */}
          {task.sourceEvidence && (
            <Card className="border-slate-100">
              <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Link2 className="w-4 h-4 text-blue-600" />来源原文证据</CardTitle></CardHeader>
              <CardContent>
                <div className="bg-slate-50 rounded-lg p-3 text-sm text-slate-600 leading-relaxed whitespace-pre-wrap">{task.sourceEvidence}</div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right Column */}
        <div className="space-y-4">
          {/* Basic Info */}
          <Card className="border-slate-100">
            <CardHeader className="pb-2"><CardTitle className="text-sm">基本信息</CardTitle></CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex justify-between"><span className="text-slate-500">优先级</span><Badge variant={priCfg.variant}>{priCfg.label}</Badge></div>
              <div className="flex justify-between"><span className="text-slate-500">状态</span><Badge variant={stCfg.variant}>{stCfg.label}</Badge></div>
              <div className="flex justify-between"><span className="text-slate-500">截止时间</span><span className={isOverdue ? 'text-red-500' : ''}>{dayjs(task.deadline).format('MM-DD HH:mm')}{isOverdue ? ' (已过期)' : ''}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">预估耗时</span><span>{task.estimatedHours} 小时</span></div>
              <div className="flex justify-between"><span className="text-slate-500">来源类型</span><span className="flex items-center gap-1">{sourceIcons[task.sourceType]}{task.sourceType}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">创建时间</span><span>{dayjs(task.createdAt).format('MM-DD HH:mm')}</span></div>
            </CardContent>
          </Card>

          {/* Constraints */}
          {task.constraints.length > 0 && (
            <Card className="border-slate-100">
              <CardHeader className="pb-2"><CardTitle className="text-sm">约束条件</CardTitle></CardHeader>
              <CardContent className="flex flex-wrap gap-1.5">
                {task.constraints.map((c, i) => <Badge key={i} variant="secondary" className="text-xs">{c}</Badge>)}
              </CardContent>
            </Card>
          )}

          {/* Reminders */}
          <Card className="border-slate-100">
            <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Bell className="w-4 h-4 text-orange-500" />提醒规则</CardTitle></CardHeader>
            <CardContent>
              {task.reminders.length > 0 ? (
                <div className="space-y-2">
                  {task.reminders.map(r => (
                    <div key={r.id} className="flex items-center gap-2 text-sm p-2 rounded-lg bg-orange-50">
                      <Bell className="w-4 h-4 text-orange-500 flex-shrink-0" />
                      <div>
                        <p className="text-xs font-medium">{dayjs(r.time).format('MM-DD HH:mm')}</p>
                        <Badge variant="secondary" className="text-[10px] px-1 h-auto">{channelLabel[r.channel] || r.channel}</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              ) : <EmptyState description="暂无提醒" />}
            </CardContent>
          </Card>

          {/* AI Suggestion */}
          {task.aiSuggestion && (
            <Card className="border-blue-100 bg-gradient-to-r from-blue-50 to-blue-50/50">
              <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Sparkles className="w-4 h-4 text-blue-600" />AI 建议</CardTitle></CardHeader>
              <CardContent><p className="text-xs text-blue-800 leading-relaxed">{task.aiSuggestion}</p></CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Sticky Action Bar */}
      <div className="sticky bottom-0 bg-white border-t border-slate-100 py-3 mt-4 -mx-4 px-4 rounded-t-xl shadow-lg z-30">
        <div className="flex justify-center gap-3 flex-wrap max-w-4xl mx-auto">
          {task.status !== 'CANCELLED' && (
            <Button size="lg" variant={task.status === 'TODO' ? 'gradient' : 'default'} disabled={task.status === 'DONE'}
              onClick={() => handleChangeStatus(ns)} className="min-w-[140px]">
              {task.status === 'TODO' && <Send className="w-4 h-4 mr-1.5" />}
              {task.status === 'DOING' && <CheckCircle2 className="w-4 h-4 mr-1.5" />}
              {task.status === 'DONE' && <CheckCircle2 className="w-4 h-4 mr-1.5" />}
              {stCfg.nextLabel}
            </Button>
          )}
          {task.status !== 'CANCELLED' && task.status !== 'DONE' && (
            <Button variant="outline" size="lg" onClick={() => handleChangeStatus('CANCELLED')}>取消任务</Button>
          )}
          {task.status === 'CANCELLED' && (
            <Button variant="gradient" size="lg" onClick={() => handleChangeStatus('TODO')}>重新打开</Button>
          )}
        </div>
      </div>

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>编辑任务</DialogTitle></DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="space-y-1.5"><Label>任务标题</Label><Input value={editForm.title} onChange={e => setEditForm(p => ({ ...p, title: e.target.value }))} /></div>
            <div className="space-y-1.5"><Label>描述</Label><Textarea rows={3} value={editForm.description} onChange={e => setEditForm(p => ({ ...p, description: e.target.value }))} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5"><Label>截止时间</Label><Input type="datetime-local" value={editForm.deadline} onChange={e => setEditForm(p => ({ ...p, deadline: e.target.value }))} /></div>
              <div className="space-y-1.5"><Label>优先级</Label>
                <Select value={editForm.priority} onValueChange={v => setEditForm(p => ({ ...p, priority: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="URGENT">🔥 紧急</SelectItem>
                    <SelectItem value="HIGH">⚡ 高</SelectItem>
                    <SelectItem value="MEDIUM">📌 中</SelectItem>
                    <SelectItem value="LOW">📎 低</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Button className="w-full" onClick={saveEdit} loading={savingEdit}>保存修改</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
