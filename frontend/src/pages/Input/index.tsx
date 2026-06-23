import React from 'react'
import { Card, Tabs, Input, Button, Upload, message, Typography, Space, Row, Col, Tag } from 'antd'
import {
  InboxOutlined, SendOutlined, FileTextOutlined, PictureOutlined,
  FilePdfOutlined, FileWordOutlined, RobotOutlined, BulbOutlined,
} from '@ant-design/icons'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { mockApi, isMockMode } from '../../services/mockData'
import http from '../../services/api'

const { TextArea } = Input
const { Dragger } = Upload
const { Title, Text } = Typography

const examples = [
  '下周五前提交软件项目立项书，包括背景、需求、功能模块、技术路线，周三答辩',
  '帮我安排下周的团队周会，准备会议议程和周报，周三前发会议纪要',
  '机房明天下午2点到4点停电，请提前备份数据和关闭服务器',
]

export default function InputPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [textValue, setTextValue] = React.useState(searchParams.get('content') || '')
  const [submitting, setSubmitting] = React.useState(false)
  const [fileList, setFileList] = React.useState<any[]>([])

  const handleTextSubmit = async () => {
    const content = textValue.trim()
    if (!content) {
      message.warning('请输入任务内容')
      return
    }
    setSubmitting(true)
    try {
      if (isMockMode()) {
        const res = await mockApi.createJob({ content })
        navigate(`/jobs/${res.data.jobId}`)
      } else {
        const res: any = await http.post('/inputs/text', { content })
        navigate(`/jobs/${res.data.jobId}`)
      }
    } catch {
      message.error('提交失败，请重试')
    } finally {
      setSubmitting(false)
    }
  }

  const handleFileSubmit = async () => {
    if (fileList.length === 0) {
      message.warning('请先上传文件')
      return
    }
    setSubmitting(true)
    try {
      const file = fileList[0].originFileObj || fileList[0]
      if (isMockMode()) {
        const res = await mockApi.createJob({ file })
        navigate(`/jobs/${res.data.jobId}`)
      } else {
        const formData = new FormData()
        formData.append('file', file)
        // Infer sourceType from file mime type
        const fileType = file.type || ''
        let sourceType = 'FILE'
        if (fileType.startsWith('image/')) sourceType = 'IMAGE'
        else if (fileType === 'application/pdf') sourceType = 'PDF'
        else if (fileType.includes('wordprocessingml')) sourceType = 'DOCX'
        formData.append('sourceType', sourceType)
        const res: any = await http.post('/inputs/upload', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        })
        navigate(`/jobs/${res.data.jobId}`)
      }
    } catch {
      message.error('上传失败，请重试')
    } finally {
      setSubmitting(false)
    }
  }

  const fileProps = {
    accept: '.jpg,.jpeg,.png,.webp,.pdf,.docx',
    multiple: false,
    fileList,
    beforeUpload: (file: File) => {
      const isValid = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document'].includes(file.type)
      if (!isValid) {
        message.error('不支持的文件格式')
        return Upload.LIST_IGNORE
      }
      const isLt20 = file.size / 1024 / 1024 < 20
      if (!isLt20) {
        message.error('文件大小不能超过20MB')
        return Upload.LIST_IGNORE
      }
      setFileList([file])
      return false
    },
    onRemove: () => setFileList([]),
  }

  return (
    <div className="page-container" style={{ padding: '16px 0', maxWidth: 720, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <Title level={4} style={{ margin: 0, marginBottom: 8 }}>📝 智能输入</Title>
        <Text style={{ color: '#666', fontSize: 14 }}>
          输入一段文本或上传文件，AI 会自动识别目标、拆解任务、设置截止时间并生成检查清单
        </Text>
      </div>

      <Row gutter={[16, 16]}>
        <Col xs={24} lg={16}>
          <Card
            style={{ borderRadius: 'var(--radius-md)' }}
            bodyStyle={{ padding: 0 }}
          >
            <Tabs
              defaultActiveKey="text"
              size="large"
              style={{ padding: '0 20px' }}
              items={[
                {
                  key: 'text',
                  label: (
                    <span>
                      <FileTextOutlined style={{ marginRight: 6 }} />
                      文本输入
                    </span>
                  ),
                  children: (
                    <div style={{ padding: '0 0 20px' }}>
                      <TextArea
                        rows={8}
                        placeholder="输入任务描述，例如：下周五前提交软件项目立项书..."
                        value={textValue}
                        onChange={e => setTextValue(e.target.value)}
                        style={{
                          borderRadius: 'var(--radius-sm)',
                          fontSize: 15,
                          lineHeight: 1.8,
                          resize: 'vertical',
                        }}
                      />

                      {/* Examples */}
                      <div style={{ marginTop: 16, marginBottom: 16 }}>
                        <Text style={{ fontSize: 12, color: '#999', display: 'block', marginBottom: 8 }}>
                          💡 试试这些示例：
                        </Text>
                        <Space wrap size={[6, 6]}>
                          {examples.map((ex, i) => (
                            <Tag
                              key={i}
                              style={{
                                cursor: 'pointer',
                                padding: '4px 12px',
                                fontSize: 12,
                                borderRadius: 12,
                                maxWidth: 240,
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                              }}
                              onClick={() => setTextValue(ex)}
                            >
                              {ex.slice(0, 30)}...
                            </Tag>
                          ))}
                        </Space>
                      </div>

                      <Button
                        type="primary"
                        size="large"
                        icon={<SendOutlined />}
                        onClick={handleTextSubmit}
                        loading={submitting}
                        style={{ borderRadius: 'var(--radius-sm)', height: 44, padding: '0 28px' }}
                      >
                        提交解析
                      </Button>
                    </div>
                  ),
                },
                {
                  key: 'file',
                  label: (
                    <span>
                      <PictureOutlined style={{ marginRight: 6 }} />
                      文件上传
                    </span>
                  ),
                  children: (
                    <div style={{ padding: '0 0 20px' }}>
                      <Dragger
                        {...fileProps}
                        style={{
                          borderRadius: 'var(--radius-md)',
                          background: '#fafafa',
                          border: '2px dashed #d9d9d9',
                          padding: 24,
                        }}
                      >
                        <p style={{ fontSize: 48, color: 'var(--primary)', marginBottom: 8 }}>
                          <InboxOutlined />
                        </p>
                        <p style={{ fontSize: 15, color: '#333', fontWeight: 500 }}>
                          点击或拖拽文件到此区域
                        </p>
                        <p style={{ fontSize: 13, color: '#999', marginTop: 4 }}>
                          支持 jpg / png / webp / pdf / docx 格式，单个文件不超过 20MB
                        </p>
                      </Dragger>

                      {fileList.length > 0 && (
                        <div style={{
                          marginTop: 12,
                          padding: '10px 14px',
                          background: '#f6f8fa',
                          borderRadius: 'var(--radius-sm)',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 8,
                        }}>
                          <FileTextOutlined style={{ color: 'var(--primary)' }} />
                          <Text style={{ fontSize: 13 }}>{fileList[0].name}</Text>
                          <Text style={{ fontSize: 12, color: '#999' }}>
                            ({(fileList[0].size / 1024).toFixed(1)} KB)
                          </Text>
                        </div>
                      )}

                      <Button
                        type="primary"
                        size="large"
                        icon={<SendOutlined />}
                        onClick={handleFileSubmit}
                        loading={submitting}
                        disabled={fileList.length === 0}
                        style={{
                          marginTop: 16,
                          borderRadius: 'var(--radius-sm)',
                          height: 44,
                          padding: '0 28px',
                        }}
                      >
                        提交解析
                      </Button>
                    </div>
                  ),
                },
              ]}
            />
          </Card>
        </Col>

        {/* Tips sidebar */}
        <Col xs={24} lg={8}>
          <Card
            size="small"
            style={{
              background: 'linear-gradient(135deg, #f0f5ff, #e6f4ff)',
              border: 'none',
              borderRadius: 'var(--radius-md)',
            }}
          >
            <Space direction="vertical" size={12} style={{ width: '100%' }}>
              <div>
                <RobotOutlined style={{ color: 'var(--primary)', fontSize: 18, marginRight: 8 }} />
                <Text strong>AI 能做什么？</Text>
              </div>
              <div style={{ fontSize: 13, color: '#555', lineHeight: 1.8 }}>
                <BulbOutlined style={{ marginRight: 6, color: 'var(--warning)' }} />
                从公告文本中提取任务和截止时间
              </div>
              <div style={{ fontSize: 13, color: '#555', lineHeight: 1.8 }}>
                <BulbOutlined style={{ marginRight: 6, color: 'var(--warning)' }} />
                解析图片/PDF中的通知文字
              </div>
              <div style={{ fontSize: 13, color: '#555', lineHeight: 1.8 }}>
                <BulbOutlined style={{ marginRight: 6, color: 'var(--warning)' }} />
                自动生成检查清单和提醒规则
              </div>
              <div style={{ fontSize: 13, color: '#555', lineHeight: 1.8 }}>
                <BulbOutlined style={{ marginRight: 6, color: 'var(--warning)' }} />
                识别时间冲突和潜在风险
              </div>
            </Space>
          </Card>

          <Card
            size="small"
            style={{ marginTop: 12, borderRadius: 'var(--radius-md)' }}
          >
            <Space direction="vertical" size={8} style={{ width: '100%' }}>
              <Text strong style={{ fontSize: 13 }}>支持的文件格式</Text>
              <div><Tag color="blue">JPG</Tag><Tag color="blue">PNG</Tag><Tag color="blue">WebP</Tag></div>
              <div><Tag color="green">PDF</Tag><Tag color="green">DOCX</Tag></div>
              <Text style={{ fontSize: 12, color: '#999' }}>单文件最大 20MB</Text>
            </Space>
          </Card>
        </Col>
      </Row>
    </div>
  )
}
