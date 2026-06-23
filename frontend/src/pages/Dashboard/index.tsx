import React from 'react'
import {
  Card, Input, Button, List, Tag, Empty, Spin, Typography, Row, Col, Skeleton, Statistic, Space, Tooltip, Divider
} from 'antd'
import {
  SendOutlined, UploadOutlined, WarningOutlined, ClockCircleOutlined,
  CheckCircleOutlined, ArrowRightOutlined, FileTextOutlined,
  FireOutlined, CalendarOutlined, ExclamationCircleOutlined,
  RobotOutlined, PlusOutlined,
} from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import 'dayjs/locale/zh-cn'
import { mockApi, isMockMode } from '../../services/mockData'
import http from '../../services/api'
import type { TaskItem } from '../../services/mockData'

dayjs.extend(relativeTime)
dayjs.locale('zh-cn')

const { TextArea } = Input
const { Text, Title } = Typography

const priorityColor: Record<string, string> = {
  URGENT: 'red',
  HIGH: 'orange',
  MEDIUM: 'blue',
  LOW: 'default',
}

const priorityLabel: Record<string, string> = {
  URGENT: '紧急',
  HIGH: '高',
  MEDIUM: '中',
  LOW: '低',
}

function TaskCard({ task, onClick }: { task: TaskItem; onClick: () => void }) {
  const isOverdue = dayjs(task.deadline).isBefore(dayjs()) && task.status !== 'DONE'
  return (
    <div
      onClick={onClick}
      style={{
        padding: '12px 16px',
        cursor: 'pointer',
        borderRadius: 'var(--radius-sm)',
        transition: 'all 0.2s',
        border: '1px solid var(--border-light)',
        marginBottom: 8,
        background: '#fff',
        position: 'relative',
        overflow: 'hidden',
      }}
      onMouseEnter={e => {
        e.currentTarget.style.borderColor = 'var(--primary)'
        e.currentTarget.style.boxShadow = 'var(--shadow-sm)'
        e.currentTarget.style.transform = 'translateX(4px)'
      }}
      onMouseLeave={e => {
        e.currentTarget.style.borderColor = 'var(--border-light)'
        e.currentTarget.style.boxShadow = 'none'
        e.currentTarget.style.transform = 'translateX(0)'
      }}
    >
      <div className={`priority-bar priority-${task.priority.toLowerCase()}`} />
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <Text strong style={{ fontSize: 14, display: 'block', marginBottom: 4 }}>
            {task.title}
          </Text>
          <Space size={12}>
            <Text type={isOverdue ? 'danger' : 'secondary'} style={{ fontSize: 12 }}>
              <ClockCircleOutlined style={{ marginRight: 4 }} />
              {isOverdue
                ? `已逾期 ${Math.abs(dayjs(task.deadline).diff(dayjs(), 'day'))} 天`
                : dayjs(task.deadline).fromNow()
              }
            </Text>
            <Tag color={priorityColor[task.priority]} style={{ fontSize: 11, margin: 0 }}>
              {priorityLabel[task.priority]}
            </Tag>
          </Space>
        </div>
      </div>
    </div>
  )
}

export default function Dashboard() {
  const navigate = useNavigate()
  const [inputValue, setInputValue] = React.useState('')
  const [todayTasks, setTodayTasks] = React.useState<TaskItem[]>([])
  const [upcomingTasks, setUpcomingTasks] = React.useState<TaskItem[]>([])
  const [overdueTasks, setOverdueTasks] = React.useState<TaskItem[]>([])
  const [loading, setLoading] = React.useState(true)

  const loadData = async () => {
    setLoading(true)
    try {
      if (isMockMode()) {
        const res = await mockApi.getDashboardTasks()
        setTodayTasks(res.data.today)
        setUpcomingTasks(res.data.upcoming)
        setOverdueTasks(res.data.overdue)
      } else {
        const res: any = await http.get('/dashboard/tasks')
        setTodayTasks(res.data.today)
        setUpcomingTasks(res.data.upcoming)
        setOverdueTasks(res.data.overdue)
      }
    } catch {
      // silent
    } finally {
      setLoading(false)
    }
  }

  React.useEffect(() => { loadData() }, [])

  const handleQuickInput = () => {
    const content = inputValue.trim()
    if (!content) return
    navigate(`/input?content=${encodeURIComponent(content)}`)
  }

  const totalTasks = todayTasks.length + upcomingTasks.length + overdueTasks.length

  return (
    <div className="page-container" style={{ padding: '16px 0' }}>
      {/* ─── Hero / Quick Input Section ─── */}
      <div style={{
        background: 'linear-gradient(135deg, var(--primary) 0%, #4096ff 50%, #69b1ff 100%)',
        borderRadius: 'var(--radius-lg)',
        padding: '28px 32px',
        marginBottom: 24,
        position: 'relative',
        overflow: 'hidden',
      }}>
        {/* Decorative circles */}
        <div style={{
          position: 'absolute',
          top: -40,
          right: -40,
          width: 200,
          height: 200,
          borderRadius: '50%',
          background: 'rgba(255,255,255,0.08)',
        }} />
        <div style={{
          position: 'absolute',
          bottom: -60,
          left: '30%',
          width: 160,
          height: 160,
          borderRadius: '50%',
          background: 'rgba(255,255,255,0.05)',
        }} />
        <div style={{ position: 'relative', zIndex: 1 }}>
          <div style={{ marginBottom: 16 }}>
            <Title level={4} style={{ color: '#fff', margin: 0, fontWeight: 700 }}>
              👋 欢迎回来
            </Title>
            <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 14, marginTop: 4, display: 'block' }}>
              输入一段文字或上传文件，AI 自动帮你生成任务计划
            </Text>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
            <TextArea
              rows={2}
              placeholder="快速输入任务内容，例如：下周五前提交项目立项书..."
              value={inputValue}
              onChange={e => setInputValue(e.target.value)}
              onPressEnter={handleQuickInput}
              style={{
                borderRadius: 'var(--radius-sm)',
                border: 'none',
                boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                fontSize: 15,
                resize: 'none',
              }}
            />
            <Button
              type="default"
              icon={<SendOutlined />}
              onClick={handleQuickInput}
              style={{
                height: 52,
                borderRadius: 'var(--radius-sm)',
                background: 'rgba(255,255,255,0.9)',
                border: 'none',
                fontWeight: 600,
                boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
              }}
            >
              提交
            </Button>
          </div>
          <div style={{ marginTop: 12 }}>
            <Button
              icon={<UploadOutlined />}
              onClick={() => navigate('/input')}
              style={{
                background: 'rgba(255,255,255,0.15)',
                border: '1px solid rgba(255,255,255,0.3)',
                color: '#fff',
                borderRadius: 'var(--radius-sm)',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.25)' }}
              onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.15)' }}
            >
              上传文件
            </Button>
          </div>
        </div>
      </div>

      {/* ─── Stats Overview ─── */}
      <Spin spinning={loading}>
        <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
          <Col xs={12} sm={6}>
            <Card size="small" bodyStyle={{ padding: '16px 20px' }}>
              <Statistic
                title={<span style={{ fontSize: 13, color: '#666' }}>今日待办</span>}
                value={todayTasks.length}
                prefix={<CalendarOutlined style={{ color: 'var(--primary)' }} />}
                valueStyle={{ fontSize: 28, fontWeight: 700, color: 'var(--primary)' }}
              />
            </Card>
          </Col>
          <Col xs={12} sm={6}>
            <Card size="small" bodyStyle={{ padding: '16px 20px' }}>
              <Statistic
                title={<span style={{ fontSize: 13, color: '#666' }}>即将截止</span>}
                value={upcomingTasks.length}
                prefix={<FireOutlined style={{ color: 'var(--warning)' }} />}
                valueStyle={{ fontSize: 28, fontWeight: 700, color: 'var(--warning)' }}
              />
            </Card>
          </Col>
          <Col xs={12} sm={6}>
            <Card size="small" bodyStyle={{ padding: '16px 20px' }}>
              <Statistic
                title={<span style={{ fontSize: 13, color: '#666' }}>已过期</span>}
                value={overdueTasks.length}
                prefix={<ExclamationCircleOutlined style={{ color: 'var(--danger)' }} />}
                valueStyle={{ fontSize: 28, fontWeight: 700, color: overdueTasks.length > 0 ? 'var(--danger)' : undefined }}
              />
            </Card>
          </Col>
          <Col xs={12} sm={6}>
            <Card size="small" bodyStyle={{ padding: '16px 20px' }}>
              <Statistic
                title={<span style={{ fontSize: 13, color: '#666' }}>总计</span>}
                value={totalTasks}
                prefix={<CheckCircleOutlined style={{ color: 'var(--success)' }} />}
                valueStyle={{ fontSize: 28, fontWeight: 700, color: 'var(--success)' }}
              />
            </Card>
          </Col>
        </Row>

        {/* ─── Task Sections ─── */}
        <Row gutter={[16, 16]}>
          {/* Overdue */}
          <Col xs={24} md={8}>
            <Card
              title={
                <Space>
                  <ExclamationCircleOutlined style={{ color: 'var(--danger)' }} />
                  <span>已过期</span>
                  {overdueTasks.length > 0 && (
                    <Tag color="red" style={{ fontSize: 11 }}>{overdueTasks.length}</Tag>
                  )}
                </Space>
              }
              size="small"
              bodyStyle={{ padding: '12px 0' }}
              extra={
                overdueTasks.length > 0 && (
                  <Button type="link" size="small" onClick={() => navigate('/tasks?filter=overdue')}>
                    全部 <ArrowRightOutlined />
                  </Button>
                )
              }
            >
              {loading ? (
                <div style={{ padding: '0 16px' }}>
                  <Skeleton active paragraph={{ rows: 2 }} />
                </div>
              ) : overdueTasks.length > 0 ? (
                <div style={{ padding: '0 12px' }}>
                  {overdueTasks.map(task => (
                    <TaskCard key={task.id} task={task} onClick={() => navigate(`/tasks/${task.id}`)} />
                  ))}
                </div>
              ) : (
                <Empty
                  description="没有过期的任务"
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                  style={{ margin: '12px 0' }}
                />
              )}
            </Card>
          </Col>

          {/* Today's Tasks */}
          <Col xs={24} md={8}>
            <Card
              title={
                <Space>
                  <CalendarOutlined style={{ color: 'var(--primary)' }} />
                  <span>今日待办</span>
                  {todayTasks.length > 0 && (
                    <Tag color="blue" style={{ fontSize: 11 }}>{todayTasks.length}</Tag>
                  )}
                </Space>
              }
              size="small"
              bodyStyle={{ padding: '12px 0' }}
              extra={
                todayTasks.length > 0 && (
                  <Button type="link" size="small" onClick={() => navigate('/tasks?filter=today')}>
                    全部 <ArrowRightOutlined />
                  </Button>
                )
              }
            >
              {loading ? (
                <div style={{ padding: '0 16px' }}>
                  <Skeleton active paragraph={{ rows: 2 }} />
                </div>
              ) : todayTasks.length > 0 ? (
                <div style={{ padding: '0 12px' }}>
                  {todayTasks.map(task => (
                    <TaskCard key={task.id} task={task} onClick={() => navigate(`/tasks/${task.id}`)} />
                  ))}
                </div>
              ) : (
                <Empty
                  description="今日暂无待办任务"
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                  style={{ margin: '12px 0' }}
                >
                  <Button type="primary" size="small" icon={<PlusOutlined />} onClick={() => navigate('/input')}>
                    添加任务
                  </Button>
                </Empty>
              )}
            </Card>
          </Col>

          {/* Upcoming */}
          <Col xs={24} md={8}>
            <Card
              title={
                <Space>
                  <FireOutlined style={{ color: 'var(--warning)' }} />
                  <span>即将截止</span>
                  {upcomingTasks.length > 0 && (
                    <Tag color="orange" style={{ fontSize: 11 }}>{upcomingTasks.length}</Tag>
                  )}
                </Space>
              }
              size="small"
              bodyStyle={{ padding: '12px 0' }}
              extra={
                upcomingTasks.length > 0 && (
                  <Button type="link" size="small" onClick={() => navigate('/tasks?filter=due')}>
                    全部 <ArrowRightOutlined />
                  </Button>
                )
              }
            >
              {loading ? (
                <div style={{ padding: '0 16px' }}>
                  <Skeleton active paragraph={{ rows: 2 }} />
                </div>
              ) : upcomingTasks.length > 0 ? (
                <div style={{ padding: '0 12px' }}>
                  {upcomingTasks.map(task => (
                    <TaskCard key={task.id} task={task} onClick={() => navigate(`/tasks/${task.id}`)} />
                  ))}
                </div>
              ) : (
                <Empty
                  description="暂无即将截止任务"
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                  style={{ margin: '12px 0' }}
                />
              )}
            </Card>
          </Col>
        </Row>

        {/* ─── AI Tip ─── */}
        <Card
          size="small"
          style={{ marginTop: 16, background: 'linear-gradient(135deg, #f0f5ff, #e6f4ff)' }}
          bodyStyle={{ padding: '14px 20px' }}
        >
          <Space>
            <RobotOutlined style={{ fontSize: 20, color: 'var(--primary)' }} />
            <div>
              <Text strong style={{ fontSize: 13 }}>💡 使用提示</Text>
              <br />
              <Text style={{ fontSize: 12, color: '#666' }}>
                你可以输入一段课程公告、作业要求、图片截图等，AI 会自动识别任务、设置截止时间、生成检查清单
              </Text>
            </div>
          </Space>
        </Card>
      </Spin>
    </div>
  )
}
