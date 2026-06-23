import React from 'react'
import { Table, Card, Tag, Button, Input, Space, message, Typography, Switch, Spin, Empty } from 'antd'
import { SearchOutlined, UserOutlined } from '@ant-design/icons'
import dayjs from 'dayjs'
import { mockApi, isMockMode } from '../../../services/mockData'
import http from '../../../services/api'
import type { AdminUser } from '../../../services/mockData'

const { Title } = Typography

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
      setUsers((prev) =>
        prev.map((u) =>
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

  const columns = [
    {
      title: '用户名',
      dataIndex: 'username',
      key: 'username',
      render: (text: string) => <strong>{text}</strong>,
    },
    {
      title: '昵称',
      dataIndex: 'nickname',
      key: 'nickname',
    },
    {
      title: '角色',
      dataIndex: 'role',
      key: 'role',
      render: (role: string) => (
        <Tag color={roleColor[role]}>{role === 'ADMIN' ? '管理员' : '普通用户'}</Tag>
      ),
    },
    {
      title: '注册时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (t: string) => dayjs(t).format('YYYY-MM-DD HH:mm'),
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => (
        <Tag color={statusColor[status]}>{statusLabel[status]}</Tag>
      ),
    },
    {
      title: '操作',
      key: 'action',
      render: (_: unknown, record: AdminUser) => (
        <Button
          type={record.status === 'ACTIVE' ? 'default' : 'primary'}
          size="small"
          danger={record.status === 'ACTIVE'}
          loading={toggling === record.id}
          onClick={() => handleToggleStatus(record.id, record.status)}
        >
          {record.status === 'ACTIVE' ? '禁用' : '启用'}
        </Button>
      ),
    },
  ]

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Title level={4} style={{ margin: 0 }}>用户管理</Title>
      </div>

      <Card bodyStyle={{ padding: 12, marginBottom: 16 }}>
        <Input.Search
          placeholder="搜索用户名或昵称..."
          allowClear
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onSearch={(value) => loadUsers(value || undefined)}
          onPressEnter={() => loadUsers(search || undefined)}
          style={{ maxWidth: 400 }}
          prefix={<SearchOutlined />}
        />
      </Card>

      <Card bodyStyle={{ padding: 0 }}>
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
