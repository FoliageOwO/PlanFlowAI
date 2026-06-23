import React from 'react'
import { Card, Input, Button, List, Tag, Empty, Spin, Typography, Row, Col } from 'antd'
import { SendOutlined, UploadOutlined, WarningOutlined, ClockCircleOutlined, CheckCircleOutlined } from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import dayjs from 'dayjs'
import { mockApi, isMockMode } from '../../services/mockData'
import http from '../../services/api'
import type { TaskItem } from '../../services/mockData'

const { TextArea } = Input
const { Text, Title } = Typography

const priorityColor: Record<string, string> = {
  URGENT: 'red',
  HIGH: 'orange',
  MEDIUM: 'blue',
  LOW: 'default',
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
      // ignore
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

  const renderTaskItem = (task: TaskItem) => (
    <List.Item
      onClick={() => navigate(`/tasks/${task.id}`)}
      style={{ cursor: 'pointer', padding: '12px 16px' }}
      extra={
        <Tag color={priorityColor[task.priority]}>{task.priority}</Tag>
      }
    >
      <List.Item.Meta
        title={
          <Text strong style={{ fontSize: 14 }}>
            {task.title}
          </Text>
        }
        description={
          <div style={{ fontSize: 12, color: '#999' }}>
            <ClockCircleOutlined style={{ marginRight: 4 }} />
            {dayjs(task.deadline).format('MM-DD HH:mm')}
          </div>
        }
      />
    </List.Item>
  )

  return (
    <div className="page-container" style={{ padding: '16px 0' }}>
      {/* Quick Input Section */}
      <Card style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
          <TextArea
            rows={2}
            placeholder="快速输入任务内容..."
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onPressEnter={handleQuickInput}
          />
          <Button type="primary" icon={<SendOutlined />} onClick={handleQuickInput}>
            提交
          </Button>
        </div>
        <div style={{ marginTop: 8 }}>
          <Button icon={<UploadOutlined />} onClick={() => navigate('/input')}>
            上传文件
          </Button>
        </div>
      </Card>

      <Spin spinning={loading}>
        <Row gutter={[16, 16]}>
          {/* Today's Tasks */}
          <Col xs={24} md={8}>
            <Card
              title={
                <span>
                  <WarningOutlined style={{ color: '#faad14', marginRight: 8 }} />
                  今日待办
                </span>
              }
              size="small"
            >
              {todayTasks.length > 0 ? (
                <List
                  dataSource={todayTasks}
                  renderItem={renderTaskItem}
                  split={false}
                />
              ) : (
                <Empty description="今日暂无待办任务" image={Empty.PRESENTED_IMAGE_SIMPLE} />
              )}
            </Card>
          </Col>

          {/* Upcoming Tasks */}
          <Col xs={24} md={8}>
            <Card
              title={
                <span>
                  <ClockCircleOutlined style={{ color: '#1677ff', marginRight: 8 }} />
                  即将截止
                </span>
              }
              size="small"
            >
              {upcomingTasks.length > 0 ? (
                <List
                  dataSource={upcomingTasks}
                  renderItem={renderTaskItem}
                  split={false}
                />
              ) : (
                <Empty description="暂无即将截止任务" image={Empty.PRESENTED_IMAGE_SIMPLE} />
              )}
            </Card>
          </Col>

          {/* Overdue Tasks */}
          <Col xs={24} md={8}>
            <Card
              title={
                <span>
                  <WarningOutlined style={{ color: '#ff4d4f', marginRight: 8 }} />
                  已过期
                </span>
              }
              size="small"
            >
              {overdueTasks.length > 0 ? (
                <List
                  dataSource={overdueTasks}
                  renderItem={renderTaskItem}
                  split={false}
                />
              ) : (
                <Empty description="没有过期的任务" image={Empty.PRESENTED_IMAGE_SIMPLE} />
              )}
            </Card>
          </Col>
        </Row>
      </Spin>
    </div>
  )
}
