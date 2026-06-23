import React from 'react'
import { Card, Row, Col, Statistic, Tag, Table, Spin, Typography, Empty, Space } from 'antd'
import {
  UserAddOutlined,
  FileTextOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  CheckCircleFilled,
  CloseCircleFilled,
  ApiOutlined,
  DatabaseOutlined,
  CloudServerOutlined,
} from '@ant-design/icons'
import dayjs from 'dayjs'
import { mockApi, isMockMode } from '../../../services/mockData'
import http from '../../../services/api'
import type { AdminStats } from '../../../services/mockData'

const { Title, Text } = Typography

const statusColor: Record<string, string> = {
  COMPLETED: 'success',
  FAILED: 'error',
  AI_PARSING: 'processing',
  TEXT_EXTRACTED: 'processing',
  UPLOADED: 'default',
}

const statusLabel: Record<string, string> = {
  COMPLETED: '已完成',
  FAILED: '失败',
  AI_PARSING: 'AI解析中',
  TEXT_EXTRACTED: '文本提取中',
  UPLOADED: '已上传',
}

export default function AdminDashboard() {
  const [stats, setStats] = React.useState<AdminStats | null>(null)
  const [loading, setLoading] = React.useState(true)

  React.useEffect(() => {
    const load = async () => {
      setLoading(true)
      try {
        if (isMockMode()) {
          const res = await mockApi.getAdminStats()
          if (res.code === 0) setStats(res.data)
        } else {
          const res: any = await http.get('/admin/stats')
          setStats(res.data)
        }
      } catch {
        // ignore
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: 80 }}>
        <Spin size="large" />
      </div>
    )
  }

  if (!stats) {
    return <Empty description="无法加载统计数据" image={Empty.PRESENTED_IMAGE_SIMPLE} />
  }

  const healthItems = [
    { label: 'API 服务', key: 'api' as const, icon: <ApiOutlined /> },
    { label: '数据库', key: 'database' as const, icon: <DatabaseOutlined /> },
    { label: 'OCR 服务', key: 'ocr' as const, icon: <CloudServerOutlined /> },
  ]

  const recentColumns = [
    { title: 'ID', dataIndex: 'id', key: 'id', width: 100 },
    { title: '用户', dataIndex: 'userName', key: 'userName' },
    { title: '来源类型', dataIndex: 'sourceType', key: 'sourceType' },
    {
      title: '状态', dataIndex: 'status', key: 'status',
      render: (s: string) => <Tag color={statusColor[s]}>{statusLabel[s] || s}</Tag>,
    },
    {
      title: '时间', dataIndex: 'createdAt', key: 'createdAt',
      render: (t: string) => dayjs(t).format('HH:mm:ss'),
    },
  ]

  return (
    <div>
      <Title level={4} style={{ marginBottom: 16 }}>系统状态概览</Title>

      {/* Stats Cards */}
      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={12} sm={6}>
          <Card hoverable>
            <Statistic
              title="今日注册用户"
              value={stats.todayRegistrations}
              prefix={<UserAddOutlined style={{ color: '#1677ff' }} />}
              valueStyle={{ color: '#1677ff' }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card hoverable>
            <Statistic
              title="今日解析任务"
              value={stats.todayParseJobs}
              prefix={<FileTextOutlined style={{ color: '#722ed1' }} />}
              valueStyle={{ color: '#722ed1' }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card hoverable>
            <Statistic
              title="解析成功"
              value={stats.todaySuccessCount}
              prefix={<CheckCircleOutlined style={{ color: '#52c41a' }} />}
              valueStyle={{ color: '#52c41a' }}
              suffix={
                <Text style={{ fontSize: 14, color: '#999' }}>
                  / {stats.todayParseJobs}
                </Text>
              }
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card hoverable>
            <Statistic
              title="解析失败"
              value={stats.todayFailCount}
              prefix={<CloseCircleOutlined style={{ color: '#ff4d4f' }} />}
              valueStyle={{ color: '#ff4d4f' }}
            />
          </Card>
        </Col>
      </Row>

      {/* System Health */}
      <Card title="系统健康状态" style={{ marginBottom: 16 }} size="small">
        <Row gutter={[16, 16]}>
          {healthItems.map((item) => (
            <Col xs={24} sm={8} key={item.key}>
              <Card size="small">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Space>
                    {item.icon}
                    <Text>{item.label}</Text>
                  </Space>
                  <Tag
                    icon={stats.systemHealth[item.key] ? <CheckCircleFilled /> : <CloseCircleFilled />}
                    color={stats.systemHealth[item.key] ? 'success' : 'error'}
                  >
                    {stats.systemHealth[item.key] ? '正常' : '异常'}
                  </Tag>
                </div>
              </Card>
            </Col>
          ))}
        </Row>
      </Card>

      {/* Recent Jobs */}
      <Card title="最近解析任务" size="small">
        <Table
          dataSource={stats.recentJobs}
          columns={recentColumns}
          rowKey="id"
          pagination={false}
          size="small"
        />
      </Card>
    </div>
  )
}

