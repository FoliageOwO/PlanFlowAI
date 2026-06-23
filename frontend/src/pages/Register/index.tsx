import React from 'react'
import { Form, Input, Button, Card, message, Typography, Steps, Space } from 'antd'
import {
  UserOutlined, LockOutlined, SmileOutlined,
  CheckCircleOutlined, ArrowLeftOutlined, RobotOutlined,
} from '@ant-design/icons'
import { useNavigate, Link } from 'react-router-dom'
import { mockApi, isMockMode } from '../../services/mockData'
import http from '../../services/api'

const { Title, Text } = Typography

interface RegisterForm {
  username: string
  password: string
  confirmPassword: string
  nickname: string
}

export default function Register() {
  const navigate = useNavigate()
  const [loading, setLoading] = React.useState(false)

  const handleSubmit = async (values: RegisterForm) => {
    setLoading(true)
    try {
      const params = { username: values.username, password: values.password, nickname: values.nickname }
      if (isMockMode()) {
        const res = await mockApi.register(params)
        if (res.code !== 0) {
          message.error(res.message)
          return
        }
      } else {
        await http.post('/auth/register', params)
      }
      message.success('注册成功，请登录')
      navigate('/login')
    } catch (err: any) {
      message.error(err?.response?.data?.message || '注册失败，请重试')
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
      background: 'linear-gradient(135deg, #0b1a33 0%, #0d2b5e 30%, #1677ff 100%)',
      padding: 16,
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Decorative */}
      <div style={{
        position: 'absolute',
        top: -80,
        right: -80,
        width: 300,
        height: 300,
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(22,119,255,0.12) 0%, transparent 70%)',
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
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{
            width: 56,
            height: 56,
            borderRadius: 14,
            background: 'linear-gradient(135deg, var(--success), #73d13d)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 12px',
            boxShadow: '0 4px 12px rgba(82,196,26,0.3)',
          }}>
            <RobotOutlined style={{ fontSize: 28, color: '#fff' }} />
          </div>
          <Title level={3} style={{ margin: 0, marginBottom: 4, color: '#1a1a1a' }}>
            创建账号
          </Title>
          <Text style={{ color: '#999' }}>注册 PlanFlowAI 账号开始使用</Text>
        </div>

        <Form
          name="register"
          layout="vertical"
          onFinish={handleSubmit}
          autoComplete="off"
          requiredMark={false}
        >
          <Form.Item
            name="username"
            rules={[
              { required: true, message: '请输入用户名' },
              { min: 3, message: '用户名至少3个字符' },
            ]}
          >
            <Input
              prefix={<UserOutlined style={{ color: '#999' }} />}
              placeholder="用户名"
              size="large"
              style={{ borderRadius: 'var(--radius-sm)' }}
            />
          </Form.Item>

          <Form.Item
            name="nickname"
            rules={[{ required: true, message: '请输入昵称' }]}
          >
            <Input
              prefix={<SmileOutlined style={{ color: '#999' }} />}
              placeholder="昵称"
              size="large"
              style={{ borderRadius: 'var(--radius-sm)' }}
            />
          </Form.Item>

          <Form.Item
            name="password"
            rules={[
              { required: true, message: '请输入密码' },
              { min: 6, message: '密码至少6个字符' },
            ]}
          >
            <Input.Password
              prefix={<LockOutlined style={{ color: '#999' }} />}
              placeholder="密码"
              size="large"
              style={{ borderRadius: 'var(--radius-sm)' }}
            />
          </Form.Item>

          <Form.Item
            name="confirmPassword"
            dependencies={['password']}
            rules={[
              { required: true, message: '请确认密码' },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!value || getFieldValue('password') === value) {
                    return Promise.resolve()
                  }
                  return Promise.reject(new Error('两次输入的密码不一致'))
                },
              }),
            ]}
          >
            <Input.Password
              prefix={<LockOutlined style={{ color: '#999' }} />}
              placeholder="确认密码"
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
                background: 'linear-gradient(135deg, var(--success), #73d13d)',
                border: 'none',
                boxShadow: '0 4px 12px rgba(82,196,26,0.3)',
              }}
            >
              注册
            </Button>
          </Form.Item>
        </Form>

        <div style={{ textAlign: 'center' }}>
          <Space>
            <Text style={{ color: '#999' }}>已有账号？</Text>
            <Link to="/login" style={{ fontWeight: 500 }}>立即登录</Link>
          </Space>
        </div>
      </Card>
    </div>
  )
}
