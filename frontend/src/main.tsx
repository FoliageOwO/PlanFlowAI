import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { ConfigProvider } from 'antd'
import CapacitorProvider from './app/CapacitorProvider'
import AppRouter from './app/router'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ConfigProvider theme={{ token: { colorPrimary: '#1677ff' } }}>
      <BrowserRouter>
        <CapacitorProvider>
          <AppRouter />
        </CapacitorProvider>
      </BrowserRouter>
    </ConfigProvider>
  </React.StrictMode>,
)
