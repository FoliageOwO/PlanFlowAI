import React from 'react'
import { Card, Tabs, Input, Button, Upload, message, Typography } from 'antd'
import { InboxOutlined, SendOutlined } from '@ant-design/icons'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { mockApi, isMockMode } from '../../services/mockData'
import http from '../../services/api'

const { TextArea } = Input
const { Dragger } = Upload
const { Title, Text } = Typography

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
        const res: any = await http.post('/jobs', { content })
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
        const res: any = await http.post('/jobs/upload', formData, {
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
    <div className="page-container" style={{ padding: '16px 0' }}>
      <Title level={4} style={{ marginBottom: 16 }}>智能输入</Title>
      <Text type="secondary" style={{ display: 'block', marginBottom: 16 }}>
        输入文本或上传文件，AI将自动解析并生成任务
      </Text>

      <Card>
        <Tabs
          defaultActiveKey="text"
          items={[
            {
              key: 'text',
              label: '文本输入',
              children: (
                <div>
                  <TextArea
                    rows={6}
                    placeholder="输入任务描述，例如：帮我安排下周的团队周会，准备会议议程..."
                    value={textValue}
                    onChange={(e) => setTextValue(e.target.value)}
                    style={{ marginBottom: 16 }}
                  />
                  <Button
                    type="primary"
                    icon={<SendOutlined />}
                    onClick={handleTextSubmit}
                    loading={submitting}
                  >
                    提交解析
                  </Button>
                </div>
              ),
            },
            {
              key: 'file',
              label: '文件上传',
              children: (
                <div>
                  <Dragger {...fileProps}>
                    <p className="ant-upload-drag-icon">
                      <InboxOutlined />
                    </p>
                    <p className="ant-upload-text">点击或拖拽文件到此区域</p>
                    <p className="ant-upload-hint">
                      支持 jpg / png / webp / pdf / docx 格式，单个文件不超过 20MB
                    </p>
                  </Dragger>
                  {fileList.length > 0 && (
                    <div style={{ marginTop: 8, fontSize: 13, color: '#666' }}>
                      {fileList[0].name} ({(fileList[0].size / 1024).toFixed(1)} KB)
                    </div>
                  )}
                  <Button
                    type="primary"
                    icon={<SendOutlined />}
                    onClick={handleFileSubmit}
                    loading={submitting}
                    style={{ marginTop: 16 }}
                    disabled={fileList.length === 0}
                  >
                    提交解析
                  </Button>
                </div>
              ),
            },
          ]}
        />
      </Card>
    </div>
  )
}
