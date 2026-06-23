import React from 'react'
import { Result, Button } from 'antd'

interface Props {
  children: React.ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

export default class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null })
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: 48, display: 'flex', justifyContent: 'center' }}>
          <Result
            status="error"
            title="页面渲染出错"
            subTitle={this.state.error?.message || '发生了意外错误'}
            extra={
              <Button type="primary" onClick={this.handleReset}>
                重试
              </Button>
            }
          />
        </div>
      )
    }
    return this.props.children
  }
}
