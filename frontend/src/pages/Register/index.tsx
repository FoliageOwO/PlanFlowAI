import React from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Label } from '../../components/ui/label'
import { Card, CardContent } from '../../components/ui/card'
import { mockApi, isMockMode } from '../../services/mockData'
import http from '../../services/api'
import { Sparkles, User, Lock, Smile } from 'lucide-react'

export default function Register() {
  const navigate = useNavigate()
  const [loading, setLoading] = React.useState(false)
  const [form, setForm] = React.useState({ username: '', password: '', confirmPassword: '', nickname: '' })
  const [error, setError] = React.useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    const { username, password, confirmPassword, nickname } = form
    if (!username || !password || !nickname) { setError('请填写所有必填项'); return }
    if (username.length < 3) { setError('用户名至少3个字符'); return }
    if (password.length < 6) { setError('密码至少6个字符'); return }
    if (password !== confirmPassword) { setError('两次输入的密码不一致'); return }

    setLoading(true)
    try {
      const params = { username, password, nickname }
      if (isMockMode()) {
        const res = await mockApi.register(params)
        if (res.code !== 0) { setError(res.message); return }
      } else {
        await http.post('/auth/register', params)
      }
      navigate('/login', { state: { registered: true } })
    } catch (err: any) {
      setError(err?.response?.data?.message || '注册失败，请重试')
    } finally {
      setLoading(false)
    }
  }

  const update = (field: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(prev => ({ ...prev, [field]: e.target.value }))

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 p-4 relative overflow-hidden">
      <div className="absolute -top-20 -right-20 w-80 h-80 rounded-full bg-blue-100/20" />
      <Card className="w-full max-w-sm relative z-10 border-slate-200">
        <CardContent className="pt-8 pb-6">
          <div className="text-center mb-8">
            <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-emerald-500 to-blue-600 flex items-center justify-center shadow-md shadow-emerald-200">
              <Sparkles className="w-7 h-7 text-white" />
            </div>
            <h1 className="text-xl font-bold text-slate-900">创建账号</h1>
            <p className="text-sm text-slate-500 mt-1">注册 PlanFlow AI 账号开始使用</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3.5">
            <div className="space-y-1.5">
              <Label htmlFor="r-username">用户名</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input id="r-username" placeholder="请输入用户名" className="pl-10" value={form.username} onChange={update('username')} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="r-nickname">昵称</Label>
              <div className="relative">
                <Smile className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input id="r-nickname" placeholder="请输入昵称" className="pl-10" value={form.nickname} onChange={update('nickname')} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="r-password">密码</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input id="r-password" type="password" placeholder="请输入密码" className="pl-10" value={form.password} onChange={update('password')} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="r-confirm">确认密码</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input id="r-confirm" type="password" placeholder="请再次输入密码" className="pl-10" value={form.confirmPassword} onChange={update('confirmPassword')} />
              </div>
            </div>

            {error && <p className="text-sm text-red-500 bg-red-50 rounded-lg px-3 py-2">{error}</p>}

            <Button type="submit" variant="gradient" size="lg" className="w-full !bg-gradient-to-br !from-emerald-500 !to-blue-600 hover:!from-emerald-600 hover:!to-blue-700" loading={loading}>
              注册
            </Button>
          </form>

          <div className="mt-5 text-center text-sm text-slate-500">
            已有账号？
            <Link to="/login" className="ml-1.5 text-blue-600 font-medium hover:text-blue-700 transition-colors">
              立即登录
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
