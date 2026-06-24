import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card'
import { Badge } from '../../../components/ui/badge'
import { Skeleton } from '../../../components/ui/skeleton'
import EmptyState from '../../../components/common/EmptyState'
import { mockApi, isMockMode } from '../../../services/mockData'
import http from '../../../services/api'
import type { AdminStats } from '../../../services/mockData'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import 'dayjs/locale/zh-cn'
import { UserPlus, FileText, CheckCircle2, XCircle, Server, Database, Cloud, CheckCircle, X } from 'lucide-react'

dayjs.extend(relativeTime)
dayjs.locale('zh-cn')

export default function AdminDashboard() {
  const [stats, setStats] = React.useState<AdminStats | null>(null)
  const [loading, setLoading] = React.useState(true)

  React.useEffect(() => {
    (async () => {
      setLoading(true)
      try {
        if (isMockMode()) { const res = await mockApi.getAdminStats(); if (res.code === 0) setStats(res.data) }
        else { const res: any = await http.get('/admin/stats'); setStats(res.data) }
      } catch { } finally { setLoading(false) }
    })()
  }, [])

  if (loading) return <div className="space-y-4"><Skeleton className="h-8 w-48" /><div className="grid grid-cols-2 md:grid-cols-4 gap-3">{Array.from({length:4}).map((_,i)=><Skeleton key={i} className="h-24"/>)}</div></div>

  if (!stats) return <Card className="border-slate-100"><CardContent className="py-12"><EmptyState description="无法加载统计数据" /></CardContent></Card>

  const successRate = stats.todayParseJobs > 0 ? ((stats.todaySuccessCount / stats.todayParseJobs) * 100).toFixed(1) : '0.0'

  const healthItems = [
    { label: 'API 服务', key: 'api' as const, icon: Server },
    { label: '数据库', key: 'database' as const, icon: Database },
    { label: 'OCR 服务', key: 'ocr' as const, icon: Cloud },
  ]

  const statusConfig: Record<string, { label: string; variant: 'success' | 'destructive' | 'default' | 'secondary' }> = {
    COMPLETED: { label: '已完成', variant: 'success' },
    FAILED: { label: '失败', variant: 'destructive' },
    AI_PARSING: { label: 'AI解析中', variant: 'default' },
    TEXT_EXTRACTED: { label: '文本提取中', variant: 'secondary' },
    UPLOADED: { label: '已上传', variant: 'secondary' },
  }

  return (
    <div className="animate-fade-in">
      <div className="mb-5">
        <h3 className="text-lg font-bold text-slate-900">📊 系统状态概览</h3>
        <p className="text-sm text-slate-400 mt-0.5">今日解析成功率 {successRate}%</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        {[
          { label: '今日注册', value: stats.todayRegistrations, icon: UserPlus, color: 'text-blue-600', bg: 'bg-blue-50' },
          { label: '解析任务', value: stats.todayParseJobs, icon: FileText, color: 'text-purple-600', bg: 'bg-purple-50' },
          { label: '成功', value: stats.todaySuccessCount, icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-50', suffix: ` / ${stats.todayParseJobs}` },
          { label: '失败', value: stats.todayFailCount, icon: XCircle, color: stats.todayFailCount > 0 ? 'text-red-500' : 'text-slate-400', bg: 'bg-red-50' },
        ].map((s, i) => (
          <Card key={i} className="border-slate-100">
            <CardContent className="p-4 flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl ${s.bg} flex items-center justify-center`}>
                <s.icon className={`w-5 h-5 ${s.color}`} />
              </div>
              <div>
                <p className="text-xs text-slate-500">{s.label}</p>
                <p className={`text-2xl font-bold ${s.color}`}>{s.value}<span className="text-sm text-slate-400 font-normal">{s.suffix}</span></p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* System Health */}
      <Card className="border-slate-100 mb-4">
        <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Server className="w-4 h-4 text-blue-600" />系统健康状态</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {healthItems.map(item => {
              const ok = stats.systemHealth[item.key]
              return (
                <div key={item.key} className={`flex items-center justify-between p-3 rounded-lg border ${ok ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200'}`}>
                  <div className="flex items-center gap-2">
                    <item.icon className={`w-4 h-4 ${ok ? 'text-emerald-600' : 'text-red-500'}`} />
                    <span className="text-sm font-medium">{item.label}</span>
                  </div>
                  <Badge variant={ok ? 'success' : 'destructive'} className="text-[10px] gap-1">
                    {ok ? <CheckCircle className="w-3 h-3" /> : <X className="w-3 h-3" />}
                    {ok ? '正常' : '异常'}
                  </Badge>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Recent Jobs */}
      <Card className="border-slate-100">
        <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><FileText className="w-4 h-4 text-blue-600" />最近解析任务</CardTitle></CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-left text-xs text-slate-400">
                  <th className="py-3 px-4 font-medium">ID</th>
                  <th className="py-3 px-4 font-medium">用户</th>
                  <th className="py-3 px-4 font-medium">来源</th>
                  <th className="py-3 px-4 font-medium">状态</th>
                  <th className="py-3 px-4 font-medium">时间</th>
                </tr>
              </thead>
              <tbody>
                {stats.recentJobs.map(job => {
                  const st = statusConfig[job.status] || { label: job.status, variant: 'secondary' as const }
                  return (
                    <tr key={job.id} className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
                      <td className="py-2.5 px-4 text-xs text-slate-500 font-mono">{job.id}</td>
                      <td className="py-2.5 px-4 text-slate-700">{job.userName}</td>
                      <td className="py-2.5 px-4"><Badge variant="secondary" className="text-[10px]">{job.sourceType}</Badge></td>
                      <td className="py-2.5 px-4"><Badge variant={st.variant} className="text-[10px]">{st.label}</Badge></td>
                      <td className="py-2.5 px-4 text-xs text-slate-400">{dayjs(job.createdAt).format('HH:mm:ss')}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
