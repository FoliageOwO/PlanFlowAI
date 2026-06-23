import React from 'react'
import {
  List, Card, Tag, Input, Radio, Space, Empty, Spin, Modal, Form, DatePicker,
  Select, InputNumber, message, Typography, Button, Tooltip, Row, Col, Statistic, Skeleton
} from 'antd'
import {
  PlusOutlined, FileTextOutlined, PictureOutlined, FileOutlined,
  AudioOutlined, SearchOutlined, FilterOutlined, SortAscendingOutlined,
  CalendarOutlined, FireOutlined, ExclamationCircleOutlined,
  CheckCircleOutlined, ArrowRightOutlined,
} from '@ant-design/icons'
import { useNavigate, useSearchParams } from 'react-router-dom'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import 'dayjs/locale/zh-cn'
import { mockApi, isMockMode } from '../../services/mockData'
import http from '../../services/api'
import type { TaskItem } from '../../services/mockData'

dayjs.extend(relativeTime)
dayjs.locale('zh-cn')

const { Search } = Input
const { Text, Title } = Typography
const { TextArea } = Input

const priorityConfig: Record<string, { color: string; label: string }> = {
  URGENT: { color: 'red', label: '紧急' },
  HIGH: { color: 'orange', label: '高' },
  MEDIUM: { color: 'blue', label: '中' },
  LOW: { color: 'default', label: '低' },
}

const statusConfig: Record<string, { color: string; label: string }> = {
  TODO: { color: 'default', label: '待处理' },
  DOING: { color: 'processing', label: '进行中' },
  DONE: { color: 'success', label: '已完成' },
  CANCELLED: { color: 'default', label: '已取消' },
}

const sourceIcon: Record<string, React.ReactNode> = {
  TEXT: <FileTextOutlined />,
  IMAGE: <PictureOutlined />,
  FILE: <FileOutlined />,
  AUDIO: <AudioOutlined />,
}

const filterOptions = [
  { label: '全部', value: 'all' },
  { label: '今天', value: 'today' },
  { label: '即将截止', value: 'due' },
  { label: '已过期', value: 'overdue' },
  { label: '已完成', value: 'done' },
]

export default function TaskList() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [tasks, setTasks] = React.useState<TaskItem[]>([])
  const [loading, setLoading] = React.useState(true)
  const [filter, setFilter] = React.useState(searchParams.get('filter') || 'all')
  const [search, setSearch] = React.useState('')
  const [modalOpen, setModalOpen] = React.useState(false)
  const [submitting, setSubmitting] = React.useState(false)
  const [form] = Form.useForm()
  const [page, setPage] = React.useState(1)
  const [total, setTotal] = React.useState(0)
  const pageSize = 20

  const loadTasks = React.useCallback(async (p?: number) => {
    setLoading(true)
    try {
      const params: Record<string, any> = {
        page: p || page,
        pageSize,
      }
      if (filter !== 'all') params.filter = filter
      if (search) params.search = search

      if (isMockMode()) {
        const res = await mockApi.getTaskList(params)
        setTasks(res.data.list)
        setTotal(res.data.total)
      } else {
        const res: any = await http.get('/tasks', { params })
        setTasks(res.data.list)
        setTotal(res.data.total)
      }
    } catch {
      // silent
    } finally {
      setLoading(false)
    }
  }, [filter, search, page])

  React.useEffect(() => { loadTasks() }, [loadTasks])

  const handleCreate = async (values: any) => {
    setSubmitting(true)
    try {
      const taskData = {
        title: values.title,
        description: values.description || '',
        deadline: values.deadline.format('YYYY-MM-DD HH:mm:ss'),
        priority: values.priority || 'MEDIUM',
        estimatedHours: values.estimatedHours || 0,
      }
      if (isMockMode()) {
        await mockApi.createTask(taskData)
      } else {
        await http.post('/tasks', taskData)
      }
      message.success('任务创建成功')
      setModalOpen(false)
      form.resetFields()
      loadTasks()
    } catch {
      message.error('创建失败')
    } finally {
      setSubmitting(false)
    }
  }

  const getDeadlineInfo = (task: TaskItem) => {
    if (task.status === 'DONE') return { text: '', type: 'secondary' as const }
    const d = dayjs(task.deadline)
    const now = dayjs()
    if (d.isBefore(now)) {
      const days = Math.abs(d.diff(now, 'day'))
      return { text: `已逾期 ${days} 天`, type: 'danger' as const }
    }
    if (d.isSame(now, 'day')) return { text: '今天截止', type: 'warning' as const }
    if (d.diff(now, 'day') <= 3) return { text: `${d.diff(now, 'day')} 天后截止`, type: 'warning' as const }
    return { text: d.format('MM-DD HH:mm'), type: 'secondary' as const }
  }

  const stats = React.useMemo(() => {
    const all = tasks
    return {
      total: total,
      overdue: all.filter(t => dayjs(t.deadline).isBefore(dayjs()) && t.status !== 'DONE').length,
      done: all.filter(t => t.status === 'DONE').length,
      inProgress: all.filter(t => t.status === 'DOING').length,
    }
  }, [tasks, total])

  return (
    <div className="page-container" style={{ padding: '16px 0' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <Title level={4} style={{ margin: 0 }}>📋 任务列表</Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setModalOpen(true)}>
          新建任务
        </Button>
      </div>

      {/* Stats */}
      <Row gutter={[12, 12]} style={{ marginBottom: 16 }}>
        <Col xs={8} sm={4}>
          <Card size="small" bodyStyle={{ padding: '10px 14px', textAlign: 'center' }}>
            <Statistic title="全部" value={stats.total} valueStyle={{ fontSize: 20, fontWeight: 700 }} />
          </Card>
        </Col>
        <Col xs={8} sm={4}>
          <Card size="small" bodyStyle={{ padding: '10px 14px', textAlign: 'center' }}>
            <Statistic title="进行中" value={stats.inProgress} valueStyle={{ fontSize: 20, fontWeight: 700, color: 'var(--primary)' }} />
          </Card>
        </Col>
        <Col xs={8} sm={4}>
          <Card size="small" bodyStyle={{ padding: '10px 14px', textAlign: 'center' }}>
            <Statistic title="已过期" value={stats.overdue} valueStyle={{ fontSize: 20, fontWeight: 700, color: stats.overdue > 0 ? 'var(--danger)' : undefined }} />
          </Card>
        </Col>
        <Col xs={8} sm={4}>
          <Card size="small" bodyStyle={{ padding: '10px 14px', textAlign: 'center' }}>
            <Statistic title="已完成" value={stats.done} valueStyle={{ fontSize: 20, fontWeight: 700, color: 'var(--success)' }} />
          </Card>
        </Col>
      </Row>

      {/* Filter & Search */}
      <Card style={{ marginBottom: 16 }} bodyStyle={{ padding: 12 }}>
        <Space direction="vertical" style={{ width: '100%' }} size={12}>
          <Radio.Group
            value={filter}
            onChange={(e) => { setFilter(e.target.value); setPage(1) }}
            optionType="button"
            buttonStyle="solid"
            size="middle"
          >
            {filterOptions.map((opt) => (
              <Radio.Button key={opt.value} value={opt.value}>{opt.label}</Radio.Button>
            ))}
          </Radio.Group>
          <Search
            placeholder="搜索任务标题..."
            allowClear
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1) }}
            onSearch={() => loadTasks()}
            onPressEnter={() => loadTasks()}
            style={{ maxWidth: 400 }}
            prefix={<SearchOutlined style={{ color: '#999' }} />}
          />
        </Space>
      </Card>

      {/* Task List */}
      <Spin spinning={loading}>
        {tasks.length > 0 ? (
          <List
            dataSource={tasks}
            pagination={{
              current: page,
              pageSize,
              total,
              onChange: (p) => setPage(p),
              showSizeChanger: false,
              size: 'small',
            }}
            renderItem={(task) => {
              const deadlineInfo = getDeadlineInfo(task)
              const priConfig = priorityConfig[task.priority]
              const stConfig = statusConfig[task.status]
              return (
                <List.Item
                  onClick={() => navigate(`/tasks/${task.id}`)}
                  style={{
                    cursor: 'pointer',
                    padding: '14px 16px',
                    border: '1px solid var(--border-light)',
                    borderRadius: 'var(--radius-sm)',
                    marginBottom: 8,
                    background: '#fff',
                    transition: 'all 0.2s',
                    position: 'relative',
                    overflow: 'hidden',
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.borderColor = 'var(--primary)'
                    e.currentTarget.style.boxShadow = 'var(--shadow-sm)'
                    e.currentTarget.style.transform = 'translateY(-1px)'
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.borderColor = 'var(--border-light)'
                    e.currentTarget.style.boxShadow = 'none'
                    e.currentTarget.style.transform = 'translateY(0)'
                  }}
                >
                  <div className={`priority-bar priority-${task.priority.toLowerCase()}`} />
                  <List.Item.Meta
                    avatar={
                      <div style={{
                        width: 40,
                        height: 40,
                        borderRadius: 'var(--radius-sm)',
                        background: 'var(--primary-bg)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 18,
                        color: 'var(--primary)',
                      }}>
                        {sourceIcon[task.sourceType] || <FileTextOutlined />}
                      </div>
                    }
                    title={
                      <Space style={{ flexWrap: 'wrap' }}>
                        <Text strong style={{ fontSize: 15 }}>
                          {task.title}
                        </Text>
                        <Tag color={priConfig.color} style={{ fontSize: 11, lineHeight: '20px' }}>
                          {priConfig.label}
                        </Tag>
                        <Tag color={stConfig.color} style={{ fontSize: 11, lineHeight: '20px' }}>
                          {stConfig.label}
                        </Tag>
                      </Space>
                    }
                    description={
                      <Space size={16}>
                        <Text
                          type={deadlineInfo.type}
                          style={{ fontSize: 12 }}
                        >
                          <CalendarOutlined style={{ marginRight: 4 }} />
                          {deadlineInfo.text}
                        </Text>
                        {task.checklist.length > 0 && (
                          <Text style={{ fontSize: 12, color: '#999' }}>
                            <CheckCircleOutlined style={{ marginRight: 4 }} />
                            {task.checklist.filter(c => c.done).length}/{task.checklist.length}
                          </Text>
                        )}
                        {task.description && (
                          <Text style={{ fontSize: 12, color: '#999' }} ellipsis={{ tooltip: task.description }}>
                            {task.description.slice(0, 60)}
                          </Text>
                        )}
                      </Space>
                    }
                  />
                </List.Item>
              )
            }}
          />
        ) : (
          <Empty
            description={filter === 'all' ? '暂无任务' : `没有${filterOptions.find(f => f.value === filter)?.label}任务`}
            image={Empty.PRESENTED_IMAGE_SIMPLE}
          >
            <Button type="primary" icon={<PlusOutlined />} onClick={() => setModalOpen(true)}>
              新建任务
            </Button>
          </Empty>
        )}
      </Spin>

      {/* FAB - Create Task (mobile) */}
      <Tooltip title="新建任务">
        <Button
          type="primary"
          shape="circle"
          size="large"
          icon={<PlusOutlined />}
          style={{
            position: 'fixed',
            bottom: 80,
            right: 24,
            width: 56,
            height: 56,
            zIndex: 1000,
            boxShadow: 'var(--shadow-lg)',
            fontSize: 24,
          }}
          onClick={() => setModalOpen(true)}
        />
      </Tooltip>

      {/* Create Task Modal */}
      <Modal
        title="新建任务"
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        footer={null}
        width={520}
        destroyOnClose
      >
        <Form form={form} layout="vertical" onFinish={handleCreate}>
          <Form.Item name="title" label="任务标题" rules={[{ required: true, message: '请输入标题' }]}>
            <Input placeholder="输入任务标题" size="large" />
          </Form.Item>
          <Form.Item name="description" label="描述">
            <TextArea rows={3} placeholder="输入任务描述（可选）" />
          </Form.Item>
          <Form.Item name="deadline" label="截止时间" rules={[{ required: true, message: '请选择截止时间' }]}>
            <DatePicker showTime style={{ width: '100%' }} size="large" />
          </Form.Item>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="priority" label="优先级" initialValue="MEDIUM">
                <Select size="large">
                  <Select.Option value="URGENT">🔥 紧急</Select.Option>
                  <Select.Option value="HIGH">⚡ 高</Select.Option>
                  <Select.Option value="MEDIUM">📌 中</Select.Option>
                  <Select.Option value="LOW">📎 低</Select.Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="estimatedHours" label="预估耗时（小时）" initialValue={0}>
                <InputNumber min={0} style={{ width: '100%' }} size="large" />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item style={{ marginBottom: 0 }}>
            <Button type="primary" htmlType="submit" block size="large" loading={submitting}>
              创建任务
            </Button>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}
