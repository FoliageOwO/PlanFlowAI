import React from 'react'
import { Card, Progress, Steps, Button, Result, Typography, Spin, Space, Tag } from 'antd'
import {
  CheckCircleOutlined, SyncOutlined, CloseCircleOutlined, FileTextOutlined,
  ArrowLeftOutlined, RobotOutlined,
} from '@ant-design/icons'
import { useParams, useNavigate } from 'react-router-dom'
import { mockApi, isMockMode } from '../../services/mockData'
import http from '../../services/api'
import type { JobItem } from '../../services/mockData'

const { Title, Text } = Typography

const stages = [
  { key: 'UPLOADED', label: '已上传', description: '文件已成功上传到服务器' },
  { key: 'TEXT_EXTRACTED', label: '文本提取', description: '正在提取文件中的文字内容' },
  { key: 'AI_PARSING', label: 'AI 解析中', description: 'AI 正在分析文本并生成任务' },
  { key: 'COMPLETED', label: '任务生成', description: '任务已全部生成完毕' },
]

const stageIndex: Record<string, number> = {
  UPLOADED: 0,
  TEXT_EXTRACTED: 1,
  AI_PARSING: 2,
  COMPLETED: 3,
  FAILED: -1,
}

export default function JobProgress() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [job, setJob] = React.useState<JobItem | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)

  const fetchJob = React.useCallback(async () => {
    try {
      if (isMockMode()) {
        const res = await mockApi.getJob(id!)
        if (res.code !== 0) {
          setError(res.message)
          return
        }
        setJob(res.data)
      } else {
        const res: any = await http.get(`/jobs/${id}`)
        setJob(res.data)
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || '获取任务状态失败')
    }
  }, [id])

  React.useEffect(() => {
    fetchJob()
    const timer = setInterval(fetchJob, 2000)
    return () => clearInterval(timer)
  }, [fetchJob])

  if (loading) {
    return (
      <div className="page-container" style={{ padding: '16px 0', maxWidth: 600, margin: '0 auto' }}>
        <Card>
          <div style={{ textAlign: 'center', padding: '40px 0' }}>
            <Spin size="large" />
            <div style={{ marginTop: 16 }}>
              <Text style={{ color: '#999' }}>加载中...</Text>
            </div>
          </div>
        </Card>
      </div>
    )
  }

  if (error || !job) {
    return (
      <div className="page-container" style={{ padding: '16px 0', maxWidth: 600, margin: '0 auto' }}>
        <Button
          type="text"
          icon={<ArrowLeftOutlined />}
          onClick={() => navigate('/input')}
          style={{ marginBottom: 16, color: '#666' }}
        >
          返回输入
        </Button>
        <Result
          status="error"
          title="获取任务状态失败"
          subTitle={error || '未知错误'}
          extra={
            <Button type="primary" onClick={() => { setLoading(true); setError(null); fetchJob() }}>
              重试
            </Button>
          }
        />
      </div>
    )
  }

  const currentIdx = stageIndex[job.status] ?? 0
  const isFailed = job.status === 'FAILED'
  const isCompleted = job.status === 'COMPLETED'

  return (
    <div className="page-container" style={{ padding: '16px 0', maxWidth: 600, margin: '0 auto' }}>
      <Button
        type="text"
        icon={<ArrowLeftOutlined />}
        onClick={() => navigate('/input')}
        style={{ marginBottom: 16, color: '#666' }}
      >
        返回输入
      </Button>

      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: 24 }}>
        <div style={{
          width: 56,
          height: 56,
          borderRadius: 14,
          background: isFailed
            ? 'linear-gradient(135deg, #ff4d4f, #ff7875)'
            : isCompleted
              ? 'linear-gradient(135deg, #52c41a, #73d13d)'
              : 'linear-gradient(135deg, var(--primary), var(--primary-light))',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 12px',
          boxShadow: isFailed
            ? '0 4px 12px rgba(255,77,79,0.3)'
            : isCompleted
              ? '0 4px 12px rgba(82,196,26,0.3)'
              : '0 4px 12px rgba(22,119,255,0.3)',
        }}>
          {isFailed
            ? <CloseCircleOutlined style={{ fontSize: 28, color: '#fff' }} />
            : isCompleted
              ? <CheckCircleOutlined style={{ fontSize: 28, color: '#fff' }} />
              : <SyncOutlined spin style={{ fontSize: 28, color: '#fff' }} />
          }
        </div>
        <Title level={4} style={{ margin: 0, marginBottom: 4 }}>
          {isFailed ? '解析失败' : isCompleted ? '解析完成' : '正在解析'}
        </Title>
        <Text style={{ color: '#999', fontSize: 13 }}>
          {isFailed
            ? job.errorMessage || '处理过程中出现错误'
            : isCompleted
              ? '任务已成功生成，点击下方按钮查看'
              : '请稍候，系统正在处理您的输入'
          }
        </Text>
      </div>

      <Card style={{ borderRadius: 'var(--radius-lg)' }}>
        {/* Progress bar */}
        <Progress
          percent={job.progress}
          status={isFailed ? 'exception' : isCompleted ? 'success' : 'active'}
          style={{ marginBottom: 32 }}
          strokeColor={isFailed ? '#ff4d4f' : undefined}
          format={(p) => `${p}%`}
        />

        {/* Steps */}
        <Steps
          direction="vertical"
          current={currentIdx}
          status={isFailed ? 'error' : isCompleted ? 'finish' : 'process'}
          items={stages.map((s, idx) => ({
            title: s.label,
            description: s.description,
            status: idx < currentIdx ? 'finish' : idx === currentIdx ? (isFailed ? 'error' : 'process') : 'wait',
          }))}
          style={{ marginBottom: 16 }}
        />

        {/* Stage detail */}
        {!isFailed && !isCompleted && (
          <div style={{
            textAlign: 'center',
            padding: '12px 0',
            background: '#f6f8fa',
            borderRadius: 'var(--radius-sm)',
          }}>
            <Space>
              <SyncOutlined spin style={{ color: 'var(--primary)' }} />
              <Text style={{ color: '#666' }}>当前阶段：{job.stage}</Text>
            </Space>
          </div>
        )}

        {/* Failed state */}
        {isFailed && (
          <div style={{ textAlign: 'center', marginTop: 16 }}>
            <Button
              type="primary"
              size="large"
              onClick={() => navigate('/input')}
              icon={<ArrowLeftOutlined />}
              style={{ borderRadius: 'var(--radius-sm)' }}
            >
              重新上传
            </Button>
          </div>
        )}

        {/* Completed state */}
        {isCompleted && (
          <div style={{ textAlign: 'center', marginTop: 16 }}>
            <Button
              type="primary"
              size="large"
              icon={<CheckCircleOutlined />}
              onClick={() => navigate(`/tasks/${job.taskId}`)}
              style={{
                borderRadius: 'var(--radius-sm)',
                height: 48,
                padding: '0 36px',
                fontSize: 16,
              }}
            >
              查看生成结果
            </Button>
          </div>
        )}
      </Card>

      {/* AI Tip */}
      {!isFailed && !isCompleted && (
        <Card
          size="small"
          style={{ marginTop: 16, background: '#f0f5ff' }}
          bodyStyle={{ padding: '12px 16px' }}
        >
          <Space>
            <RobotOutlined style={{ color: 'var(--primary)' }} />
            <Text style={{ fontSize: 13, color: '#666' }}>
              解析完成后，AI 会自动生成任务、检查清单和提醒规则
            </Text>
          </Space>
        </Card>
      )}
    </div>
  )
}
