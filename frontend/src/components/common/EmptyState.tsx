import React from 'react'
import { Empty, Button, Typography } from 'antd'
import { useNavigate } from 'react-router-dom'

const { Text } = Typography

interface Props {
  description?: string
  actionText?: string
  actionPath?: string
  onAction?: () => void
  icon?: React.ReactNode
}

export default function EmptyState({
  description = '暂无数据',
  actionText,
  actionPath,
  onAction,
  icon,
}: Props) {
  const navigate = useNavigate()

  const handleAction = () => {
    if (onAction) {
      onAction()
    } else if (actionPath) {
      navigate(actionPath)
    }
  }

  return (
    <div style={{ padding: '32px 0' }}>
      <Empty
        image={icon || Empty.PRESENTED_IMAGE_SIMPLE}
        description={
          <Text style={{ color: '#999', fontSize: 14 }}>{description}</Text>
        }
      >
        {actionText && (
          <Button type="primary" onClick={handleAction}>
            {actionText}
          </Button>
        )}
      </Empty>
    </div>
  )
}
