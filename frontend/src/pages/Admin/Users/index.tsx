import React from 'react'
import { Table, Card, Tag, Button, Input, Space, message, Typography, Empty, Avatar, Statistic, Row, Col } from 'antd'
import { SearchOutlined, UserOutlined, TeamOutlined, UserAddOutlined, StopOutlined, CheckCircleOutlined } from '@ant-design/icons'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import 'dayjs/locale/zh-cn'
import { mockApi, isMockMode } from '../../../services/mockData'
import http from '../../../services/api'
import type { AdminUser } from '../../../services/mockData'

dayjs.extend(relativeTime)
dayjs.locale('zh-cn')

const { Title, Text } = Typography

const roleColor: Record<string, string> = {
  ADMIN: 'red',
  USER: 'blue',
}

const statusColor: Record<string, string> = {
  ACTIVE: 'success',
  DISABLED: 'error',
}

const statusLabel: Record<string, string> = {
  ACTIVE: '正常',
  DISABLED: '已禁用',
}

export default function AdminUsers() {
  const [users, setUsers] = React.useState<AdminUser[]>([])
  const [loading, setLoading] = React.useState(true)
  const [search, setSearch] = React.useState('')
  const [toggling, setToggling] = React.useState<string | null>(null)

  const loadUsers = React.useCallback(async (searchValue?: string) => {
    setLoading(true)
    try {
      const params = searchValue ? { search: searchValue } : undefined
      if (isMockMode()) {
        const res = await mockApi.getAdminUsers(params)
        if (res.code === 0) setUsers(res.data.list)
      } else {
        const res: any = await http.get('/admin/users', { params })
        setUsers(res.data.list)
      }
    } catch {
      message.error('获取用户列表失败')
    } finally {
      setLoading(false)
    }
  }, [])

  React.useEffect(() => { loadUsers() }, [loadUsers])

  const handleToggleStatus = async (userId: string, currentStatus: string) => {
    setToggling(userId)
    try {
      if (isMockMode()) {
        await mockApi.toggleUserStatus(userId)
      } else {
        await http.put(`/admin/users/${userId}/toggle`)
      }
      setUsers(prev =>
        prev.map(u =>
          u.id === userId
            ? { ...u, status: currentStatus === 'ACTIVE' ? 'DISABLED' : 'ACTIVE' }
            : u,
        ),
      )
      message.success(`用户状态已${currentStatus === 'ACTIVE' ? '禁用' : '启用'}`)
    } catch {
      message.error('操作失败')
    } finally {
      setToggling(null)
    }
  }

  const stats = React.useMemo(() => {
    const total = users.length
    const active = users.filter(u => u.status === 'ACTIVE').length
    const admins = users.filter(u => u.role === 'ADMIN').length
    return { total, active, disabled: total - active, admins }
  }, [users])

  const columns = [
    {
      title: '用户',
      key: 'user',
      render: (_: unknown, record: AdminUser) => (
        <Space>
          <Avatar
            size={32}
            style={{
              background: record.role === 'ADMIN'
                ? 'linear-gradient(135deg, #1677ff, #4096ff)'
                : 'linear-gradient(135deg, #52c41a, #73d13d)',
              fontSize: 14,
              fontWeight: 600,
            }}
          >
            {(record.nickname || record.username)[0].toUpperCase()}
          </Avatar>
          <div>
            <Text strong style={{ fontSize: 14 }}>{record.nickname}</Text>
            <br />
            <Text style={{ fontSize: 12, color: '#999' }}>@{record.username}</Text>
          </div>
        </Space>
      ),
    },
    {
      title: '角色',
      dataIndex: 'role',
      key: 'role',
      width: 100,
      render: (role: string) => (
        <Tag color={roleColor[role]} style={{ fontSize: 11 }}>
          {role === 'ADMIN' ? '管理员' : '普通用户'}
        </Tag>
      ),
    },
    {
      title: '注册时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 160,
      render: (t: string) => (
        <Text style={{ fontSize: 12 }}>{dayjs(t).format('YYYY-MM-DD HH:mm')}</Text>
      ),
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (s: string) => (
        <Tag color={statusColor[s]} icon={s === 'ACTIVE' ? <CheckCircleOutlined /> : <StopOutlined />}>
          {statusLabel[s]}
        </Tag>
      ),
    },
    {
      title: '操作',
      key: 'action',
      width: 100,
      render: (_: unknown, record: AdminUser) => (
        <Button
          type={record.status === 'ACTIVE' ? 'default' : 'primary'}
          size="small"
          danger={record.status === 'ACTIVE'}
          loading={toggling === record.id}
          onClick={() => handleToggleStatus(record.id, record.status)}
          style={{ borderRadius: 'var(--radius-sm)' }}
        >
          {record.status === 'ACTIVE' ? '禁用' : '启用'}
        </Button>
      ),
    },
  ]

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <Title level={4} style={{ margin: 0, marginBottom: 4 }}>👥 用户管理</Title>
        <Text style={{ color: '#999', fontSize: 13 }}>共 {stats.total} 个用户，{stats.active} 个活跃</Text>
      </div>

      {/* Stats */}
      <Row gutter={[12, 12]} style={{ marginBottom: 16 }}>
        <Col xs={8}>
          <Card size="small" bodyStyle={{ padding: '12px 16px', textAlign: 'center' }}>
            <Statistic title="总用户" value={stats.total} valueStyle={{ fontSize: 22, fontWeight: 700 }} />
          </Card>
        </Col>
        <Col xs={8}>
          <Card size="small" bodyStyle={{ padding: '12px 16px', textAlign: 'center' }}>
            <Statistic title="活跃" value={stats.active} valueStyle={{ fontSize: 22, fontWeight: 700, color: 'var(--success)' }} />
          </Card>
        </Col>
        <Col xs={8}>
          <Card size="small" bodyStyle={{ padding: '12px 16px', textAlign: 'center' }}>
            <Statistic title="管理员" value={stats.admins} valueStyle={{ fontSize: 22, fontWeight: 700, color: 'var(--primary)' }} />
          </Card>
        </Col>
      </Row>

      {/* Search */}
      <Card bodyStyle={{ padding: 12, marginBottom: 16 }} style={{ borderRadius: 'var(--radius-md)' }}>
        <Input.Search
          placeholder="搜索用户名或昵称..."
          allowClear
          value={search}
          onChange={e => setSearch(e.target.value)}
          onSearch={value => loadUsers(value || undefined)}
          onPressEnter={() => loadUsers(search || undefined)}
          style={{ maxWidth: 400 }}
          prefix={<SearchOutlined style={{ color: '#999' }} />}
        />
      </Card>

      {/* Table */}
      <Card bodyStyle={{ padding: 0 }} style={{ borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
        <Table
          dataSource={users}
          columns={columns}
          rowKey="id"
          loading={loading}
          pagination={false}
          size="middle"
          locale={{ emptyText: <Empty description="暂无用户" image={Empty.PRESENTED_IMAGE_SIMPLE} /> }}
        />
      </Card>
    </div>
  )
}
