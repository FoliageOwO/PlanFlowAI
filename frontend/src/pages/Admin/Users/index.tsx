import React from 'react'
import dayjs from 'dayjs'
import { Button } from '../../../components/ui/button'
import { Input } from '../../../components/ui/input'
import { Badge } from '../../../components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card'
import { Avatar, AvatarFallback } from '../../../components/ui/avatar'
import { Skeleton } from '../../../components/ui/skeleton'
import EmptyState from '../../../components/common/EmptyState'
import { mockApi, isMockMode } from '../../../services/mockData'
import http from '../../../services/api'
import type { AdminUser } from '../../../services/mockData'
import { Search, CheckCircle2, XCircle, Users } from 'lucide-react'

export default function AdminUsers() {
  const [users, setUsers] = React.useState<AdminUser[]>([])
  const [loading, setLoading] = React.useState(true)
  const [search, setSearch] = React.useState('')
  const [toggling, setToggling] = React.useState<string | null>(null)

  const loadUsers = React.useCallback(async (s?: string) => {
    setLoading(true)
    try {
      const params: Record<string, any> = {}
      if (s) params.search = s
      if (isMockMode()) {
        const res = await mockApi.getAdminUsers(params)
        if (res.code === 0) setUsers(res.data?.list || [])
      } else {
        const res: any = await http.get('/admin/users', { params })
        setUsers((res?.data?.list || []).map((user: any) => ({
          ...user,
          id: String(user.id),
          status: user.status === 1 || user.status === 'ACTIVE' ? 'ACTIVE' : 'DISABLED',
        })))
      }
    } catch { } finally { setLoading(false) }
  }, [])

  React.useEffect(() => { loadUsers() }, [loadUsers])

  const toggleStatus = async (userId: string, currentStatus: string) => {
    setToggling(userId)
    try {
      if (isMockMode()) await mockApi.toggleUserStatus(userId)
      else await http.put(`/admin/users/${userId}/toggle`)
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, status: currentStatus === 'ACTIVE' ? 'DISABLED' : 'ACTIVE' } : u))
    } catch { } finally { setToggling(null) }
  }

  const stats = React.useMemo(() => {
    const total = users.length
    const active = users.filter(u => u.status === 'ACTIVE').length
    const admins = users.filter(u => u.role === 'ADMIN').length
    return { total, active, disabled: total - active, admins }
  }, [users])

  return (
    <div className="animate-fade-in">
      <div className="mb-5">
        <h3 className="text-lg font-bold text-slate-900">👥 用户管理</h3>
        <p className="text-sm text-slate-400 mt-0.5">共 {stats.total} 个用户，{stats.active} 个活跃</p>
      </div>

      <div className="grid grid-cols-3 gap-2 mb-4">
        {[
          { label: '总用户', value: stats.total, color: '' },
          { label: '活跃', value: stats.active, color: 'text-emerald-600' },
          { label: '管理员', value: stats.admins, color: 'text-blue-600' },
        ].map((s, i) => (
          <Card key={i} className="border-slate-100">
            <CardContent className="p-3 text-center">
              <p className="text-[11px] text-slate-500">{s.label}</p>
              <p className={`text-lg font-bold ${s.color}`}>{s.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="border-slate-100 mb-4">
        <CardContent className="p-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input placeholder="搜索用户名或昵称..." value={search} onChange={e => setSearch(e.target.value)}
              className="pl-10" onKeyDown={e => { if (e.key === 'Enter') loadUsers(search || undefined) }} />
          </div>
        </CardContent>
      </Card>

      <Card className="border-slate-100">
        <CardContent className="p-0">
          {loading ? (
            <div className="p-4 space-y-3"><Skeleton className="h-14 w-full" /><Skeleton className="h-14 w-full" /></div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 text-left text-xs text-slate-400">
                    <th className="py-3 px-4 font-medium">用户</th>
                    <th className="py-3 px-4 font-medium">角色</th>
                    <th className="py-3 px-4 font-medium hidden md:table-cell">注册时间</th>
                    <th className="py-3 px-4 font-medium">状态</th>
                    <th className="py-3 px-4 font-medium">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map(u => (
                    <tr key={u.id} className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
                      <td className="py-2.5 px-4">
                        <div className="flex items-center gap-2.5">
                          <Avatar className="h-8 w-8">
                            <AvatarFallback className={u.role === 'ADMIN' ? 'bg-gradient-to-br from-blue-500 to-blue-700 text-white text-xs' : 'bg-gradient-to-br from-blue-400 to-blue-600 text-white text-xs'}>
                              {(u.nickname || u.username)[0].toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium text-slate-900">{u.nickname}</p>
                            <p className="text-xs text-slate-400">@{u.username}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-2.5 px-4">
                        <Badge variant={u.role === 'ADMIN' ? 'destructive' : 'default'} className="text-[10px]">
                          {u.role === 'ADMIN' ? '管理员' : '普通用户'}
                        </Badge>
                      </td>
                      <td className="py-2.5 px-4 text-xs text-slate-400 hidden md:table-cell">
                        {dayjs(u.createdAt).format('YYYY-MM-DD HH:mm')}
                      </td>
                      <td className="py-2.5 px-4">
                        <Badge variant={u.status === 'ACTIVE' ? 'success' : 'destructive'} className="text-[10px] gap-1">
                          {u.status === 'ACTIVE' ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                          {u.status === 'ACTIVE' ? '正常' : '已禁用'}
                        </Badge>
                      </td>
                      <td className="py-2.5 px-4">
                        <Button
                          variant={u.status === 'ACTIVE' ? 'outline' : 'default'}
                          size="sm"
                          className={u.status === 'ACTIVE' ? 'text-red-500 border-red-200 hover:bg-red-50' : ''}
                          loading={toggling === u.id}
                          onClick={() => toggleStatus(u.id, u.status)}
                        >
                          {u.status === 'ACTIVE' ? '禁用' : '启用'}
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {users.length === 0 && <div className="py-12"><EmptyState description="暂无用户" /></div>}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
