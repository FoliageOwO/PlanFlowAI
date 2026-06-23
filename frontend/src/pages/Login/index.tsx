import React from 'react'
import { Form, Input, Button, Card, message, Typography } from 'antd'
import { UserOutlined, LockOutlined } from '@ant-design/icons'
import { useNavigate, Link } from 'react-router-dom'
import { useAuthStore } from '../../stores/authStore'
import { mockApi, isMockMode } from '../../services/mockData'
import http from '../../services/api'

const { Title, Text } = Typography

interface LoginForm {
  username: string
  password: string
}

export default function Login() {
  const navigate = useNavigate()
  const login = useAuthStore((s) => s.login)
  const [loading, setLoading] = React.useState(false)

  const handleSubmit = async (values: LoginForm) => {
    setLoading(true)
    try {
      if (isMockMode()) {
        const res = await mockApi.login(values)
        if (res.code !== 0) {
          message.error(res.message)
          return
        }
        login(res.data.user, res.data.token)
        message.success('登录成功')
        navigate(res.data.user.role === 'ADMIN' ? '/admin' : '/', { replace: true })
      } else {
        const res: any = await http.post('/auth/login', values)
        login(res.data.user, res.data.token)
        message.success('登录成功')
        navigate(res.data.user.role === 'ADMIN' ? '/admin' : '/', { replace: true })
      }
    } catch (err: any) {
      message.error(err?.response?.data?.message || '登录失败，请重试')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      background: 'linear-gradient(135deg, #667eea 0%, #1677ff 100%)',
      padding: 16,
    }}>
      <Card style={{ width: 400, maxWidth: '100%' }} bordered={false}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <Title level={3} style={{ marginBottom: 4, color: '#1677ff' }}>PlanFlowAI</Title>
          <Text type="secondary">智能任务规划系统</Text>
        </div>
        <Form
          name="login"
          layout="vertical"
          onFinish={handleSubmit}
          autoComplete="off"
          requiredMark={false}
        >
          <Form.Item
            name="username"
            rules={[{ required: true, message: '请输入用户名' }]}
          >
            <Input prefix={<UserOutlined />} placeholder="用户名" size="large" />
          </Form.Item>
          <Form.Item
            name="password"
            rules={[{ required: true, message: '请输入密码' }]}
          >
            <Input.Password prefix={<LockOutlined />} placeholder="密码" size="large" />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" block size="large" loading={loading}>
              登录
            </Button>
          </Form.Item>
        </Form>
        <div style={{ textAlign: 'center' }}>
          <Text>没有账号？</Text>
          <Link to="/register">注册</Link>
        </div>
      </Card>
    </div>
  )
}
