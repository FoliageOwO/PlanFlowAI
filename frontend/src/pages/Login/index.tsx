import React from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuthStore } from '../../stores/authStore'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Label } from '../../components/ui/label'
import { Card, CardContent } from '../../components/ui/card'
import { mockApi, isMockMode } from '../../services/mockData'
import http from '../../services/api'
import { ClipboardCheck, User, Lock } from 'lucide-react'

export default function Login() {
  const navigate = useNavigate()
  const login = useAuthStore((s) => s.login)
  const [loading, setLoading] = React.useState(false)
  const [username, setUsername] = React.useState('')
  const [password, setPassword] = React.useState('')
  const [error, setError] = React.useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (!username.trim() || !password.trim()) {
      setError('请填写用户名和密码')
      return
    }
    setLoading(true)
    try {
      let role: string = 'USER'
      const values = { username, password }
      if (isMockMode()) {
        const res = await mockApi.login(values)
        if (res.code !== 0) { setError(res.message); return }
        role = res.data.user.role
        login(res.data.user, res.data.token)
      } else {
        const res: any = await http.post('/auth/login', values)
        role = res.data.user.role
        login(res.data.user, res.data.token)
      }
      navigate(role === 'ADMIN' ? '/admin' : '/', { replace: true })
    } catch (err: any) {
      setError(err?.response?.data?.message || '登录失败，请重试')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-50 p-4">
      <Card className="w-full max-w-sm">
        <CardContent className="pt-8 pb-6">
          {/* Logo */}
          <div className="text-center mb-8">
            <div className="w-14 h-14 mx-auto mb-4 rounded-lg bg-zinc-950 flex items-center justify-center">
              <ClipboardCheck className="w-7 h-7 text-white" />
            </div>
            <h1 className="text-xl font-semibold text-zinc-950 tracking-tight">PlanFlow AI</h1>
            <p className="text-sm text-zinc-500 mt-1">把通知和要求整理成计划</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="username">用户名</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                <Input
                  id="username"
                  placeholder="请输入用户名"
                  className="pl-10"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password">密码</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                <Input
                  id="password"
                  type="password"
                  placeholder="请输入密码"
                  className="pl-10"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                />
              </div>
            </div>

            {error && (
              <p className="text-sm text-red-500 bg-red-50 rounded-lg px-3 py-2">{error}</p>
            )}

            <Button type="submit" variant="gradient" size="lg" className="w-full" loading={loading}>
              登录
            </Button>
          </form>

          <div className="mt-5 text-center text-sm text-zinc-500">
            没有账号？
            <Link to="/register" className="ml-1.5 text-zinc-950 font-medium hover:text-zinc-700 transition-colors">
              立即注册
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
