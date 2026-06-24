import React from 'react'
import { useNavigate } from 'react-router-dom'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import 'dayjs/locale/zh-cn'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Badge } from '../../components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card'
import { Skeleton } from '../../components/ui/skeleton'
import EmptyState from '../../components/common/EmptyState'
import { mockApi, isMockMode } from '../../services/mockData'
import http from '../../services/api'
import type { TaskItem } from '../../services/mockData'
import { Send, Upload, Clock, AlertTriangle, Plus, Calendar, Flame, CheckCircle2, Sparkles, ArrowRight, ChevronRight } from 'lucide-react'

dayjs.extend(relativeTime)
dayjs.locale('zh-cn')

const priorityLabel: Record<string, string> = { URGENT: '紧急', HIGH: '高', MEDIUM: '中', LOW: '低' }
const priorityClass: Record<string, string> = {
  URGENT: 'border-l-red-500 bg-red-50/30',
  HIGH: 'border-l-orange-500 bg-orange-50/30',
  MEDIUM: 'border-l-blue-500 bg-blue-50/30',
  LOW: 'border-l-slate-300 bg-slate-50/50',
}
const priorityBadgeV: Record<string, 'destructive' | 'warning' | 'default' | 'secondary'> = {
  URGENT: 'destructive', HIGH: 'warning', MEDIUM: 'default', LOW: 'secondary',
}

function TaskCard({ task, onClick }: { task: TaskItem; onClick: () => void }) {
  const hasDeadline = task.deadline && dayjs(task.deadline).isValid()
  const isOverdue = hasDeadline && dayjs(task.deadline).isBefore(dayjs()) && task.status !== 'DONE'
  return (
    <div
      onClick={onClick}
      className={`pl-3 pr-4 py-3 cursor-pointer rounded-lg border border-slate-100 bg-white hover:border-blue-200 hover:shadow-sm hover:translate-x-1 transition-all duration-150 border-l-4 ${priorityClass[task.priority]}`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="font-medium text-sm text-slate-900 truncate">{task.title}</p>
          <div className="flex items-center gap-2 mt-1.5">
            <span className={`text-xs flex items-center gap-1 ${isOverdue ? 'text-red-500' : 'text-slate-400'}`}>
              <Clock className="w-3 h-3" />
              {!hasDeadline ? '无截止时间' :
               isOverdue
                ? `已逾期 ${Math.abs(dayjs(task.deadline).diff(dayjs(), 'day'))} 天`
                : dayjs(task.deadline).fromNow()}
            </span>
            <Badge variant={priorityBadgeV[task.priority] || 'secondary'} className="text-[10px] px-1.5 py-0 h-auto">
              {priorityLabel[task.priority]}
            </Badge>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function Dashboard() {
  const navigate = useNavigate()
  const [inputValue, setInputValue] = React.useState('')
  const [todayTasks, setTodayTasks] = React.useState<TaskItem[]>([])
  const [upcomingTasks, setUpcomingTasks] = React.useState<TaskItem[]>([])
  const [overdueTasks, setOverdueTasks] = React.useState<TaskItem[]>([])
  const [loading, setLoading] = React.useState(true)

  const loadData = async () => {
    setLoading(true)
    try {
      if (isMockMode()) {
        const res = await mockApi.getDashboardTasks()
        setTodayTasks(res.data?.today || [])
        setUpcomingTasks(res.data?.upcoming || [])
        setOverdueTasks(res.data?.overdue || [])
      } else {
        const res: any = await http.get('/dashboard/tasks')
        setTodayTasks(res?.data?.today || [])
        setUpcomingTasks(res?.data?.upcoming || [])
        setOverdueTasks(res?.data?.overdue || [])
      }
    } catch { /* silent */ } finally {
      setLoading(false)
    }
  }

  React.useEffect(() => { loadData() }, [])

  const handleQuickInput = () => {
    const content = inputValue.trim()
    if (!content) return
    navigate(`/input?content=${encodeURIComponent(content)}`)
  }

  const totalTasks = todayTasks.length + upcomingTasks.length + overdueTasks.length

  return (
    <div className="py-4 space-y-5 animate-fade-in">
      {/* Hero / Quick Input Section */}
      <div className="relative overflow-hidden rounded-2xl bg-blue-600 p-6 md:p-8">
        <div className="absolute top-0 right-0 w-64 h-64 rounded-full bg-white/10 -translate-y-1/2 translate-x-1/4" />
        <div className="absolute bottom-0 left-1/3 w-48 h-48 rounded-full bg-white/5 translate-y-1/2" />
        <div className="absolute top-1/2 left-1/4 w-24 h-24 rounded-full bg-white/10 blur-2xl" />
        <div className="relative z-10">
          <h2 className="text-lg md:text-xl font-bold text-white mb-1 tracking-tight">欢迎回来</h2>
          <p className="text-blue-100 text-sm mb-5">
            输入一段文字或上传文件，AI 自动帮你生成任务计划
          </p>
          <div className="flex gap-2">
            <div className="flex-1 relative">
              <Input
                placeholder="输入任务内容，例如：下周五前提交项目立项书..."
                value={inputValue}
                onChange={e => setInputValue(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleQuickInput() }}
                className="h-11 bg-white border-transparent text-slate-900 placeholder:text-slate-400 focus-visible:ring-blue-400 focus-visible:ring-offset-0 shadow-lg"
              />
            </div>
            <Button onClick={handleQuickInput} variant="gradient" size="lg" className="h-11 px-5 font-semibold">
              <Send className="w-4 h-4 mr-1.5" />
              提交
            </Button>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/input')}
            className="mt-3 text-blue-200 hover:text-white hover:bg-white/10"
          >
            <Upload className="w-3.5 h-3.5 mr-1.5" />
            上传文件
          </Button>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: '今日待办', value: todayTasks.length, icon: Calendar, color: 'text-blue-600', bg: 'bg-blue-50' },
          { label: '即将截止', value: upcomingTasks.length, icon: Flame, color: 'text-orange-500', bg: 'bg-orange-50' },
          { label: '已过期', value: overdueTasks.length, icon: AlertTriangle, color: overdueTasks.length > 0 ? 'text-red-500' : 'text-slate-400', bg: 'bg-red-50' },
          { label: '总计', value: totalTasks, icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-50' },
        ].map((stat, i) => (
          <Card key={i} className="border-slate-100">
            <CardContent className="p-4 flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl ${stat.bg} flex items-center justify-center`}>
                <stat.icon className={`w-5 h-5 ${stat.color}`} />
              </div>
              <div>
                <p className="text-xs text-slate-500">{stat.label}</p>
                {loading ? (
                  <Skeleton className="h-7 w-8 mt-0.5" />
                ) : (
                  <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Task Sections */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Today */}
        <Card className="border-slate-100">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Calendar className="w-4 h-4 text-blue-600" />
                今日待办
                {todayTasks.length > 0 && <Badge variant="default" className="text-[10px]">{todayTasks.length}</Badge>}
              </CardTitle>
              {todayTasks.length > 0 && (
                <Button variant="ghost" size="sm" onClick={() => navigate('/tasks?filter=today')} className="text-xs text-slate-400 h-auto p-0 hover:text-blue-600">
                  全部 <ChevronRight className="w-3 h-3 ml-0.5" />
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            {loading ? (
              <div className="space-y-3"><Skeleton className="h-16 w-full" /><Skeleton className="h-16 w-full" /></div>
            ) : todayTasks.length > 0 ? (
              <div className="space-y-2">
                {todayTasks.map(task => <TaskCard key={task.id} task={task} onClick={() => navigate(`/tasks/${task.id}`)} />)}
              </div>
            ) : (
              <EmptyState description="今日暂无待办任务" actionText="添加任务" actionPath="/input" />
            )}
          </CardContent>
        </Card>

        {/* Upcoming */}
        <Card className="border-slate-100">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Flame className="w-4 h-4 text-orange-500" />
                即将截止
                {upcomingTasks.length > 0 && <Badge variant="warning" className="text-[10px]">{upcomingTasks.length}</Badge>}
              </CardTitle>
              {upcomingTasks.length > 0 && (
                <Button variant="ghost" size="sm" onClick={() => navigate('/tasks?filter=due')} className="text-xs text-slate-400 h-auto p-0 hover:text-blue-600">
                  全部 <ChevronRight className="w-3 h-3 ml-0.5" />
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            {loading ? (
              <div className="space-y-3"><Skeleton className="h-16 w-full" /><Skeleton className="h-16 w-full" /></div>
            ) : upcomingTasks.length > 0 ? (
              <div className="space-y-2">
                {upcomingTasks.map(task => <TaskCard key={task.id} task={task} onClick={() => navigate(`/tasks/${task.id}`)} />)}
              </div>
            ) : (
              <EmptyState description="暂无即将截止任务" />
            )}
          </CardContent>
        </Card>

        {/* Overdue */}
        <Card className="border-slate-100">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-red-500" />
                已过期
                {overdueTasks.length > 0 && <Badge variant="destructive" className="text-[10px]">{overdueTasks.length}</Badge>}
              </CardTitle>
              {overdueTasks.length > 0 && (
                <Button variant="ghost" size="sm" onClick={() => navigate('/tasks?filter=overdue')} className="text-xs text-slate-400 h-auto p-0 hover:text-blue-600">
                  全部 <ChevronRight className="w-3 h-3 ml-0.5" />
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            {loading ? (
              <div className="space-y-3"><Skeleton className="h-16 w-full" /></div>
            ) : overdueTasks.length > 0 ? (
              <div className="space-y-2">
                {overdueTasks.map(task => <TaskCard key={task.id} task={task} onClick={() => navigate(`/tasks/${task.id}`)} />)}
              </div>
            ) : (
              <EmptyState description="没有过期的任务" />
            )}
          </CardContent>
        </Card>
      </div>

      {/* AI Tip */}
      <Card className="border-slate-200 bg-gradient-to-r from-slate-50 to-orange-50/30">
        <CardContent className="p-4 flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center flex-shrink-0">
            <Sparkles className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-800">使用提示</p>
            <p className="text-xs text-slate-500 mt-0.5">
              你可以输入一段课程公告、作业要求、图片截图等，AI 会自动识别任务、设置截止时间、生成检查清单
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
