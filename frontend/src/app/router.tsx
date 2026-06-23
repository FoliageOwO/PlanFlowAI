import React from 'react'
import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { Spin } from 'antd'
import { useAuthStore } from '../stores/authStore'
import ErrorBoundary from '../components/common/ErrorBoundary'
import AppLayout from './AppLayout'
import AdminLayout from './AdminLayout'
import Login from '../pages/Login'
import Register from '../pages/Register'
import Dashboard from '../pages/Dashboard'
import Input from '../pages/Input'
import JobProgress from '../pages/JobProgress'
import TaskList from '../pages/TaskList'
import TaskDetail from '../pages/TaskDetail'
import Timeline from '../pages/Timeline'
import Notifications from '../pages/Notifications'
import Settings from '../pages/Settings'
import AdminDashboard from '../pages/Admin/Dashboard'
import AdminUsers from '../pages/Admin/Users'

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const isLoggedIn = useAuthStore((s) => s.isLoggedIn)
  const location = useLocation()
  if (!isLoggedIn) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }
  return <ErrorBoundary>{children}</ErrorBoundary>
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const isLoggedIn = useAuthStore((s) => s.isLoggedIn)
  if (isLoggedIn) {
    return <Navigate to="/" replace />
  }
  return <ErrorBoundary>{children}</ErrorBoundary>
}

function AdminRoute({ children }: { children: React.ReactNode }) {
  const user = useAuthStore((s) => s.user)
  if (user?.role !== 'ADMIN') {
    return <Navigate to="/" replace />
  }
  return <ErrorBoundary>{children}</ErrorBoundary>
}

function UserRoute({ children }: { children: React.ReactNode }) {
  const user = useAuthStore((s) => s.user)
  if (user?.role === 'ADMIN') {
    return <Navigate to="/admin" replace />
  }
  return <ErrorBoundary>{children}</ErrorBoundary>
}

function PageWrapper({ children }: { children: React.ReactNode }) {
  return (
    <div className="animate-fade-in-up">
      <ErrorBoundary>{children}</ErrorBoundary>
    </div>
  )
}

export default function AppRouter() {
  const [ready, setReady] = React.useState(false)

  React.useEffect(() => {
    setReady(true)
  }, [])

  if (!ready) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <Spin size="large" />
      </div>
    )
  }

  return (
    <Routes>
      <Route path="/login" element={<PublicRoute><PageWrapper><Login /></PageWrapper></PublicRoute>} />
      <Route path="/register" element={<PublicRoute><PageWrapper><Register /></PageWrapper></PublicRoute>} />
      {/* User routes */}
      <Route path="/" element={<ProtectedRoute><UserRoute><AppLayout /></UserRoute></ProtectedRoute>}>
        <Route index element={<PageWrapper><Dashboard /></PageWrapper>} />
        <Route path="input" element={<PageWrapper><Input /></PageWrapper>} />
        <Route path="jobs/:id" element={<PageWrapper><JobProgress /></PageWrapper>} />
        <Route path="tasks" element={<PageWrapper><TaskList /></PageWrapper>} />
        <Route path="tasks/:id" element={<PageWrapper><TaskDetail /></PageWrapper>} />
        <Route path="timeline" element={<PageWrapper><Timeline /></PageWrapper>} />
        <Route path="notifications" element={<PageWrapper><Notifications /></PageWrapper>} />
        <Route path="settings" element={<PageWrapper><Settings /></PageWrapper>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
      {/* Admin routes */}
      <Route path="/admin" element={<ProtectedRoute><AdminRoute><AdminLayout /></AdminRoute></ProtectedRoute>}>
        <Route index element={<PageWrapper><AdminDashboard /></PageWrapper>} />
        <Route path="users" element={<PageWrapper><AdminUsers /></PageWrapper>} />
        <Route path="*" element={<Navigate to="/admin" replace />} />
      </Route>
    </Routes>
  )
}
