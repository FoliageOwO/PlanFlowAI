import React from 'react'
import { Layout, Badge, Dropdown, Avatar, Menu } from 'antd'
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
  AppstoreOutlined,
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

const headerNavItems = navItems.slice(0, 4)

export default function AppLayout() {
  const navigate = useNavigate()
  const location = useLocation()
  const { user, logout } = useAuthStore()
  const [unreadCount, setUnreadCount] = React.useState(0)

  React.useEffect(() => {
    // Fetch unread count on mount and periodically
    const loadUnread = async () => {
      try {
        const { mockApi, isMockMode } = await import('../services/mockData')
        if (isMockMode()) {
          const res = await mockApi.getUnreadCount()
          setUnreadCount(res.data)
        }
      } catch {
        // silent
      }
    }
    loadUnread()
    const timer = setInterval(loadUnread, 10000)
    return () => clearInterval(timer)
  }, [])

  const userMenuItems = [
    {
      key: 'profile',
      icon: <UserOutlined />,
      label: (
        <div style={{ lineHeight: 1.4 }}>
          <div style={{ fontWeight: 600 }}>{user?.nickname || user?.username}</div>
          <div style={{ fontSize: 12, color: '#999' }}>{user?.role === 'ADMIN' ? '管理员' : '用户'}</div>
        </div>
      ),
      disabled: true,
      style: { cursor: 'default', padding: '8px 12px' },
    },
    { type: 'divider' as const },
    ...(user?.role === 'ADMIN'
      ? [{ key: 'admin', icon: <DashboardOutlined />, label: '管理后台' }]
      : []),
    { key: 'settings', icon: <SettingOutlined />, label: '设置' },
    { type: 'divider' as const },
    { key: 'logout', icon: <LogoutOutlined />, label: '退出登录', danger: true },
  ]

  const handleUserMenuClick = ({ key }: { key: string }) => {
    if (key === 'admin') navigate('/admin')
    else if (key === 'settings') navigate('/settings')
    else if (key === 'logout') { logout(); navigate('/login') }
  }

  const isActive = (path: string) =>
    path === '/' ? location.pathname === '/' : location.pathname.startsWith(path)

  return (
    <Layout style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      {/* ─── Desktop Header ─── */}
      <Header className="hide-on-mobile" style={{
        background: '#fff',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 24px',
        boxShadow: 'var(--shadow-sm)',
        position: 'sticky',
        top: 0,
        zIndex: 100,
        height: 56,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 32 }}>
          {/* Logo */}
          <div
            style={{
              fontSize: 20,
              fontWeight: 700,
              background: 'linear-gradient(135deg, var(--primary), var(--primary-light))',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              cursor: 'pointer',
              letterSpacing: -0.5,
            }}
            onClick={() => navigate('/')}
          >
            PlanFlowAI
          </div>
          {/* Nav */}
          <Menu
            mode="horizontal"
            selectedKeys={[location.pathname]}
            style={{ border: 'none', flex: 1, minWidth: 400, background: 'transparent' }}
            items={headerNavItems.map(item => ({
              key: item.key,
              icon: item.icon,
              label: item.label,
              onClick: () => navigate(item.key),
            }))}
          />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          <Badge count={unreadCount} size="small" offset={[-2, 2]}>
            <BellOutlined
              style={{ fontSize: 20, cursor: 'pointer', color: '#666', transition: 'color 0.2s' }}
              onClick={() => navigate('/notifications')}
              onMouseEnter={e => (e.currentTarget.style.color = 'var(--primary)')}
              onMouseLeave={e => (e.currentTarget.style.color = '#666')}
            />
          </Badge>
          <Dropdown menu={{ items: userMenuItems, onClick: handleUserMenuClick }} placement="bottomRight">
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              cursor: 'pointer',
              padding: '2px 8px',
              borderRadius: 'var(--radius-sm)',
              transition: 'background 0.2s',
            }}
              className="user-dropdown-trigger"
            >
              <Avatar
                size={32}
                style={{
                  background: user?.role === 'ADMIN'
                    ? 'linear-gradient(135deg, #1677ff, #4096ff)'
                    : 'linear-gradient(135deg, #52c41a, #73d13d)',
                  fontWeight: 600,
                  fontSize: 14,
                }}
              >
                {(user?.nickname || user?.username || '?')[0].toUpperCase()}
              </Avatar>
              <span style={{ fontSize: 14, fontWeight: 500, color: '#333' }}>
                {user?.nickname || user?.username}
              </span>
            </div>
          </Dropdown>
        </div>
      </Header>

      {/* ─── Mobile Top Bar ─── */}
      <div className="show-on-mobile" style={{
        background: '#fff',
        padding: '8px 16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        position: 'sticky',
        top: 0,
        zIndex: 100,
        boxShadow: 'var(--shadow-sm)',
        height: 48,
      }}>
        <div style={{
          fontSize: 18,
          fontWeight: 700,
          background: 'linear-gradient(135deg, var(--primary), var(--primary-light))',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
        }}>
          PlanFlowAI
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Badge count={unreadCount} size="small">
            <BellOutlined
              style={{ fontSize: 20, cursor: 'pointer', color: '#666' }}
              onClick={() => navigate('/notifications')}
            />
          </Badge>
          <MenuOutlined
            style={{ fontSize: 20, cursor: 'pointer', color: '#666' }}
            onClick={() => navigate('/settings')}
          />
        </div>
      </div>

      {/* ─── Main Content ─── */}
      <Content style={{
        padding: '0 16px 80px',
        maxWidth: 'var(--max-width)',
        margin: '0 auto',
        width: '100%',
        minHeight: 'calc(100vh - 56px)',
      }}>
        <Outlet />
      </Content>

      {/* ─── Mobile Bottom Nav ─── */}
      <div className="show-on-mobile" style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        background: '#fff',
        borderTop: '1px solid var(--border-light)',
        display: 'flex',
        justifyContent: 'space-around',
        alignItems: 'center',
        height: 56,
        zIndex: 100,
        paddingBottom: 0,
        boxShadow: '0 -2px 8px rgba(0,0,0,0.06)',
      }}>
        {navItems.map(item => {
          const active = isActive(item.key)
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
                color: active ? 'var(--primary)' : '#999',
                fontSize: 10,
                transition: 'color 0.2s',
                position: 'relative',
              }}
            >
              {item.key === '/notifications' ? (
                <Badge count={unreadCount} size="small" offset={[4, -2]}>
                  <div style={{ fontSize: 20, lineHeight: 1 }}>{item.icon}</div>
                </Badge>
              ) : (
                <div style={{
                  fontSize: 20,
                  lineHeight: 1,
                  transition: 'transform 0.2s',
                }}>
                  {item.icon}
                </div>
              )}
              <span style={{
                fontWeight: active ? 600 : 400,
                fontSize: 10,
                marginTop: 2,
              }}>
                {item.label}
              </span>
              {active && (
                <div style={{
                  position: 'absolute',
                  top: 0,
                  left: '50%',
                  transform: 'translateX(-50%)',
                  width: 20,
                  height: 2,
                  background: 'var(--primary)',
                  borderRadius: '0 0 2px 2px',
                }} />
              )}
            </div>
          )
        })}
      </div>
    </Layout>
  )
}
