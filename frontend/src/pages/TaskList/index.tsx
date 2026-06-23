import React from 'react'
import { List, Card, Tag, Input, Radio, Space, Empty, Spin, Modal, Form, DatePicker, Select, InputNumber, message, Typography, Button as AntButton } from 'antd'
import { PlusOutlined, FileTextOutlined, PictureOutlined, FileOutlined, AudioOutlined } from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import dayjs from 'dayjs'
import { mockApi, isMockMode } from '../../services/mockData'
import http from '../../services/api'
import type { TaskItem } from '../../services/mockData'

const { Search } = Input
const { Text, Title } = Typography
const { TextArea } = Input

const priorityColor: Record<string, string> = {
  URGENT: 'red',
  HIGH: 'orange',
  MEDIUM: 'blue',
  LOW: 'default',
}

const statusColor: Record<string, string> = {
  TODO: 'default',
  DOING: 'processing',
  DONE: 'success',
  CANCELLED: 'default',
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
  const [tasks, setTasks] = React.useState<TaskItem[]>([])
  const [loading, setLoading] = React.useState(true)
  const [filter, setFilter] = React.useState('all')
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
      const params = { filter: filter === 'all' ? undefined : filter, search: search || undefined, page: p || page, pageSize }
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
      // ignore
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

  return (
    <div className="page-container" style={{ padding: '16px 0' }}>
      <Title level={4} style={{ marginBottom: 16 }}>任务列表</Title>

      {/* Filter & Search */}
      <Card style={{ marginBottom: 16 }} bodyStyle={{ padding: 12 }}>
        <Space direction="vertical" style={{ width: '100%' }} size={12}>
          <Radio.Group
            value={filter}
            onChange={(e) => { setFilter(e.target.value); setPage(1) }}
            optionType="button"
            buttonStyle="solid"
            size="small"
          >
            {filterOptions.map((opt) => (
              <Radio.Button key={opt.value} value={opt.value}>{opt.label}</Radio.Button>
            ))}
          </Radio.Group>
          <Search
            placeholder="搜索任务标题..."
            allowClear
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onSearch={() => loadTasks()}
            onPressEnter={() => loadTasks()}
            style={{ maxWidth: 400 }}
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
            }}
            renderItem={(task) => (
              <List.Item
                onClick={() => navigate(`/tasks/${task.id}`)}
                style={{ cursor: 'pointer' }}
                actions={[
                  <Tag color={statusColor[task.status]}>{task.status}</Tag>,
                ]}
              >
                <List.Item.Meta
                  avatar={
                    <span style={{ fontSize: 18, color: '#999' }}>
                      {sourceIcon[task.sourceType] || <FileTextOutlined />}
                    </span>
                  }
                  title={
                    <Space>
                      <Text strong>{task.title}</Text>
                      <Tag color={priorityColor[task.priority]} style={{ marginLeft: 8 }}>
                        {task.priority}
                      </Tag>
                    </Space>
                  }
                  description={
                    <Space>
                      <Text
                        type={dayjs(task.deadline).isBefore(dayjs()) && task.status !== 'DONE' ? 'danger' : 'secondary'}
                        style={{ fontSize: 12 }}
                      >
                        {dayjs(task.deadline).format('YYYY-MM-DD HH:mm')}
                        {dayjs(task.deadline).isBefore(dayjs()) && task.status !== 'DONE' && ' (已过期)'}
                      </Text>
                    </Space>
                  }
                />
              </List.Item>
            )}
          />
        ) : (
          <Empty description="暂无任务" image={Empty.PRESENTED_IMAGE_SIMPLE}>
            <AntButton type="primary" onClick={() => setModalOpen(true)}>新建任务</AntButton>
          </Empty>
        )}
      </Spin>

      {/* FAB - Create Task */}
      <AntButton
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
          boxShadow: '0 4px 12px rgba(22,119,255,0.4)',
        }}
        onClick={() => setModalOpen(true)}
      />

      {/* Create Task Modal */}
      <Modal
        title="新建任务"
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        footer={null}
        width={520}
      >
        <Form form={form} layout="vertical" onFinish={handleCreate}>
          <Form.Item name="title" label="任务标题" rules={[{ required: true, message: '请输入标题' }]}>
            <Input placeholder="输入任务标题" />
          </Form.Item>
          <Form.Item name="description" label="描述">
            <TextArea rows={3} placeholder="输入任务描述（可选）" />
          </Form.Item>
          <Form.Item name="deadline" label="截止时间" rules={[{ required: true, message: '请选择截止时间' }]}>
            <DatePicker showTime style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="priority" label="优先级" initialValue="MEDIUM">
            <Select>
              <Select.Option value="URGENT">紧急</Select.Option>
              <Select.Option value="HIGH">高</Select.Option>
              <Select.Option value="MEDIUM">中</Select.Option>
              <Select.Option value="LOW">低</Select.Option>
            </Select>
          </Form.Item>
          <Form.Item name="estimatedHours" label="预估耗时（小时）" initialValue={0}>
            <InputNumber min={0} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item>
            <AntButton type="primary" htmlType="submit" block loading={submitting}>
              创建
            </AntButton>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}
