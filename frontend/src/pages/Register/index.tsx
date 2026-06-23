import React from 'react'
import { Form, Input, Button, Card, message, Typography } from 'antd'
import { UserOutlined, LockOutlined, SmileOutlined } from '@ant-design/icons'
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
      background: 'linear-gradient(135deg, #667eea 0%, #1677ff 100%)',
      padding: 16,
    }}>
      <Card style={{ width: 400, maxWidth: '100%' }} bordered={false}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <Title level={3} style={{ marginBottom: 4, color: '#1677ff' }}>创建账号</Title>
          <Text type="secondary">注册 PlanFlowAI 账号</Text>
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
            <Input prefix={<UserOutlined />} placeholder="用户名" size="large" />
          </Form.Item>
          <Form.Item
            name="nickname"
            rules={[{ required: true, message: '请输入昵称' }]}
          >
            <Input prefix={<SmileOutlined />} placeholder="昵称" size="large" />
          </Form.Item>
          <Form.Item
            name="password"
            rules={[
              { required: true, message: '请输入密码' },
              { min: 6, message: '密码至少6个字符' },
            ]}
          >
            <Input.Password prefix={<LockOutlined />} placeholder="密码" size="large" />
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
            <Input.Password prefix={<LockOutlined />} placeholder="确认密码" size="large" />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" block size="large" loading={loading}>
              注册
            </Button>
          </Form.Item>
        </Form>
        <div style={{ textAlign: 'center' }}>
          <Text>已有账号？</Text>
          <Link to="/login">登录</Link>
        </div>
      </Card>
    </div>
  )
}
