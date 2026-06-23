import React from 'react'
import { Form, Input, Button, Card, message, Typography, Space, Divider, Tag } from 'antd'
import { UserOutlined, LockOutlined, RobotOutlined, SafetyOutlined } from '@ant-design/icons'
import { useNavigate, Link } from 'react-router-dom'
import { useAuthStore } from '../../stores/authStore'
import { mockApi, isMockMode } from '../../services/mockData'
import http from '../../services/api'

const { Title, Text } = Typography

interface LoginForm {
  username: string
  password: string
}

const demoAccounts = [
  { label: '管理员', username: 'admin', password: '123456' },
  { label: '测试用户', username: 'test', password: '123456' },
]

export default function Login() {
  const navigate = useNavigate()
  const login = useAuthStore((s) => s.login)
  const [loading, setLoading] = React.useState(false)
  const [form] = Form.useForm()

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

  const fillDemo = (username: string, password: string) => {
    form.setFieldsValue({ username, password })
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      background: 'linear-gradient(135deg, #0b1a33 0%, #0d2b5e 30%, #1677ff 100%)',
      padding: 16,
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Decorative elements */}
      <div style={{
        position: 'absolute',
        top: -100,
        right: -100,
        width: 400,
        height: 400,
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(22,119,255,0.15) 0%, transparent 70%)',
      }} />
      <div style={{
        position: 'absolute',
        bottom: -60,
        left: -60,
        width: 300,
        height: 300,
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(82,196,26,0.1) 0%, transparent 70%)',
      }} />

      <Card
        style={{
          width: 420,
          maxWidth: '100%',
          borderRadius: 'var(--radius-xl)',
          boxShadow: 'var(--shadow-xl)',
          position: 'relative',
          zIndex: 1,
        }}
        bordered={false}
      >
        {/* Logo & Title */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{
            width: 64,
            height: 64,
            borderRadius: 16,
            background: 'linear-gradient(135deg, var(--primary), var(--primary-light))',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 16px',
            boxShadow: '0 4px 12px rgba(22,119,255,0.3)',
          }}>
            <RobotOutlined style={{ fontSize: 32, color: '#fff' }} />
          </div>
          <Title level={3} style={{ margin: 0, marginBottom: 4, background: 'linear-gradient(135deg, var(--primary), var(--primary-light))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            PlanFlowAI
          </Title>
          <Text style={{ color: '#999' }}>智能任务规划系统</Text>
        </div>

        <Form
          form={form}
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
            <Input
              prefix={<UserOutlined style={{ color: '#999' }} />}
              placeholder="用户名"
              size="large"
              style={{ borderRadius: 'var(--radius-sm)' }}
            />
          </Form.Item>

          <Form.Item
            name="password"
            rules={[{ required: true, message: '请输入密码' }]}
          >
            <Input.Password
              prefix={<LockOutlined style={{ color: '#999' }} />}
              placeholder="密码"
              size="large"
              style={{ borderRadius: 'var(--radius-sm)' }}
            />
          </Form.Item>

          <Form.Item>
            <Button
              type="primary"
              htmlType="submit"
              block
              size="large"
              loading={loading}
              style={{
                borderRadius: 'var(--radius-sm)',
                height: 46,
                fontSize: 16,
                fontWeight: 600,
              }}
            >
              登录
            </Button>
          </Form.Item>
        </Form>

        {/* Demo Accounts */}
        <div style={{ marginBottom: 16 }}>
          <Divider plain style={{ fontSize: 12, color: '#999', margin: '12px 0' }}>
            <SafetyOutlined style={{ marginRight: 4 }} />
            演示账号
          </Divider>
          <Space style={{ width: '100%', justifyContent: 'center' }} size={8}>
            {demoAccounts.map(acc => (
              <Tag
                key={acc.username}
                style={{
                  cursor: 'pointer',
                  padding: '4px 12px',
                  borderRadius: 12,
                  fontSize: 12,
                }}
                onClick={() => fillDemo(acc.username, acc.password)}
              >
                {acc.label}: {acc.username}
              </Tag>
            ))}
          </Space>
        </div>

        <div style={{ textAlign: 'center' }}>
          <Text style={{ color: '#999' }}>没有账号？</Text>
          <Link to="/register" style={{ marginLeft: 4 }}>立即注册</Link>
        </div>
      </Card>
    </div>
  )
}
