import React from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import 'dayjs/locale/zh-cn'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Badge } from '../../components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../components/ui/dialog'
import { Label } from '../../components/ui/label'
import { Textarea } from '../../components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select'
import { Skeleton } from '../../components/ui/skeleton'
import EmptyState from '../../components/common/EmptyState'
import { mockApi, isMockMode } from '../../services/mockData'
import http from '../../services/api'
import type { TaskItem } from '../../services/mockData'
import { Plus, Search, Calendar, CheckCircle2, FileText, Image, File, Clock, ChevronRight } from 'lucide-react'

dayjs.extend(relativeTime)
dayjs.locale('zh-cn')

const priorityConfig: Record<string, { color: string; label: string; variant: 'destructive' | 'warning' | 'default' | 'secondary' }> = {
  URGENT: { color: 'red', label: '紧急', variant: 'destructive' },
  HIGH: { color: 'orange', label: '高', variant: 'warning' },
  MEDIUM: { color: 'blue', label: '中', variant: 'default' },
  LOW: { color: 'default', label: '低', variant: 'secondary' },
}
const statusConfig: Record<string, { label: string; variant: 'default' | 'success' | 'secondary' | 'destructive' }> = {
  TODO: { label: '待处理', variant: 'secondary' },
  DOING: { label: '进行中', variant: 'default' },
  DONE: { label: '已完成', variant: 'success' },
  CANCELLED: { label: '已取消', variant: 'destructive' },
}
const sourceIcon: Record<string, React.ReactNode> = {
  TEXT: <FileText className="w-4 h-4" />, IMAGE: <Image className="w-4 h-4" />, FILE: <File className="w-4 h-4" />, AUDIO: <File className="w-4 h-4" />,
}
const filterOptions = ['all', 'today', 'due', 'overdue', 'done'] as const
const filterLabels: Record<string, string> = { all: '全部', today: '今天', due: '即将截止', overdue: '已过期', done: '已完成' }

export default function TaskList() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [tasks, setTasks] = React.useState<TaskItem[]>([])
  const [loading, setLoading] = React.useState(true)
  const [filter, setFilter] = React.useState(searchParams.get('filter') || 'all')
  const [search, setSearch] = React.useState('')
  const [page, setPage] = React.useState(1)
  const [total, setTotal] = React.useState(0)
  const [modalOpen, setModalOpen] = React.useState(false)
  const [submitting, setSubmitting] = React.useState(false)
  const pageSize = 20
  const [newTask, setNewTask] = React.useState({ title: '', description: '', deadline: '', priority: 'MEDIUM', estimatedHours: 0 })

  const loadTasks = React.useCallback(async (p?: number) => {
    setLoading(true)
    try {
      const params: Record<string, any> = { page: p || page, pageSize }
      if (filter !== 'all') params.filter = filter
      if (search) params.search = search
      if (isMockMode()) {
        const res = await mockApi.getTaskList(params)
        setTasks(res.data.list); setTotal(res.data.total)
      } else {
        const res: any = await http.get('/tasks', { params })
        setTasks(res.data.list); setTotal(res.data.total)
      }
    } catch { /* silent */ } finally { setLoading(false) }
  }, [filter, search, page])

  React.useEffect(() => { loadTasks() }, [loadTasks])

  const handleCreate = async () => {
    if (!newTask.title.trim()) return
    setSubmitting(true)
    try {
      const data = { ...newTask, deadline: newTask.deadline || dayjs().add(1, 'day').format('YYYY-MM-DD HH:mm:ss') }
      if (isMockMode()) await mockApi.createTask(data as any)
      else await http.post('/tasks', data)
      setModalOpen(false)
      setNewTask({ title: '', description: '', deadline: '', priority: 'MEDIUM', estimatedHours: 0 })
      loadTasks()
    } catch { /* silent */ } finally { setSubmitting(false) }
  }

  const getDeadlineInfo = (task: TaskItem) => {
    if (task.status === 'DONE') return { text: '', type: '' }
    const d = dayjs(task.deadline), now = dayjs()
    if (d.isBefore(now)) return { text: `已逾期 ${Math.abs(d.diff(now, 'day'))} 天`, type: 'text-red-500' }
    if (d.isSame(now, 'day')) return { text: '今天截止', type: 'text-orange-500' }
    if (d.diff(now, 'day') <= 3) return { text: `${d.diff(now, 'day')} 天后截止`, type: 'text-orange-500' }
    return { text: d.format('MM-DD HH:mm'), type: 'text-slate-400' }
  }

  const stats = React.useMemo(() => ({
    total, overdue: tasks.filter(t => dayjs(t.deadline).isBefore(dayjs()) && t.status !== 'DONE').length,
    done: tasks.filter(t => t.status === 'DONE').length,
    inProgress: tasks.filter(t => t.status === 'DOING').length,
  }), [tasks, total])

  return (
    <div className="py-4 animate-fade-in">
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-xl font-bold text-slate-900">📋 任务列表</h2>
        <Button onClick={() => setModalOpen(true)}><Plus className="w-4 h-4 mr-1.5" /> 新建任务</Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-2 mb-4">
        {[{ label: '全部', value: stats.total, color: '' },
          { label: '进行中', value: stats.inProgress, color: 'text-blue-600' },
          { label: '已过期', value: stats.overdue, color: stats.overdue > 0 ? 'text-red-500' : '' },
          { label: '已完成', value: stats.done, color: 'text-emerald-600' }].map((s, i) => (
          <Card key={i} className="border-slate-100"><CardContent className="p-3 text-center">
            <p className="text-[11px] text-slate-500">{s.label}</p>
            <p className={`text-lg font-bold ${s.color || ''}`}>{s.value}</p>
          </CardContent></Card>
        ))}
      </div>

      {/* Filters */}
      <Card className="mb-4 border-slate-100"><CardContent className="p-3">
        <div className="flex flex-wrap gap-2 items-center">
          <div className="flex gap-1 flex-wrap">
            {filterOptions.map(f => (
              <Badge key={f} variant={filter === f ? 'default' : 'outline'}
                className="cursor-pointer text-xs" onClick={() => { setFilter(f); setPage(1) }}>
                {filterLabels[f]}
              </Badge>
            ))}
          </div>
          <div className="flex-1 min-w-[200px] ml-auto">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input placeholder="搜索任务标题..." value={search} onChange={e => { setSearch(e.target.value); setPage(1) }}
                className="pl-10 h-9 text-sm" />
            </div>
          </div>
        </div>
      </CardContent></Card>

      {/* Task List */}
      {loading ? (
        <div className="space-y-3"><Skeleton className="h-20 w-full" /><Skeleton className="h-20 w-full" /><Skeleton className="h-20 w-full" /></div>
      ) : tasks.length > 0 ? (
        <div className="space-y-2">
          {tasks.map(task => {
            const deadlineInfo = getDeadlineInfo(task)
            const priC = priorityConfig[task.priority]
            const stC = statusConfig[task.status]
            return (
              <div key={task.id} onClick={() => navigate(`/tasks/${task.id}`)}
                className="flex items-center gap-3 p-4 bg-white rounded-xl border border-slate-100 hover:border-blue-200 hover:shadow-sm cursor-pointer transition-all duration-150 hover:-translate-y-0.5">
                <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center flex-shrink-0 text-blue-600">
                  {sourceIcon[task.sourceType] || <FileText className="w-4 h-4" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-sm text-slate-900 truncate">{task.title}</span>
                    <Badge variant={priC.variant} className="text-[10px] px-1.5 py-0 h-auto">{priC.label}</Badge>
                    <Badge variant={stC.variant} className="text-[10px] px-1.5 py-0 h-auto">{stC.label}</Badge>
                  </div>
                  <div className="flex items-center gap-3 mt-1">
                    <span className={`text-xs flex items-center gap-1 ${deadlineInfo.type}`}>
                      <Clock className="w-3 h-3" />{deadlineInfo.text}
                    </span>
                    {task.checklist.length > 0 && (
                      <span className="text-xs text-slate-400 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" />{task.checklist.filter(c => c.done).length}/{task.checklist.length}
                      </span>
                    )}
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-gray-300 flex-shrink-0" />
              </div>
            )
          })}
          {total > pageSize && (
            <div className="flex justify-center gap-2 mt-4">
              <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage(p => p - 1)}>上一页</Button>
              <span className="text-sm text-slate-500 self-center">第 {page} 页 / 共 {Math.ceil(total / pageSize)} 页</span>
              <Button variant="outline" size="sm" disabled={page >= Math.ceil(total / pageSize)} onClick={() => setPage(p => p + 1)}>下一页</Button>
            </div>
          )}
        </div>
      ) : (
        <EmptyState description={filter === 'all' ? '暂无任务' : `没有${filterLabels[filter]}任务`} actionText="新建任务" onAction={() => setModalOpen(true)} />
      )}

      {/* FAB for mobile */}
      <Button size="icon" className="fixed bottom-20 right-4 w-14 h-14 rounded-full shadow-lg md:hidden z-50" onClick={() => setModalOpen(true)}>
        <Plus className="w-6 h-6" />
      </Button>

      {/* Create Dialog */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>新建任务</DialogTitle></DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="space-y-1.5">
              <Label>任务标题</Label>
              <Input placeholder="输入任务标题" value={newTask.title} onChange={e => setNewTask(p => ({ ...p, title: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>描述</Label>
              <Textarea rows={3} placeholder="输入任务描述（可选）" value={newTask.description} onChange={e => setNewTask(p => ({ ...p, description: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>截止时间</Label>
                <Input type="datetime-local" value={newTask.deadline} onChange={e => setNewTask(p => ({ ...p, deadline: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>优先级</Label>
                <Select value={newTask.priority} onValueChange={v => setNewTask(p => ({ ...p, priority: v }))}>
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
            <Button className="w-full" onClick={handleCreate} loading={submitting}>创建任务</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
