import React from 'react'
import { Spin, Typography } from 'antd'

const { Text } = Typography

interface Props {
  tip?: string
  fullPage?: boolean
}

export default function Loading({ tip = '加载中...', fullPage = false }: Props) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: fullPage ? 0 : '48px 0',
        minHeight: fullPage ? '100vh' : 200,
      }}
    >
      <Spin size="large" />
      {tip && (
        <Text style={{ color: '#999', marginTop: 12, fontSize: 14 }}>
          {tip}
        </Text>
      )}
    </div>
  )
}
