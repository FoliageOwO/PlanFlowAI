import React from 'react'
import { Layout, Menu, Button, Avatar, Dropdown, Typography } from 'antd'
import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import {
  DashboardOutlined,
  UserOutlined,
  ArrowLeftOutlined,
  LogoutOutlined,
  MenuOutlined,
  BarChartOutlined,
  TeamOutlined,
} from '@ant-design/icons'
import { useAuthStore } from '../stores/authStore'

const { Header, Sider, Content } = Layout
const { Text } = Typography

const adminNavItems = [
  { key: '/admin', icon: <BarChartOutlined />, label: '系统状态' },
  { key: '/admin/users', icon: <TeamOutlined />, label: '用户管理' },
]

export default function AdminLayout() {
  const navigate = useNavigate()
  const location = useLocation()
  const { user, logout } = useAuthStore()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const userMenuItems = [
    { key: 'back', icon: <ArrowLeftOutlined />, label: '返回用户端' },
    { type: 'divider' as const },
    { key: 'logout', icon: <LogoutOutlined />, label: '退出登录', danger: true },
  ]

  const handleUserMenuClick = ({ key }: { key: string }) => {
    if (key === 'back') {
      navigate('/')
    } else if (key === 'logout') {
      handleLogout()
    }
  }

  return (
    <Layout style={{ minHeight: '100vh' }}>
      {/* Desktop Header */}
      <Header className="hide-on-mobile" style={{
        background: '#001529',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 24px',
        height: 56,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <DashboardOutlined style={{ fontSize: 20, color: '#fff' }} />
          <Text style={{ color: '#fff', fontSize: 16, fontWeight: 600 }}>PlanFlowAI 管理后台</Text>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Button type="text" icon={<ArrowLeftOutlined />} onClick={() => navigate('/')} style={{ color: '#fff' }}>
            返回用户端
          </Button>
          <Dropdown
            menu={{ items: userMenuItems, onClick: handleUserMenuClick }}
            placement="bottomRight"
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', color: '#fff' }}>
              <Avatar size={28} icon={<UserOutlined />} style={{ background: '#1677ff' }} />
              <Text style={{ color: '#fff' }}>{user?.nickname || user?.username}</Text>
            </div>
          </Dropdown>
        </div>
      </Header>

      {/* Mobile Top Bar */}
      <div className="show-on-mobile" style={{
        background: '#001529',
        padding: '8px 16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        height: 48,
        color: '#fff',
      }}>
        <Text style={{ color: '#fff', fontSize: 16, fontWeight: 600 }}>管理后台</Text>
        <div style={{ display: 'flex', gap: 8 }}>
          <Button type="text" size="small" icon={<ArrowLeftOutlined />} onClick={() => navigate('/')} style={{ color: '#fff' }} />
          <MenuOutlined style={{ fontSize: 18, color: '#fff', cursor: 'pointer' }} onClick={() => navigate('/admin/settings')} />
        </div>
      </div>

      <Layout>
        {/* Desktop Sidebar */}
        <Sider className="hide-on-mobile" width={200} style={{ background: '#fff' }}>
          <Menu
            mode="inline"
            selectedKeys={[location.pathname]}
            style={{ height: '100%', borderRight: '1px solid #f0f0f0' }}
            items={adminNavItems.map((item) => ({
              key: item.key,
              icon: item.icon,
              label: item.label,
              onClick: () => navigate(item.key),
            }))}
          />
        </Sider>

        {/* Content */}
        <Content style={{ padding: 16, background: '#f5f5f5', minHeight: 'calc(100vh - 56px)' }}>
          <Outlet />
        </Content>
      </Layout>

      {/* Mobile Bottom Nav */}
      <div className="show-on-mobile" style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        background: '#fff',
        borderTop: '1px solid #f0f0f0',
        display: 'flex',
        justifyContent: 'space-around',
        alignItems: 'center',
        height: 56,
        zIndex: 100,
      }}>
        {adminNavItems.map((item) => {
          const isActive = item.key === '/admin'
            ? location.pathname === '/admin'
            : location.pathname.startsWith(item.key)
          return (
            <div
              key={item.key}
              onClick={() => navigate(item.key)}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 2,
                cursor: 'pointer',
                padding: '4px 12px',
                color: isActive ? '#1677ff' : '#999',
                fontSize: 10,
              }}
            >
              <div style={{ fontSize: 20 }}>{item.icon}</div>
              <span>{item.label}</span>
            </div>
          )
        })}
      </div>
    </Layout>
  )
}
