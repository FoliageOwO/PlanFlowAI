import React from 'react'
import { Layout, Badge, Dropdown, Avatar, Menu, Spin } from 'antd'
import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import {
  HomeOutlined,
  FileTextOutlined,
  UnorderedListOutlined,
  ClockCircleOutlined,
  BellOutlined,
  SettingOutlined,
  UserOutlined,
  LogoutOutlined,
  MenuOutlined,
  DashboardOutlined,
} from '@ant-design/icons'
import { useAuthStore } from '../stores/authStore'

const { Header, Content } = Layout

const navItems = [
  { key: '/', icon: <HomeOutlined />, label: '首页' },
  { key: '/tasks', icon: <UnorderedListOutlined />, label: '任务' },
  { key: '/input', icon: <FileTextOutlined />, label: '输入' },
  { key: '/timeline', icon: <ClockCircleOutlined />, label: '时间轴' },
  { key: '/notifications', icon: <BellOutlined />, label: '通知' },
]

export default function AppLayout() {
  const navigate = useNavigate()
  const location = useLocation()
  const { user, logout } = useAuthStore()
  const [unreadCount, setUnreadCount] = React.useState(0)

  React.useEffect(() => {
    // Fetch unread count periodically
    const loadUnread = async () => {
      try {
        const { mockApi, isMockMode } = await import('../services/mockData')
        if (isMockMode()) {
          const res = await mockApi.getUnreadCount()
          setUnreadCount(res.data)
        }
      } catch {
        // ignore
      }
    }
    loadUnread()
    const timer = setInterval(loadUnread, 10000)
    return () => clearInterval(timer)
  }, [])

  const userMenuItems = [
    ...(user?.role === 'ADMIN'
      ? [{ key: 'admin', icon: <DashboardOutlined />, label: '管理后台' }]
      : []),
    { key: 'settings', icon: <SettingOutlined />, label: '设置' },
    { type: 'divider' as const },
    { key: 'logout', icon: <LogoutOutlined />, label: '退出登录', danger: true },
  ]

  const handleUserMenuClick = ({ key }: { key: string }) => {
    if (key === 'admin') {
      navigate('/admin')
    } else if (key === 'settings') {
      navigate('/settings')
    } else if (key === 'logout') {
      logout()
      navigate('/login')
    }
  }

  const handleNavClick = (path: string) => {
    navigate(path)
  }

  return (
    <Layout style={{ minHeight: '100vh' }}>
      {/* Desktop Header */}
      <Header className="hide-on-mobile" style={{
        background: '#fff',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 24px',
        boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
        position: 'sticky',
        top: 0,
        zIndex: 100,
        height: 56,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 32 }}>
          <div
            style={{ fontSize: 20, fontWeight: 700, color: '#1677ff', cursor: 'pointer' }}
            onClick={() => navigate('/')}
          >
            PlanFlowAI
          </div>
          <Menu
            mode="horizontal"
            selectedKeys={[location.pathname]}
            style={{ border: 'none', flex: 1, minWidth: 400 }}
            items={navItems.slice(0, 4).map((item) => ({
              key: item.key,
              icon: item.icon,
              label: item.label,
              onClick: () => navigate(item.key),
            }))}
          />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <Badge count={unreadCount} size="small">
            <BellOutlined
              style={{ fontSize: 18, cursor: 'pointer' }}
              onClick={() => navigate('/notifications')}
            />
          </Badge>
          <Dropdown
            menu={{ items: userMenuItems, onClick: handleUserMenuClick }}
            placement="bottomRight"
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
              <Avatar size={32} icon={<UserOutlined />} />
              <span style={{ fontSize: 14 }}>{user?.nickname || user?.username}</span>
            </div>
          </Dropdown>
        </div>
      </Header>

      {/* Mobile Top Bar */}
      <div className="show-on-mobile" style={{
        background: '#fff',
        padding: '8px 16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        position: 'sticky',
        top: 0,
        zIndex: 100,
        boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
        height: 48,
      }}>
        <div style={{ fontSize: 18, fontWeight: 700, color: '#1677ff' }}>PlanFlowAI</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Badge count={unreadCount} size="small">
            <BellOutlined
              style={{ fontSize: 18, cursor: 'pointer' }}
              onClick={() => navigate('/notifications')}
            />
          </Badge>
          <MenuOutlined style={{ fontSize: 18 }} onClick={() => navigate('/settings')} />
        </div>
      </div>

      {/* Content */}
      <Content style={{ padding: '0 16px 64px', maxWidth: 1200, margin: '0 auto', width: '100%' }}>
        <Outlet />
      </Content>

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
        paddingBottom: 0,
      }}>
        {navItems.map((item) => {
          const isActive = item.key === '/'
            ? location.pathname === '/'
            : location.pathname.startsWith(item.key)
          return (
            <div
              key={item.key}
              onClick={() => handleNavClick(item.key)}
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
              {item.key === '/notifications' ? (
                <Badge count={unreadCount} size="small">
                  <div style={{ fontSize: 20 }}>{item.icon}</div>
                </Badge>
              ) : (
                <div style={{ fontSize: 20 }}>{item.icon}</div>
              )}
              <span>{item.label}</span>
            </div>
          )
        })}
      </div>
    </Layout>
  )
}
