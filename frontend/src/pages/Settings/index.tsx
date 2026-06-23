import React from 'react'
import { Card, Form, Input, Button, Switch, Divider, Typography, message, Space } from 'antd'
import { UserOutlined, LogoutOutlined, BellOutlined, MobileOutlined } from '@ant-design/icons'
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
        await http.put('/user/profile', values)
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

  return (
    <div className="page-container" style={{ padding: '16px 0', maxWidth: 600, margin: '0 auto' }}>
      <Title level={4} style={{ marginBottom: 16 }}>设置</Title>

      {/* Profile */}
      <Card title="个人资料" style={{ marginBottom: 16 }} size="small">
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSaveProfile}
          requiredMark={false}
        >
          <Form.Item
            name="nickname"
            label="昵称"
            rules={[{ required: true, message: '请输入昵称' }]}
          >
            <Input prefix={<UserOutlined />} placeholder="输入昵称" />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" loading={saving}>
              保存修改
            </Button>
          </Form.Item>
        </Form>
      </Card>

      {/* Notification Settings */}
      <Card title="通知设置" style={{ marginBottom: 16 }} size="small">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <Space>
            <BellOutlined />
            <div>
              <Text strong>站内通知</Text>
              <br />
              <Text type="secondary" style={{ fontSize: 12 }}>接收系统内的通知消息</Text>
            </div>
          </Space>
          <Switch checked={inAppNotify} onChange={setInAppNotify} />
        </div>
        <Divider style={{ margin: '12px 0' }} />
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Space>
            <MobileOutlined />
            <div>
              <Text strong>本地通知</Text>
              <br />
              <Text type="secondary" style={{ fontSize: 12 }}>接收浏览器推送通知</Text>
            </div>
          </Space>
          <Switch checked={localNotify} onChange={setLocalNotify} />
        </div>
      </Card>

      {/* Logout */}
      <Card size="small">
        <Button danger block icon={<LogoutOutlined />} onClick={handleLogout} size="large">
          退出登录
        </Button>
      </Card>
    </div>
  )
}
