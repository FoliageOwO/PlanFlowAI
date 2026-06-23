import React from 'react'
import { Card, Row, Col, Statistic, Tag, Table, Typography, Space, Skeleton, Empty } from 'antd'
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
import relativeTime from 'dayjs/plugin/relativeTime'
import 'dayjs/locale/zh-cn'
import { mockApi, isMockMode } from '../../../services/mockData'
import http from '../../../services/api'
import type { AdminStats } from '../../../services/mockData'

dayjs.extend(relativeTime)
dayjs.locale('zh-cn')

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

const sourceTypeLabel: Record<string, string> = {
  TEXT: '文本',
  IMAGE: '图片',
  FILE: '文件',
  AUDIO: '音频',
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
        // silent
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  if (loading) {
    return (
      <div style={{ padding: '24px 0' }}>
        <Skeleton active paragraph={{ rows: 2 }} style={{ marginBottom: 16 }} />
        <Skeleton active paragraph={{ rows: 4 }} />
      </div>
    )
  }

  if (!stats) {
    return (
      <Card>
        <Empty description="无法加载统计数据" image={Empty.PRESENTED_IMAGE_SIMPLE}>
          <a onClick={() => window.location.reload()}>刷新页面</a>
        </Empty>
      </Card>
    )
  }

  const healthItems = [
    { label: 'API 服务', key: 'api' as const, icon: <ApiOutlined /> },
    { label: '数据库', key: 'database' as const, icon: <DatabaseOutlined /> },
    { label: 'OCR 服务', key: 'ocr' as const, icon: <CloudServerOutlined /> },
  ]

  const recentColumns = [
    { title: 'ID', dataIndex: 'id', key: 'id', width: 100 },
    { title: '用户', dataIndex: 'userName', key: 'userName' },
    {
      title: '来源', dataIndex: 'sourceType', key: 'sourceType',
      render: (s: string) => <Tag>{sourceTypeLabel[s] || s}</Tag>,
    },
    {
      title: '状态', dataIndex: 'status', key: 'status',
      render: (s: string) => <Tag color={statusColor[s]}>{statusLabel[s] || s}</Tag>,
    },
    {
      title: '时间', dataIndex: 'createdAt', key: 'createdAt',
      render: (t: string) => (
        <Text style={{ fontSize: 12 }}>{dayjs(t).format('HH:mm:ss')}</Text>
      ),
    },
  ]

  const successRate = stats.todayParseJobs > 0
    ? ((stats.todaySuccessCount / stats.todayParseJobs) * 100).toFixed(1)
    : '0.0'

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <Title level={4} style={{ margin: 0, marginBottom: 4 }}>📊 系统状态概览</Title>
        <Text style={{ color: '#999', fontSize: 13 }}>
          今日解析成功率 {successRate}%
        </Text>
      </div>

      {/* Stats Cards */}
      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={12} sm={6}>
          <Card hoverable size="small" bodyStyle={{ padding: '16px 20px' }}>
            <Statistic
              title={<span style={{ fontSize: 13, color: '#666' }}>今日注册</span>}
              value={stats.todayRegistrations}
              prefix={<UserAddOutlined style={{ color: 'var(--primary)' }} />}
              valueStyle={{ fontSize: 28, fontWeight: 700, color: 'var(--primary)' }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card hoverable size="small" bodyStyle={{ padding: '16px 20px' }}>
            <Statistic
              title={<span style={{ fontSize: 13, color: '#666' }}>解析任务</span>}
              value={stats.todayParseJobs}
              prefix={<FileTextOutlined style={{ color: '#722ed1' }} />}
              valueStyle={{ fontSize: 28, fontWeight: 700, color: '#722ed1' }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card hoverable size="small" bodyStyle={{ padding: '16px 20px' }}>
            <Statistic
              title={<span style={{ fontSize: 13, color: '#666' }}>成功</span>}
              value={stats.todaySuccessCount}
              prefix={<CheckCircleOutlined style={{ color: 'var(--success)' }} />}
              valueStyle={{ fontSize: 28, fontWeight: 700, color: 'var(--success)' }}
              suffix={
                <Text style={{ fontSize: 14, color: '#999' }}>/ {stats.todayParseJobs}</Text>
              }
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card hoverable size="small" bodyStyle={{ padding: '16px 20px' }}>
            <Statistic
              title={<span style={{ fontSize: 13, color: '#666' }}>失败</span>}
              value={stats.todayFailCount}
              prefix={<CloseCircleOutlined style={{ color: 'var(--danger)' }} />}
              valueStyle={{ fontSize: 28, fontWeight: 700, color: stats.todayFailCount > 0 ? 'var(--danger)' : undefined }}
            />
          </Card>
        </Col>
      </Row>

      {/* System Health */}
      <Card
        title={<Space><ApiOutlined /> 系统健康状态</Space>}
        style={{ marginBottom: 16 }}
        size="small"
      >
        <Row gutter={[12, 12]}>
          {healthItems.map((item) => (
            <Col xs={24} sm={8} key={item.key}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '12px 16px',
                background: stats.systemHealth[item.key] ? '#f6ffed' : '#fff2f0',
                borderRadius: 'var(--radius-sm)',
                border: `1px solid ${stats.systemHealth[item.key] ? '#b7eb8f' : '#ffccc7'}`,
              }}>
                <Space>
                  <span style={{ fontSize: 16, color: stats.systemHealth[item.key] ? 'var(--success)' : 'var(--danger)' }}>
                    {item.icon}
                  </span>
                  <Text strong style={{ fontSize: 13 }}>{item.label}</Text>
                </Space>
                <Tag
                  icon={stats.systemHealth[item.key] ? <CheckCircleFilled /> : <CloseCircleFilled />}
                  color={stats.systemHealth[item.key] ? 'success' : 'error'}
                  style={{ margin: 0 }}
                >
                  {stats.systemHealth[item.key] ? '正常' : '异常'}
                </Tag>
              </div>
            </Col>
          ))}
        </Row>
      </Card>

      {/* Recent Jobs */}
      <Card title={<Space><FileTextOutlined /> 最近解析任务</Space>} size="small">
        <Table
          dataSource={stats.recentJobs}
          columns={recentColumns}
          rowKey="id"
          pagination={false}
          size="small"
          style={{ fontSize: 13 }}
        />
      </Card>
    </div>
  )
}

