import React from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  Card, Tag, Button, Spin, Descriptions, Collapse, Checkbox, Input,
  List, Typography, Space, message, Modal, Popconfirm, Divider, Empty,
  Row, Col, Skeleton, Tooltip, Select, Badge, Form, DatePicker, InputNumber,
} from 'antd'
import {
  EditOutlined, DeleteOutlined, PlusOutlined, ArrowLeftOutlined,
  CheckCircleOutlined, SyncOutlined, ClockCircleOutlined, RobotOutlined,
  BellOutlined, FileTextOutlined, PictureOutlined, FileOutlined, AudioOutlined,
  SendOutlined, ExclamationCircleOutlined,
  CalendarOutlined, FlagOutlined, LinkOutlined,
} from '@ant-design/icons'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import 'dayjs/locale/zh-cn'
import { mockApi, isMockMode } from '../../services/mockData'
import http from '../../services/api'
import type { TaskItem, ChecklistItem } from '../../services/mockData'

dayjs.extend(relativeTime)
dayjs.locale('zh-cn')

const { Title, Text } = Typography
const { Panel } = Collapse
const { TextArea } = Input
const { confirm } = Modal

const priorityConfig: Record<string, { color: string; label: string; icon: React.ReactNode }> = {
  URGENT: { color: 'red', label: '紧急', icon: <ExclamationCircleOutlined /> },
  HIGH: { color: 'orange', label: '高', icon: <FlagOutlined /> },
  MEDIUM: { color: 'blue', label: '中', icon: <FlagOutlined /> },
  LOW: { color: 'default', label: '低', icon: <FlagOutlined /> },
}

const statusConfig: Record<string, { color: string; label: string }> = {
  TODO: { color: 'default', label: '待处理' },
  DOING: { color: 'processing', label: '进行中' },
  DONE: { color: 'success', label: '已完成' },
  CANCELLED: { color: 'default', label: '已取消' },
}

const channelLabel: Record<string, string> = {
  IN_APP: '站内通知',
  EMAIL: '邮件',
  SMS: '短信',
  WEIXIN: '微信',
  LOCAL_APP: '本地通知',
}

const sourceIcons: Record<string, React.ReactNode> = {
  TEXT: <FileTextOutlined />,
  IMAGE: <PictureOutlined />,
  FILE: <FileOutlined />,
  AUDIO: <AudioOutlined />,
}

export default function TaskDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [task, setTask] = React.useState<TaskItem | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [checklist, setChecklist] = React.useState<ChecklistItem[]>([])
  const [newCheckItem, setNewCheckItem] = React.useState('')
  const [savingChecklist, setSavingChecklist] = React.useState(false)

  const fetchTask = React.useCallback(async () => {
    setLoading(true)
    try {
      if (isMockMode()) {
        const res = await mockApi.getTaskDetail(id!)
        if (res.code === 0 && res.data) {
          setTask(res.data)
          setChecklist(res.data.checklist || [])
        } else {
          message.error(res.message)
        }
      } else {
        const res: any = await http.get(`/tasks/${id}`)
        setTask(res.data)
        setChecklist(res.data.checklist || [])
      }
    } catch {
      message.error('获取任务详情失败')
    } finally {
      setLoading(false)
    }
  }, [id])

  React.useEffect(() => { fetchTask() }, [fetchTask])

  const saveChecklist = async (items: ChecklistItem[]) => {
    setSavingChecklist(true)
    try {
      if (isMockMode()) {
        await mockApi.updateChecklist(id!, items)
      } else {
        await http.put(`/tasks/${id}/checklist`, { items })
      }
      setChecklist(items)
    } catch {
      message.error('保存检查项失败')
    } finally {
      setSavingChecklist(false)
    }
  }

  const handleToggleCheck = (item: ChecklistItem) => {
    const updated = checklist.map(c =>
      c.id === item.id ? { ...c, done: !c.done } : c,
    )
    saveChecklist(updated)
  }

  const handleAddCheckItem = () => {
    if (!newCheckItem.trim()) return
    const newItem: ChecklistItem = {
      id: `cl-${Date.now()}`,
      text: newCheckItem.trim(),
      done: false,
    }
    saveChecklist([...checklist, newItem])
    setNewCheckItem('')
  }

  const handleChangeStatus = async (status: TaskItem['status']) => {
    try {
      if (isMockMode()) {
        await mockApi.updateTask(id!, { status })
      } else {
        await http.put(`/tasks/${id}`, { status })
      }
      setTask(prev => prev ? { ...prev, status } : prev)
      message.success(`状态已更新为 ${statusConfig[status].label}`)
    } catch {
      message.error('更新状态失败')
    }
  }

  const [editModalOpen, setEditModalOpen] = React.useState(false)
  const [editForm] = Form.useForm()
  const [savingEdit, setSavingEdit] = React.useState(false)

  const handleEdit = () => {
    if (task) {
      editForm.setFieldsValue({
        title: task.title,
        description: task.description,
        deadline: task.deadline ? dayjs(task.deadline) : undefined,
        priority: task.priority,
        estimatedHours: task.estimatedHours || 0,
      })
      setEditModalOpen(true)
    }
  }

  const handleSaveEdit = async (values: any) => {
    if (!task) return
    setSavingEdit(true)
    try {
      const data = {
        title: values.title,
        description: values.description || '',
        deadline: values.deadline ? values.deadline.format('YYYY-MM-DD HH:mm:ss') : task.deadline,
        priority: values.priority || 'MEDIUM',
        estimatedHours: values.estimatedHours || 0,
      }
      if (isMockMode()) {
        await mockApi.updateTask(id!, data as any)
      } else {
        await http.put(`/tasks/${id}`, data)
      }
      message.success('任务已更新')
      setEditModalOpen(false)
      fetchTask()
    } catch {
      message.error('更新失败')
    } finally {
      setSavingEdit(false)
    }
  }

  const handleDelete = () => {
    confirm({
      title: '确认删除',
      content: '确定要删除这个任务吗？删除后不可恢复。',
      okText: '确认删除',
      okType: 'danger',
      cancelText: '取消',
      onOk: async () => {
        try {
          if (isMockMode()) {
            await mockApi.deleteTask(id!)
          } else {
            await http.delete(`/tasks/${id}`)
          }
          message.success('任务已删除')
          navigate('/tasks')
        } catch {
          message.error('删除失败')
        }
      },
    })
  }

  if (loading) {
    return (
      <div className="page-container" style={{ padding: '16px 0', maxWidth: 800, margin: '0 auto' }}>
        <Skeleton active paragraph={{ rows: 1 }} style={{ marginBottom: 16 }} />
        <Card>
          <Skeleton active paragraph={{ rows: 6 }} />
        </Card>
      </div>
    )
  }

  if (!task) {
    return (
      <div className="page-container" style={{ padding: '16px 0', maxWidth: 800, margin: '0 auto' }}>
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/tasks')} style={{ marginBottom: 16 }}>
          返回列表
        </Button>
        <Empty description="任务不存在或已被删除">
          <Button type="primary" onClick={() => navigate('/tasks')}>返回任务列表</Button>
        </Empty>
      </div>
    )
  }

  const nextStatus: Record<string, TaskItem['status']> = {
    TODO: 'DOING',
    DOING: 'DONE',
    DONE: 'DONE',
    CANCELLED: 'TODO',
  }

  const isOverdue = dayjs(task.deadline).isBefore(dayjs()) && task.status !== 'DONE'
  const checkedCount = checklist.filter(c => c.done).length
  const priCfg = priorityConfig[task.priority]

  return (
    <div className="page-container" style={{ padding: '16px 0', maxWidth: 800, margin: '0 auto' }}>
      {/* Back */}
      <Button
        type="text"
        icon={<ArrowLeftOutlined />}
        onClick={() => navigate('/tasks')}
        style={{ marginBottom: 16, color: '#666' }}
      >
        返回列表
      </Button>

      {/* Header Section */}
      <Card style={{ marginBottom: 16, borderRadius: 'var(--radius-lg)' }} bodyStyle={{ padding: '24px 24px 20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
          <div style={{ flex: 1, minWidth: 200 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
              <Title level={4} style={{ margin: 0, fontSize: 20 }}>{task.title}</Title>
              <Badge
                status={statusConfig[task.status].color as any}
                text={statusConfig[task.status].label}
                style={{ fontSize: 13 }}
              />
            </div>
            <Space size={12} style={{ flexWrap: 'wrap' }}>
              <Tag color={priCfg.color} style={{ margin: 0, fontSize: 12, padding: '0 10px', lineHeight: '24px' }}>
                {priCfg.icon} {priCfg.label}优先级
              </Tag>
              {isOverdue && (
                <Tag color="red" style={{ margin: 0, fontSize: 12 }}>
                  <ExclamationCircleOutlined /> 已过期
                </Tag>
              )}
              <Text style={{ fontSize: 13, color: isOverdue ? 'var(--danger)' : '#666' }}>
                <CalendarOutlined style={{ marginRight: 4 }} />
                {dayjs(task.deadline).format('YYYY-MM-DD HH:mm')}
                {isOverdue && ` (已逾期 ${Math.abs(dayjs(task.deadline).diff(dayjs(), 'day'))} 天)`}
              </Text>
            </Space>
          </div>
          <Space>
            <Button icon={<EditOutlined />} onClick={handleEdit}>
              编辑
            </Button>
            <Popconfirm
              title="确定删除这个任务？"
              description="删除后不可恢复"
              onConfirm={handleDelete}
              okText="删除"
              cancelText="取消"
            >
              <Button danger icon={<DeleteOutlined />}>删除</Button>
            </Popconfirm>
          </Space>
        </div>
      </Card>

      {/* Main Content */}
      <Row gutter={[16, 16]}>
        <Col xs={24} lg={16}>
          {/* Description */}
          <Card title="📝 描述" style={{ marginBottom: 16 }} size="small">
            <Text style={{ fontSize: 14, lineHeight: 1.8, whiteSpace: 'pre-wrap' }}>
              {task.description || '暂无描述'}
            </Text>
          </Card>

          {/* Checklist */}
          <Card
            title={
              <Space>
                <CheckCircleOutlined style={{ color: checkedCount === checklist.length && checklist.length > 0 ? 'var(--success)' : '#999' }} />
                <span>检查清单</span>
                <Tag color={checkedCount === checklist.length && checklist.length > 0 ? 'success' : 'default'} style={{ fontSize: 11 }}>
                  {checkedCount}/{checklist.length}
                </Tag>
              </Space>
            }
            style={{ marginBottom: 16 }}
            size="small"
          >
            {checklist.length > 0 ? (
              <List
                dataSource={checklist}
                split={false}
                renderItem={(item, index) => (
                  <List.Item
                    style={{
                      padding: '8px 0',
                      borderBottom: '1px solid var(--border-light)',
                      cursor: 'pointer',
                      transition: 'background 0.15s',
                    }}
                    onClick={() => handleToggleCheck(item)}
                    onMouseEnter={e => e.currentTarget.style.background = '#fafafa'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, width: '100%' }}>
                      <div style={{
                        width: 20,
                        height: 20,
                        borderRadius: 4,
                        border: `2px solid ${item.done ? 'var(--success)' : '#d9d9d9'}`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        background: item.done ? 'var(--success)' : 'transparent',
                        transition: 'all 0.2s',
                        flexShrink: 0,
                      }}>
                        {item.done && <CheckCircleOutlined style={{ color: '#fff', fontSize: 12 }} />}
                      </div>
                      <Text
                        style={{
                          flex: 1,
                          fontSize: 14,
                          textDecoration: item.done ? 'line-through' : 'none',
                          color: item.done ? '#999' : 'inherit',
                          transition: 'all 0.2s',
                        }}
                      >
                        {item.text}
                      </Text>
                    </div>
                  </List.Item>
                )}
                locale={{ emptyText: <Empty description="暂无检查项" image={Empty.PRESENTED_IMAGE_SIMPLE} /> }}
              />
            ) : (
              <Empty description="暂无检查项" image={Empty.PRESENTED_IMAGE_SIMPLE} style={{ margin: '8px 0' }} />
            )}
            <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
              <Input
                placeholder="添加检查项"
                value={newCheckItem}
                onChange={e => setNewCheckItem(e.target.value)}
                onPressEnter={handleAddCheckItem}
                suffix={
                  <Button
                    type="text"
                    size="small"
                    icon={<PlusOutlined />}
                    onClick={handleAddCheckItem}
                    loading={savingChecklist}
                    disabled={!newCheckItem.trim()}
                  />
                }
              />
            </div>
          </Card>

          {/* Source Evidence */}
          {task.sourceEvidence && (
            <Card style={{ marginBottom: 16 }} size="small">
              <Collapse ghost expandIconPosition="end">
                <Panel
                  header={<Space><LinkOutlined /> 来源原文证据</Space>}
                  key="1"
                >
                  <div style={{
                    background: '#f6f8fa',
                    borderRadius: 'var(--radius-sm)',
                    padding: 12,
                    fontSize: 13,
                    lineHeight: 1.7,
                    whiteSpace: 'pre-wrap',
                    color: '#555',
                  }}>
                    {task.sourceEvidence}
                  </div>
                </Panel>
              </Collapse>
            </Card>
          )}
        </Col>

        <Col xs={24} lg={8}>
          {/* Basic Info */}
          <Card title="📋 基本信息" style={{ marginBottom: 16 }} size="small">
            <Descriptions column={1} size="small" colon={false}>
              <Descriptions.Item label={<Text style={{ color: '#666' }}>优先级</Text>}>
                <Tag color={priCfg.color}>{priCfg.label}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label={<Text style={{ color: '#666' }}>状态</Text>}>
                <Badge status={statusConfig[task.status].color as any} text={statusConfig[task.status].label} />
              </Descriptions.Item>
              <Descriptions.Item label={<Text style={{ color: '#666' }}>截止时间</Text>}>
                <Text type={isOverdue ? 'danger' : undefined} style={{ fontSize: 13 }}>
                  {dayjs(task.deadline).format('MM-DD HH:mm')}
                  {isOverdue && ' (已过期)'}
                </Text>
              </Descriptions.Item>
              <Descriptions.Item label={<Text style={{ color: '#666' }}>预估耗时</Text>}>
                {task.estimatedHours} 小时
              </Descriptions.Item>
              <Descriptions.Item label={<Text style={{ color: '#666' }}>来源类型</Text>}>
                <Space>
                  {sourceIcons[task.sourceType] || <FileTextOutlined />}
                  <Text>{task.sourceType}</Text>
                </Space>
              </Descriptions.Item>
              <Descriptions.Item label={<Text style={{ color: '#666' }}>创建时间</Text>}>
                <Text style={{ fontSize: 12 }}>{dayjs(task.createdAt).format('MM-DD HH:mm')}</Text>
              </Descriptions.Item>
            </Descriptions>
          </Card>

          {/* Constraints */}
          {task.constraints.length > 0 && (
            <Card title="🔒 约束条件" style={{ marginBottom: 16 }} size="small">
              <Space wrap>
                {task.constraints.map((c, i) => (
                  <Tag key={i} style={{ padding: '2px 12px', fontSize: 12 }}>{c}</Tag>
                ))}
              </Space>
            </Card>
          )}

          {/* Reminders */}
          <Card
            title={<Space><BellOutlined /> 提醒规则</Space>}
            style={{ marginBottom: 16 }}
            size="small"
          >
            {task.reminders.length > 0 ? (
              <List
                dataSource={task.reminders}
                split={false}
                renderItem={(reminder) => (
                  <List.Item style={{ padding: '8px 0' }}>
                    <Space>
                      <BellOutlined style={{ color: 'var(--warning)' }} />
                      <div>
                        <Text style={{ fontSize: 13 }}>{dayjs(reminder.time).format('MM-DD HH:mm')}</Text>
                        <br />
                        <Tag style={{ fontSize: 11 }}>{channelLabel[reminder.channel] || reminder.channel}</Tag>
                      </div>
                    </Space>
                  </List.Item>
                )}
              />
            ) : (
              <Empty description="暂无提醒" image={Empty.PRESENTED_IMAGE_SIMPLE} style={{ margin: '8px 0' }} />
            )}
          </Card>

          {/* AI Suggestion */}
          {task.aiSuggestion && (
            <Card
              title={<Space><RobotOutlined style={{ color: 'var(--primary)' }} /> AI 建议</Space>}
              size="small"
            >
              <div style={{
                background: 'linear-gradient(135deg, #f0f5ff, #e6f4ff)',
                borderRadius: 'var(--radius-sm)',
                padding: 14,
                border: '1px solid #d6e4ff',
              }}>
                <Text style={{ fontSize: 13, lineHeight: 1.7 }}>{task.aiSuggestion}</Text>
              </div>
            </Card>
          )}
        </Col>
      </Row>

      {/* Sticky Action Bar */}
      <div style={{
        position: 'sticky',
        bottom: 0,
        background: '#fff',
        padding: '12px 20px',
        marginTop: 16,
        borderTop: '1px solid var(--border-light)',
        borderRadius: 'var(--radius-md) var(--radius-md) 0 0',
        boxShadow: '0 -4px 12px rgba(0,0,0,0.06)',
      }}>
        <div style={{ display: 'flex', justifyContent: 'center', gap: 12, flexWrap: 'wrap' }}>
          {task.status !== 'CANCELLED' && (
            <Button
              type={task.status === 'TODO' ? 'primary' : 'default'}
              size="large"
              icon={task.status === 'DONE' ? <CheckCircleOutlined /> : task.status === 'DOING' ? <SyncOutlined /> : <SendOutlined />}
              onClick={() => handleChangeStatus(nextStatus[task.status])}
              style={{ minWidth: 140 }}
            >
              {task.status === 'TODO' && '开始处理'}
              {task.status === 'DOING' && '标记完成'}
              {task.status === 'DONE' && '已完成 ✓'}
            </Button>
          )}
          {task.status !== 'CANCELLED' && task.status !== 'DONE' && (
            <Button size="large" onClick={() => handleChangeStatus('CANCELLED')}>
              取消任务
            </Button>
          )}
          {task.status === 'CANCELLED' && (
            <Button type="primary" size="large" onClick={() => handleChangeStatus('TODO')}>
              重新打开
            </Button>
          )}
        </div>
      </div>

      {/* Edit Modal */}
      <Modal
        title="编辑任务"
        open={editModalOpen}
        onCancel={() => setEditModalOpen(false)}
        footer={null}
        width={560}
        destroyOnClose
      >
        <Form form={editForm} layout="vertical" onFinish={handleSaveEdit}>
          <Form.Item name="title" label="任务标题" rules={[{ required: true, message: '请输入标题' }]}>
            <Input placeholder="输入任务标题" size="large" />
          </Form.Item>
          <Form.Item name="description" label="描述">
            <Input.TextArea rows={3} placeholder="输入任务描述（可选）" />
          </Form.Item>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="deadline" label="截止时间">
                <DatePicker showTime style={{ width: '100%' }} size="large" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="priority" label="优先级">
                <Select size="large">
                  <Select.Option value="URGENT">🔥 紧急</Select.Option>
                  <Select.Option value="HIGH">⚡ 高</Select.Option>
                  <Select.Option value="MEDIUM">📌 中</Select.Option>
                  <Select.Option value="LOW">📎 低</Select.Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="estimatedHours" label="预估耗时（小时）">
            <InputNumber min={0} style={{ width: '100%' }} size="large" />
          </Form.Item>
          <Form.Item style={{ marginBottom: 0 }}>
            <Button type="primary" htmlType="submit" block size="large" loading={savingEdit}>
              保存修改
            </Button>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}
