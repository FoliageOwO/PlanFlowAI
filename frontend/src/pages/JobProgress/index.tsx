import React from 'react'
import { Card, Progress, Steps, Button, Result, Typography, Spin } from 'antd'
import { CheckCircleOutlined, SyncOutlined, CloseCircleOutlined, FileTextOutlined } from '@ant-design/icons'
import { useParams, useNavigate } from 'react-router-dom'
import { mockApi, isMockMode } from '../../services/mockData'
import http from '../../services/api'
import type { JobItem } from '../../services/mockData'

const { Title, Text } = Typography

const stages = [
  { key: 'UPLOADED', label: '已上传', icon: <FileTextOutlined /> },
  { key: 'TEXT_EXTRACTED', label: '文本提取', icon: <FileTextOutlined /> },
  { key: 'AI_PARSING', label: 'AI 解析中', icon: <SyncOutlined spin /> },
  { key: 'COMPLETED', label: '任务生成', icon: <CheckCircleOutlined /> },
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
    } finally {
      setLoading(false)
    }
  }, [id])

  React.useEffect(() => {
    fetchJob()
    const timer = setInterval(fetchJob, 2000)
    return () => clearInterval(timer)
  }, [fetchJob])

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: 80 }}>
        <Spin size="large" />
      </div>
    )
  }

  if (error || !job) {
    return (
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
    )
  }

  const currentIdx = stageIndex[job.status] ?? 0
  const isFailed = job.status === 'FAILED'
  const isCompleted = job.status === 'COMPLETED'

  return (
    <div className="page-container" style={{ padding: '16px 0', maxWidth: 600, margin: '0 auto' }}>
      <Title level={4} style={{ textAlign: 'center', marginBottom: 32 }}>任务解析进度</Title>

      <Card>
        <Progress
          percent={job.progress}
          status={isFailed ? 'exception' : isCompleted ? 'success' : 'active'}
          style={{ marginBottom: 32 }}
        />

        <Steps
          direction="vertical"
          current={currentIdx}
          status={isFailed ? 'error' : isCompleted ? 'finish' : 'process'}
          items={stages.map((s, idx) => ({
            title: s.label,
            icon: idx === currentIdx && !isCompleted && !isFailed ? s.icon : undefined,
            status: idx < currentIdx ? 'finish' : idx === currentIdx ? (isFailed ? 'error' : 'process') : 'wait',
          }))}
        />

        {isFailed && (
          <Result
            status="error"
            title="解析失败"
            subTitle={job.errorMessage || '处理过程中出现错误'}
            extra={
              <Button type="primary" onClick={() => navigate('/input')}>
                重新上传
              </Button>
            }
          />
        )}

        {isCompleted && (
          <div style={{ textAlign: 'center', marginTop: 24 }}>
            <CheckCircleOutlined style={{ fontSize: 48, color: '#52c41a', marginBottom: 16 }} />
            <Title level={5} style={{ color: '#52c41a' }}>任务已生成</Title>
            <Button
              type="primary"
              size="large"
              onClick={() => navigate(`/tasks/${job.taskId}`)}
            >
              查看结果
            </Button>
          </div>
        )}

        {!isFailed && !isCompleted && (
          <div style={{ textAlign: 'center', marginTop: 24 }}>
            <Text type="secondary">当前阶段：{job.stage}</Text>
          </div>
        )}
      </Card>
    </div>
  )
}
