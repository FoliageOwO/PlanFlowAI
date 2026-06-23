import React from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  Card, Tag, Button, Spin, Descriptions, Collapse, Checkbox, Input,
  List, Typography, Space, message, Modal, Popconfirm, Divider, Empty,
} from 'antd'
import {
  EditOutlined, DeleteOutlined, PlusOutlined, ArrowLeftOutlined,
  CheckCircleOutlined, SyncOutlined, ClockCircleOutlined, RobotOutlined,
  BellOutlined, FileTextOutlined, PictureOutlined, FileOutlined, AudioOutlined,
} from '@ant-design/icons'
import dayjs from 'dayjs'
import { mockApi, isMockMode } from '../../services/mockData'
import http from '../../services/api'
import type { TaskItem, ChecklistItem } from '../../services/mockData'

const { Title, Text } = Typography
const { Panel } = Collapse
const { TextArea } = Input
const { confirm } = Modal

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

const statusLabels: Record<string, string> = {
  TODO: '待处理',
  DOING: '进行中',
  DONE: '已完成',
  CANCELLED: '已取消',
}

const channelLabels: Record<string, string> = {
  IN_APP: '站内',
  EMAIL: '邮件',
  SMS: '短信',
  WEIXIN: '微信',
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
    const updated = checklist.map((c) =>
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
      setTask((prev) => prev ? { ...prev, status } : prev)
      message.success(`状态已更新为${statusLabels[status]}`)
    } catch {
      message.error('更新状态失败')
    }
  }

  const handleDelete = () => {
    confirm({
      title: '确认删除',
      content: '确定要删除这个任务吗？',
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
      <div style={{ display: 'flex', justifyContent: 'center', padding: 80 }}>
        <Spin size="large" />
      </div>
    )
  }

  if (!task) {
    return (
      <div className="page-container" style={{ padding: '16px 0' }}>
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/tasks')} style={{ marginBottom: 16 }}>
          返回列表
        </Button>
        <Empty description="任务不存在" />
      </div>
    )
  }

  const nextStatus: Record<string, TaskItem['status']> = {
    TODO: 'DOING',
    DOING: 'DONE',
    DONE: 'DONE',
    CANCELLED: 'TODO',
  }

  return (
    <div className="page-container" style={{ padding: '16px 0' }}>
      {/* Back */}
      <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/tasks')} style={{ marginBottom: 16 }}>
        返回列表
      </Button>

      {/* Header */}
      <Card style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div style={{ flex: 1 }}>
            <Space align="center" style={{ marginBottom: 8 }}>
              <Title level={4} style={{ margin: 0 }}>{task.title}</Title>
              <Tag color={statusColor[task.status]}>{statusLabels[task.status]}</Tag>
              <Tag color={priorityColor[task.priority]}>{task.priority}</Tag>
            </Space>
          </div>
          <Space>
            <Button icon={<EditOutlined />} onClick={() => message.info('编辑功能开发中')}>编辑</Button>
            <Popconfirm title="确定删除？" onConfirm={handleDelete}>
              <Button danger icon={<DeleteOutlined />}>删除</Button>
            </Popconfirm>
          </Space>
        </div>
      </Card>

      {/* Basic Info */}
      <Card title="基本信息" style={{ marginBottom: 16 }} size="small">
        <Descriptions column={{ xs: 1, sm: 2 }} size="small">
          <Descriptions.Item label="描述">{task.description || '暂无描述'}</Descriptions.Item>
          <Descriptions.Item label="截止时间">
            <Text type={dayjs(task.deadline).isBefore(dayjs()) && task.status !== 'DONE' ? 'danger' : undefined}>
              {dayjs(task.deadline).format('YYYY-MM-DD HH:mm')}
              {dayjs(task.deadline).isBefore(dayjs()) && task.status !== 'DONE' && ' (已过期)'}
            </Text>
          </Descriptions.Item>
          <Descriptions.Item label="优先级">
            <Tag color={priorityColor[task.priority]}>{task.priority}</Tag>
          </Descriptions.Item>
          <Descriptions.Item label="预估耗时">{task.estimatedHours} 小时</Descriptions.Item>
          <Descriptions.Item label="来源类型">
            {sourceIcons[task.sourceType]} {task.sourceType}
          </Descriptions.Item>
        </Descriptions>
      </Card>

      {/* Source Evidence */}
      {task.sourceEvidence && (
        <Card style={{ marginBottom: 16 }} size="small">
          <Collapse ghost expandIconPosition="end">
            <Panel header="来源原文证据" key="1">
              <Text style={{ whiteSpace: 'pre-wrap' }}>{task.sourceEvidence}</Text>
            </Panel>
          </Collapse>
        </Card>
      )}

      {/* Constraints */}
      {task.constraints.length > 0 && (
        <Card title="约束条件" style={{ marginBottom: 16 }} size="small">
          <Space wrap>
            {task.constraints.map((c, i) => (
              <Tag key={i}>{c}</Tag>
            ))}
          </Space>
        </Card>
      )}

      {/* Checklist */}
      <Card
        title={
          <Space>
            <CheckCircleOutlined style={{ color: '#52c41a' }} />
            检查清单
            <Text style={{ fontSize: 12, color: '#999' }}>
              ({checklist.filter((c) => c.done).length}/{checklist.length})
            </Text>
          </Space>
        }
        style={{ marginBottom: 16 }}
        size="small"
      >
        <List
          dataSource={checklist}
          renderItem={(item) => (
            <List.Item
              actions={[
                <Button
                  type="text"
                  size="small"
                  onClick={() => handleToggleCheck(item)}
                  icon={item.done ? <CheckCircleOutlined style={{ color: '#52c41a' }} /> : <ClockCircleOutlined />}
                />,
              ]}
            >
              <Text
                style={{
                  textDecoration: item.done ? 'line-through' : 'none',
                  color: item.done ? '#999' : 'inherit',
                }}
              >
                {item.text}
              </Text>
            </List.Item>
          )}
          locale={{ emptyText: <Empty description="暂无检查项" image={Empty.PRESENTED_IMAGE_SIMPLE} /> }}
        />
        <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
          <Input
            placeholder="添加检查项"
            value={newCheckItem}
            onChange={(e) => setNewCheckItem(e.target.value)}
            onPressEnter={handleAddCheckItem}
          />
          <Button icon={<PlusOutlined />} onClick={handleAddCheckItem} loading={savingChecklist}>
            添加
          </Button>
        </div>
      </Card>

      {/* Reminders */}
      <Card
        title={<Space><BellOutlined /> 提醒规则</Space>}
        style={{ marginBottom: 16 }}
        size="small"
      >
        {task.reminders.length > 0 ? (
          <List
            dataSource={task.reminders}
            renderItem={(reminder) => (
              <List.Item>
                <Space>
                  <BellOutlined />
                  <Text>{dayjs(reminder.time).format('MM-DD HH:mm')}</Text>
                  <Tag>{channelLabels[reminder.channel] || reminder.channel}</Tag>
                </Space>
              </List.Item>
            )}
          />
        ) : (
          <Empty description="暂无提醒" image={Empty.PRESENTED_IMAGE_SIMPLE} />
        )}
      </Card>

      {/* AI Suggestion */}
      {task.aiSuggestion && (
        <Card
          title={<Space><RobotOutlined style={{ color: '#1677ff' }} /> AI 规划建议</Space>}
          style={{ marginBottom: 16 }}
          size="small"
        >
          <div style={{
            background: '#f0f5ff',
            borderRadius: 8,
            padding: 16,
            border: '1px solid #d6e4ff',
          }}>
            <Text>{task.aiSuggestion}</Text>
          </div>
        </Card>
      )}

      {/* Action Bar */}
      <div style={{
        position: 'sticky',
        bottom: 0,
        background: '#fff',
        padding: '12px 16px',
        borderTop: '1px solid #f0f0f0',
        borderRadius: '8px 8px 0 0',
        boxShadow: '0 -2px 8px rgba(0,0,0,0.06)',
      }}>
        <Space style={{ width: '100%', justifyContent: 'center' }}>
          {task.status !== 'CANCELLED' && (
            <Button
              type={task.status === 'TODO' ? 'primary' : 'default'}
              icon={task.status === 'DOING' ? <SyncOutlined /> : task.status === 'DONE' ? <CheckCircleOutlined /> : undefined}
              onClick={() => handleChangeStatus(nextStatus[task.status])}
            >
              {task.status === 'TODO' && '开始处理'}
              {task.status === 'DOING' && '标记完成'}
              {task.status === 'DONE' && '已完成'}
            </Button>
          )}
          {task.status !== 'CANCELLED' && task.status !== 'DONE' && (
            <Button onClick={() => handleChangeStatus('CANCELLED')}>取消任务</Button>
          )}
          {task.status === 'CANCELLED' && (
            <Button onClick={() => handleChangeStatus('TODO')}>重新打开</Button>
          )}
        </Space>
      </div>
    </div>
  )
}
