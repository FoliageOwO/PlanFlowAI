import React from 'react'
import { Card, Form, Input, Button, Switch, Divider, Typography, message, Space, Tag, Row, Col, Avatar } from 'antd'
import {
  UserOutlined, LogoutOutlined, BellOutlined, MobileOutlined,
  SafetyOutlined, InfoCircleOutlined, MailOutlined,
} from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../../stores/authStore'
import { mockApi, isMockMode } from '../../services/mockData'
import http from '../../services/api'

const { Title, Text } = Typography

export default function Settings() {
  const navigate = useNavigate()
  const { user, logout } = useAuthStore()
  const [form] = Form.useForm()
  const [saving, setSaving] = React.useState(false)
  const [inAppNotify, setInAppNotify] = React.useState(true)
  const [localNotify, setLocalNotify] = React.useState(false)

  React.useEffect(() => {
    if (user) {
      form.setFieldsValue({ nickname: user.nickname })
    }
  }, [user, form])

  const handleSaveProfile = async (values: { nickname: string }) => {
    setSaving(true)
    try {
      if (isMockMode()) {
        await mockApi.updateProfile(values)
      } else {
        await http.put('/auth/user/profile', values)
      }
      message.success('昵称修改成功')
    } catch {
      message.error('修改失败')
    } finally {
      setSaving(false)
    }
  }

  const handleLogout = () => {
    logout()
    message.success('已退出登录')
    navigate('/login')
  }

  const firstLetter = (user?.nickname || user?.username || '?')[0].toUpperCase()

  return (
    <div className="page-container" style={{ padding: '16px 0', maxWidth: 640, margin: '0 auto' }}>
      <Title level={4} style={{ marginBottom: 20 }}>⚙️ 设置</Title>

      {/* User Profile Card */}
      <Card style={{ marginBottom: 16, borderRadius: 'var(--radius-lg)' }} bodyStyle={{ padding: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginBottom: 20 }}>
          <Avatar
            size={64}
            style={{
              background: user?.role === 'ADMIN'
                ? 'linear-gradient(135deg, #1677ff, #4096ff)'
                : 'linear-gradient(135deg, #52c41a, #73d13d)',
              fontSize: 28,
              fontWeight: 700,
              boxShadow: 'var(--shadow-md)',
            }}
          >
            {firstLetter}
          </Avatar>
          <div>
            <Title level={5} style={{ margin: 0, marginBottom: 4 }}>{user?.nickname || user?.username}</Title>
            <Space>
              <Text style={{ color: '#999', fontSize: 13 }}>@{user?.username}</Text>
              <Tag color={user?.role === 'ADMIN' ? 'blue' : 'green'} style={{ fontSize: 11 }}>
                {user?.role === 'ADMIN' ? '管理员' : '用户'}
              </Tag>
            </Space>
          </div>
        </div>

        <Divider style={{ margin: '16px 0' }} />

        <Form
          form={form}
          layout="vertical"
          onFinish={handleSaveProfile}
          requiredMark={false}
        >
          <Row gutter={16}>
            <Col xs={24} sm={16}>
              <Form.Item
                name="nickname"
                label="昵称"
                rules={[{ required: true, message: '请输入昵称' }]}
              >
                <Input
                  prefix={<UserOutlined style={{ color: '#999' }} />}
                  placeholder="输入昵称"
                  size="large"
                  style={{ borderRadius: 'var(--radius-sm)' }}
                />
              </Form.Item>
            </Col>
            <Col xs={24} sm={8}>
              <Form.Item label="&nbsp;">
                <Button
                  type="primary"
                  htmlType="submit"
                  loading={saving}
                  size="large"
                  block
                  style={{ borderRadius: 'var(--radius-sm)' }}
                >
                  保存修改
                </Button>
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Card>

      {/* Notification Settings */}
      <Card
        title={<Space><BellOutlined /> 通知设置</Space>}
        style={{ marginBottom: 16, borderRadius: 'var(--radius-md)' }}
        size="small"
      >
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '12px 0',
        }}>
          <Space size={12}>
            <div style={{
              width: 36, height: 36, borderRadius: 8,
              background: '#e6f4ff', display: 'flex',
              alignItems: 'center', justifyContent: 'center',
              fontSize: 18,
            }}>
              <BellOutlined style={{ color: 'var(--primary)' }} />
            </div>
            <div>
              <Text strong style={{ fontSize: 14 }}>站内通知</Text>
              <br />
              <Text style={{ fontSize: 12, color: '#999' }}>接收系统内的通知消息</Text>
            </div>
          </Space>
          <Switch checked={inAppNotify} onChange={setInAppNotify} />
        </div>

        <Divider style={{ margin: '4px 0' }} />

        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '12px 0',
        }}>
          <Space size={12}>
            <div style={{
              width: 36, height: 36, borderRadius: 8,
              background: '#fffbe6', display: 'flex',
              alignItems: 'center', justifyContent: 'center',
              fontSize: 18,
            }}>
              <MobileOutlined style={{ color: 'var(--warning)' }} />
            </div>
            <div>
              <Text strong style={{ fontSize: 14 }}>本地通知</Text>
              <br />
              <Text style={{ fontSize: 12, color: '#999' }}>接收浏览器推送通知（仅 Android App）</Text>
            </div>
          </Space>
          <Switch checked={localNotify} onChange={setLocalNotify} />
        </div>
      </Card>

      {/* Account */}
      <Card
        title={<Space><SafetyOutlined /> 账号</Space>}
        style={{ marginBottom: 16, borderRadius: 'var(--radius-md)' }}
        size="small"
      >
        <Button
          danger
          block
          size="large"
          icon={<LogoutOutlined />}
          onClick={handleLogout}
          style={{
            borderRadius: 'var(--radius-sm)',
            height: 46,
            fontSize: 15,
          }}
        >
          退出登录
        </Button>
        <div style={{ textAlign: 'center', marginTop: 12 }}>
          <Text style={{ fontSize: 12, color: '#bbb' }}>
            PlanFlow AI v1.0
          </Text>
        </div>
      </Card>
    </div>
  )
}
