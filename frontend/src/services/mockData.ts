import type { Dayjs } from 'dayjs'
import dayjs from 'dayjs'

export interface ApiResponse<T = unknown> {
  code: number
  message: string
  data: T
}

export interface UserInfo {
  id: string
  username: string
  nickname: string
  role: 'USER' | 'ADMIN'
}

export interface LoginParams {
  username: string
  password: string
}

export interface RegisterParams {
  username: string
  password: string
  nickname: string
}

export interface TaskItem {
  id: string
  title: string
  description: string
  deadline: string
  priority: 'URGENT' | 'HIGH' | 'MEDIUM' | 'LOW'
  status: 'TODO' | 'DOING' | 'DONE' | 'CANCELLED'
  estimatedHours: number
  estimatedMinutes?: number
  sourceType: 'TEXT' | 'IMAGE' | 'FILE' | 'AUDIO'
  sourceEvidence: string
  constraints: string[]
  reminders: ReminderItem[]
  checklist: ChecklistItem[]
  aiSuggestion: string
  createdAt: string
  updatedAt: string
}

export interface ChecklistItem {
  id: string
  text: string
  done: boolean
}

export interface ReminderItem {
  id: string
  title?: string
  content?: string
  time: string
  channel: 'IN_APP' | 'LOCAL_APP' | 'BROWSER' | 'EMAIL' | 'SMS' | 'WEIXIN'
  status?: string
}

export interface JobItem {
  id: string
  status: 'PENDING' | 'RUNNING' | 'UPLOADED' | 'TEXT_EXTRACTED' | 'AI_PARSING' | 'COMPLETED' | 'FAILED'
  progress: number
  stage: string
  errorMessage?: string
  taskId?: string
  resultPath?: string
  taskCount?: number
  eventCount?: number
  sourceInputId?: string
  createdAt: string
}

export interface NotificationItem {
  id: string
  type: 'TASK_DEADLINE' | 'SYSTEM' | 'REMINDER' | 'SHARE'
  title: string
  content: string
  read: boolean
  relatedTaskId?: string
  createdAt: string
}

export interface TimelineEvent {
  id: string
  type: 'TASK_DEADLINE' | 'EVENT' | 'REMINDER' | 'PLAN_STEP'
  title: string
  description: string
  time: string
  endTime?: string
  location?: string
  sourceInputId?: string
  sourceEvidence?: string
  relatedTaskId?: string
}

// ─── Admin Types ──────────────────────────────────────
export interface AdminStats {
  todayRegistrations: number
  todayParseJobs: number
  todaySuccessCount: number
  todayFailCount: number
  systemHealth: {
    api: boolean
    database: boolean
    ocr: boolean
    ai?: boolean
  }
  recentJobs: Array<{
    id: string
    userName: string
    sourceType: string
    status: string
    createdAt: string
  }>
}

export interface AdminUser {
  id: string
  username: string
  nickname: string
  role: 'USER' | 'ADMIN'
  status: 'ACTIVE' | 'DISABLED'
  createdAt: string
}

// ─── Mock Users ───────────────────────────────────────
const mockUsers: Record<string, { password: string; nickname: string; role: 'USER' | 'ADMIN' }> = {
  admin: { password: '123456', nickname: '管理员', role: 'ADMIN' },
  test: { password: '123456', nickname: '测试用户', role: 'USER' },
}

// ─── Mock Tasks ───────────────────────────────────────
const now = dayjs()
const fmt = (d: Dayjs) => d.format('YYYY-MM-DD HH:mm:ss')

const mockTasks: TaskItem[] = [
  {
    id: 'task-1',
    title: '完成项目方案文档',
    description: '整理并撰写项目整体方案，包括技术选型、架构设计等',
    deadline: fmt(now.hour(18).minute(0)),
    priority: 'URGENT',
    status: 'DOING',
    estimatedHours: 4,
    sourceType: 'TEXT',
    sourceEvidence: '用户输入: "帮我写一份项目方案文档"',
    constraints: ['需要经过项目经理审核', '格式要求为 PDF'],
    reminders: [
      { id: 'rem-1', time: fmt(now.hour(17).minute(0)), channel: 'IN_APP' },
    ],
    checklist: [
      { id: 'cl-1', text: '确定文档大纲', done: true },
      { id: 'cl-2', text: '撰写技术方案部分', done: false },
      { id: 'cl-3', text: '撰写项目计划', done: false },
    ],
    aiSuggestion: '建议优先完成技术方案部分，预计需要2小时。可以考虑使用 draw.io 绘制架构图。',
    createdAt: fmt(now.subtract(2, 'day')),
    updatedAt: fmt(now.subtract(1, 'hour')),
  },
  {
    id: 'task-2',
    title: '准备季度汇报PPT',
    description: '汇总本季度工作成果，制作汇报演示文稿',
    deadline: fmt(now.add(1, 'day').hour(10).minute(0)),
    priority: 'HIGH',
    status: 'TODO',
    estimatedHours: 6,
    sourceType: 'TEXT',
    sourceEvidence: '用户输入: "帮我准备季度汇报PPT"',
    constraints: ['数据截止到上月末'],
    reminders: [],
    checklist: [
      { id: 'cl-4', text: '收集季度数据', done: false },
      { id: 'cl-5', text: '制作图表', done: false },
    ],
    aiSuggestion: '建议使用公司模板，重点展示关键指标和增长趋势。',
    createdAt: fmt(now.subtract(1, 'day')),
    updatedAt: fmt(now.subtract(1, 'day')),
  },
  {
    id: 'task-3',
    title: '修复登录页样式问题',
    description: '用户反馈登录页在移动端显示异常，需要修复CSS样式',
    deadline: fmt(now.add(2, 'day').hour(18).minute(0)),
    priority: 'MEDIUM',
    status: 'TODO',
    estimatedHours: 2,
    sourceType: 'IMAGE',
    sourceEvidence: '用户上传了截图: login_issue.png 显示按钮重叠',
    constraints: [],
    reminders: [
      { id: 'rem-2', time: fmt(now.add(2, 'day').hour(10).minute(0)), channel: 'IN_APP' },
    ],
    checklist: [],
    aiSuggestion: '检查移动端媒体查询，主要问题可能是 flex 布局在窄屏下的换行逻辑。',
    createdAt: fmt(now.subtract(3, 'day')),
    updatedAt: fmt(now.subtract(3, 'day')),
  },
  {
    id: 'task-4',
    title: '服务器迁移',
    description: '将应用从旧服务器迁移到新服务器，需要停机维护',
    deadline: fmt(now.subtract(1, 'day').hour(23).minute(59)),
    priority: 'URGENT',
    status: 'DONE',
    estimatedHours: 8,
    sourceType: 'TEXT',
    sourceEvidence: '用户输入: "安排服务器迁移"',
    constraints: ['需要提前通知所有用户', '迁移期间暂停服务'],
    reminders: [],
    checklist: [
      { id: 'cl-6', text: '备份数据库', done: true },
      { id: 'cl-7', text: '安装环境依赖', done: true },
      { id: 'cl-8', text: '迁移数据', done: true },
      { id: 'cl-9', text: '验证服务正常', done: true },
    ],
    aiSuggestion: '建议在凌晨进行迁移，最小化对用户的影响。',
    createdAt: fmt(now.subtract(5, 'day')),
    updatedAt: fmt(now.subtract(1, 'day')),
  },
  {
    id: 'task-5',
    title: '设计新首页方案',
    description: '根据用户反馈重新设计首页布局和交互',
    deadline: fmt(now.add(5, 'day').hour(18).minute(0)),
    priority: 'LOW',
    status: 'CANCELLED',
    estimatedHours: 12,
    sourceType: 'IMAGE',
    sourceEvidence: '用户上传了参考设计稿: homepage_v2.fig',
    constraints: ['需要适配暗黑模式'],
    reminders: [],
    checklist: [],
    aiSuggestion: '参考行业最佳实践，考虑使用卡片式布局提高信息可读性。',
    createdAt: fmt(now.subtract(7, 'day')),
    updatedAt: fmt(now.subtract(2, 'day')),
  },
  {
    id: 'task-6',
    title: '数据库性能优化',
    description: '慢查询分析和索引优化，提升API响应速度',
    deadline: fmt(now.add(3, 'day').hour(18).minute(0)),
    priority: 'HIGH',
    status: 'DOING',
    estimatedHours: 8,
    sourceType: 'TEXT',
    sourceEvidence: '用户输入: "数据库查询太慢了，需要优化"',
    constraints: ['优化期间不能影响线上服务'],
    reminders: [],
    checklist: [
      { id: 'cl-10', text: '分析慢查询日志', done: true },
      { id: 'cl-11', text: '优化索引结构', done: false },
      { id: 'cl-12', text: '重构复杂查询', done: false },
    ],
    aiSuggestion: '优先优化频繁执行的查询，考虑添加 Redis 缓存。',
    createdAt: fmt(now.subtract(2, 'day')),
    updatedAt: fmt(now.subtract(4, 'hour')),
  },
  {
    id: 'task-7',
    title: '撰写用户手册',
    description: '编写面向终端用户的系统使用手册',
    deadline: fmt(now.add(7, 'day').hour(18).minute(0)),
    priority: 'MEDIUM',
    status: 'TODO',
    estimatedHours: 16,
    sourceType: 'FILE',
    sourceEvidence: '用户上传了: 需求文档_v3.docx',
    constraints: ['需要包含截图示例', '最终输出为PDF格式'],
    reminders: [],
    checklist: [],
    aiSuggestion: '按功能模块分章节，每个操作步骤配图说明。',
    createdAt: fmt(now.subtract(4, 'day')),
    updatedAt: fmt(now.subtract(4, 'day')),
  },
  {
    id: 'task-8',
    title: '第三方支付对接',
    description: '接入微信支付和支付宝支付SDK',
    deadline: fmt(now.add(10, 'day').hour(18).minute(0)),
    priority: 'HIGH',
    status: 'TODO',
    estimatedHours: 20,
    sourceType: 'TEXT',
    sourceEvidence: '用户输入: "需要接入支付功能"',
    constraints: ['需要申请商户号', '需要通过安全审计'],
    reminders: [],
    checklist: [],
    aiSuggestion: '先接入微信支付，支付宝接口规范类似可复用部分代码。',
    createdAt: fmt(now.subtract(6, 'day')),
    updatedAt: fmt(now.subtract(6, 'day')),
  },
]

// ─── Mock Notifications ───────────────────────────────
const mockNotifications: NotificationItem[] = [
  {
    id: 'notif-1',
    type: 'TASK_DEADLINE',
    title: '任务即将截止',
    content: '「完成项目方案文档」将在今天18:00截止',
    read: false,
    relatedTaskId: 'task-1',
    createdAt: fmt(now.subtract(1, 'hour')),
  },
  {
    id: 'notif-2',
    type: 'REMINDER',
    title: '提醒：准备汇报PPT',
    content: '「准备季度汇报PPT」距截止还有1天，请及时处理',
    read: false,
    relatedTaskId: 'task-2',
    createdAt: fmt(now.subtract(2, 'hour')),
  },
  {
    id: 'notif-3',
    type: 'SYSTEM',
    title: '系统维护通知',
    content: '本周日凌晨2:00-4:00进行系统升级维护',
    read: true,
    createdAt: fmt(now.subtract(1, 'day')),
  },
  {
    id: 'notif-4',
    type: 'SHARE',
    title: '任务被分享',
    content: '用户「张三」将任务「数据库性能优化」分享给了你',
    read: false,
    relatedTaskId: 'task-6',
    createdAt: fmt(now.subtract(3, 'hour')),
  },
]

// ─── Mock Timeline Events ─────────────────────────────
const mockTimelineEvents: TimelineEvent[] = [
  {
    id: 'evt-1',
    type: 'TASK_DEADLINE',
    title: '完成项目方案文档 - 截止',
    description: '截止时间 18:00',
    time: fmt(now.hour(18).minute(0)),
    relatedTaskId: 'task-1',
  },
  {
    id: 'evt-2',
    type: 'REMINDER',
    title: '提醒：项目方案文档提交前检查',
    description: '17:00 提醒检查文档完整性',
    time: fmt(now.hour(17).minute(0)),
    relatedTaskId: 'task-1',
  },
  {
    id: 'evt-3',
    type: 'PLAN_STEP',
    title: '计划：开始撰写技术方案',
    description: 'AI建议的规划步骤',
    time: fmt(now.hour(14).minute(0)),
    relatedTaskId: 'task-1',
  },
  {
    id: 'evt-4',
    type: 'EVENT',
    title: '团队周会',
    description: '每周一上午站会',
    time: fmt(now.add(1, 'day').hour(10).minute(0)),
  },
  {
    id: 'evt-5',
    type: 'TASK_DEADLINE',
    title: '准备季度汇报PPT - 截止',
    description: '明天上午10:00截止',
    time: fmt(now.add(1, 'day').hour(10).minute(0)),
    relatedTaskId: 'task-2',
  },
  {
    id: 'evt-6',
    type: 'REMINDER',
    title: '提醒：修复登录页样式',
    description: '后天上午10:00 提醒检查进度',
    time: fmt(now.add(2, 'day').hour(10).minute(0)),
    relatedTaskId: 'task-3',
  },
  {
    id: 'evt-7',
    type: 'TASK_DEADLINE',
    title: '数据库性能优化 - 截止',
    description: '3天后截止',
    time: fmt(now.add(3, 'day').hour(18).minute(0)),
    relatedTaskId: 'task-6',
  },
]

// ─── Mock Jobs ────────────────────────────────────────
const mockJobs: Record<string, JobItem> = {
  'job-1': {
    id: 'job-1',
    status: 'AI_PARSING',
    progress: 65,
    stage: 'AI 解析中',
    createdAt: fmt(now.subtract(5, 'minute')),
  },
  'job-2': {
    id: 'job-2',
    status: 'COMPLETED',
    progress: 100,
    stage: '任务生成',
    taskId: 'task-1',
    createdAt: fmt(now.subtract(1, 'hour')),
  },
  'job-3': {
    id: 'job-3',
    status: 'FAILED',
    progress: 30,
    stage: '文本提取',
    errorMessage: '文件格式不支持，仅支持 jpg/png/webp/pdf/docx',
    createdAt: fmt(now.subtract(2, 'hour')),
  },
}

// ─── Mock API functions ───────────────────────────────
const delay = (ms = 500) => new Promise((r) => setTimeout(r, ms))

export const mockApi = {
  // Auth
  async login(params: LoginParams): Promise<ApiResponse<{ token: string; user: UserInfo }>> {
    await delay()
    const user = mockUsers[params.username]
    if (!user || user.password !== params.password) {
      return { code: 401, message: '用户名或密码错误', data: null as unknown as never }
    }
    return {
      code: 0,
      message: 'ok',
      data: {
        token: `mock-token-${params.username}-${Date.now()}`,
        user: { id: 'u1', username: params.username, nickname: user.nickname, role: user.role },
      },
    }
  },

  async register(params: RegisterParams): Promise<ApiResponse<null>> {
    await delay()
    if (mockUsers[params.username]) {
      return { code: 400, message: '用户名已存在', data: null }
    }
    mockUsers[params.username] = { password: params.password, nickname: params.nickname, role: 'USER' }
    return { code: 0, message: 'ok', data: null }
  },

  // Tasks
  async getTaskList(params?: { filter?: string; search?: string; page?: number; pageSize?: number }): Promise<ApiResponse<{ list: TaskItem[]; total: number }>> {
    await delay(300)
    let list = [...mockTasks]
    if (params?.filter) {
      const f = params.filter
      if (f === 'today') {
        list = list.filter((t) => dayjs(t.deadline).isSame(now, 'day'))
      } else if (f === 'due') {
        list = list.filter((t) => dayjs(t.deadline).isAfter(now) && dayjs(t.deadline).isBefore(now.add(3, 'day')) && t.status !== 'DONE')
      } else if (f === 'overdue') {
        list = list.filter((t) => dayjs(t.deadline).isBefore(now) && t.status !== 'DONE')
      } else if (f === 'done') {
        list = list.filter((t) => t.status === 'DONE')
      }
    }
    if (params?.search) {
      const s = params.search.toLowerCase()
      list = list.filter((t) => t.title.toLowerCase().includes(s))
    }
    const total = list.length
    const page = params?.page || 1
    const pageSize = params?.pageSize || 20
    const paged = list.slice((page - 1) * pageSize, page * pageSize)
    return { code: 0, message: 'ok', data: { list: paged, total } }
  },

  async getTaskDetail(id: string): Promise<ApiResponse<TaskItem | null>> {
    await delay(200)
    const task = mockTasks.find((t) => t.id === id)
    if (!task) return { code: 404, message: '任务不存在', data: null }
    return { code: 0, message: 'ok', data: task }
  },

  async createTask(data: Partial<TaskItem>): Promise<ApiResponse<TaskItem>> {
    await delay()
    const task: TaskItem = {
      id: `task-${Date.now()}`,
      title: data.title || '',
      description: data.description || '',
      deadline: data.deadline || fmt(now.add(1, 'day')),
      priority: data.priority || 'MEDIUM',
      status: 'TODO',
      estimatedHours: data.estimatedHours || 0,
      sourceType: data.sourceType || 'TEXT',
      sourceEvidence: data.sourceEvidence || '',
      constraints: data.constraints || [],
      reminders: data.reminders || [],
      checklist: data.checklist || [],
      aiSuggestion: data.aiSuggestion || '',
      createdAt: fmt(now),
      updatedAt: fmt(now),
    }
    mockTasks.unshift(task)
    return { code: 0, message: 'ok', data: task }
  },

  async updateTask(id: string, data: Partial<TaskItem>): Promise<ApiResponse<TaskItem | null>> {
    await delay()
    const idx = mockTasks.findIndex((t) => t.id === id)
    if (idx === -1) return { code: 404, message: '任务不存在', data: null }
    mockTasks[idx] = { ...mockTasks[idx], ...data, updatedAt: fmt(now) }
    return { code: 0, message: 'ok', data: mockTasks[idx] }
  },

  async deleteTask(id: string): Promise<ApiResponse<null>> {
    await delay()
    const idx = mockTasks.findIndex((t) => t.id === id)
    if (idx === -1) return { code: 404, message: '任务不存在', data: null }
    mockTasks.splice(idx, 1)
    return { code: 0, message: 'ok', data: null }
  },

  // Checklist
  async updateChecklist(taskId: string, items: ChecklistItem[]): Promise<ApiResponse<TaskItem | null>> {
    await delay(200)
    const task = mockTasks.find((t) => t.id === taskId)
    if (!task) return { code: 404, message: '任务不存在', data: null }
    task.checklist = items
    task.updatedAt = fmt(now)
    return { code: 0, message: 'ok', data: task }
  },

  // Jobs
  async getJob(id: string): Promise<ApiResponse<JobItem | null>> {
    await delay(200)
    const job = mockJobs[id]
    if (!job) return { code: 404, message: '任务不存在', data: null }
    // Simulate progress for job-1
    if (id === 'job-1' && job.status === 'AI_PARSING') {
      const newProgress = Math.min(100, job.progress + Math.floor(Math.random() * 15) + 5)
      if (newProgress >= 100) {
        job.status = 'COMPLETED'
        job.progress = 100
        job.stage = '任务生成'
        job.taskId = 'task-1'
      } else {
        job.progress = newProgress
        if (newProgress < 40) {
          job.stage = '文本提取'
          job.status = 'TEXT_EXTRACTED'
        } else {
          job.stage = 'AI 解析中'
          job.status = 'AI_PARSING'
        }
      }
    }
    return { code: 0, message: 'ok', data: { ...job } }
  },

  async createJob(params: { content?: string; file?: File }): Promise<ApiResponse<{ jobId: string }>> {
    await delay()
    const jobId = `job-${Date.now()}`
    mockJobs[jobId] = {
      id: jobId,
      status: 'UPLOADED',
      progress: 5,
      stage: '已上传',
      createdAt: fmt(now),
    }
    return { code: 0, message: 'ok', data: { jobId } }
  },

  // Notifications
  async getNotifications(params?: { page?: number; pageSize?: number; unreadOnly?: boolean }): Promise<ApiResponse<{ list: NotificationItem[]; total: number }>> {
    await delay(300)
    let list = [...mockNotifications]
    if (params?.unreadOnly) {
      list = list.filter((n) => !n.read)
    }
    const total = list.length
    const page = params?.page || 1
    const pageSize = params?.pageSize || 20
    return { code: 0, message: 'ok', data: { list: list.slice((page - 1) * pageSize, page * pageSize), total } }
  },

  async markAllNotificationsRead(): Promise<ApiResponse<null>> {
    await delay()
    mockNotifications.forEach((n) => { n.read = true })
    return { code: 0, message: 'ok', data: null }
  },

  async getUnreadCount(): Promise<ApiResponse<number>> {
    await delay(100)
    return { code: 0, message: 'ok', data: mockNotifications.filter((n) => !n.read).length }
  },

  // Timeline
  async getTimelineEvents(): Promise<ApiResponse<TimelineEvent[]>> {
    await delay(300)
    return { code: 0, message: 'ok', data: [...mockTimelineEvents] }
  },

  // Dashboard
  async getDashboardTasks(): Promise<ApiResponse<{ today: TaskItem[]; upcoming: TaskItem[]; overdue: TaskItem[] }>> {
    await delay(300)
    const today = mockTasks.filter((t) => dayjs(t.deadline).isSame(now, 'day'))
    const upcoming = mockTasks.filter((t) => dayjs(t.deadline).isAfter(now) && dayjs(t.deadline).isBefore(now.add(3, 'day')) && t.status !== 'DONE')
    const overdue = mockTasks.filter((t) => dayjs(t.deadline).isBefore(now) && t.status !== 'DONE')
    return { code: 0, message: 'ok', data: { today, upcoming, overdue } }
  },

  // Settings
  async updateProfile(data: { nickname: string }): Promise<ApiResponse<UserInfo>> {
    await delay()
    return {
      code: 0, message: 'ok',
      data: { id: 'u1', username: 'admin', nickname: data.nickname, role: 'ADMIN' },
    }
  },

  // Admin
  async getAdminStats(): Promise<ApiResponse<AdminStats>> {
    await delay(300)
    return {
      code: 0, message: 'ok',
      data: {
        todayRegistrations: 12,
        todayParseJobs: 48,
        todaySuccessCount: 45,
        todayFailCount: 3,
        systemHealth: { api: true, database: true, ocr: true, ai: true },
        recentJobs: [
          { id: 'job-r1', userName: '测试用户', sourceType: 'TEXT', status: 'COMPLETED', createdAt: fmt(now.subtract(1, 'minute')) },
          { id: 'job-r2', userName: '张三', sourceType: 'IMAGE', status: 'COMPLETED', createdAt: fmt(now.subtract(5, 'minute')) },
          { id: 'job-r3', userName: '李四', sourceType: 'FILE', status: 'AI_PARSING', createdAt: fmt(now.subtract(10, 'minute')) },
          { id: 'job-r4', userName: '测试用户', sourceType: 'TEXT', status: 'FAILED', createdAt: fmt(now.subtract(15, 'minute')) },
          { id: 'job-r5', userName: '王五', sourceType: 'TEXT', status: 'COMPLETED', createdAt: fmt(now.subtract(20, 'minute')) },
          { id: 'job-r6', userName: '测试用户', sourceType: 'IMAGE', status: 'COMPLETED', createdAt: fmt(now.subtract(25, 'minute')) },
          { id: 'job-r7', userName: '赵六', sourceType: 'FILE', status: 'COMPLETED', createdAt: fmt(now.subtract(30, 'minute')) },
          { id: 'job-r8', userName: '张三', sourceType: 'TEXT', status: 'TEXT_EXTRACTED', createdAt: fmt(now.subtract(35, 'minute')) },
          { id: 'job-r9', userName: '李四', sourceType: 'IMAGE', status: 'COMPLETED', createdAt: fmt(now.subtract(40, 'minute')) },
          { id: 'job-r10', userName: '王五', sourceType: 'TEXT', status: 'COMPLETED', createdAt: fmt(now.subtract(45, 'minute')) },
        ],
      },
    }
  },

  async getAdminUsers(params?: { search?: string }): Promise<ApiResponse<{ list: AdminUser[]; total: number }>> {
    await delay(300)
    const allUsers: AdminUser[] = [
      { id: 'u-admin', username: 'admin', nickname: '管理员', role: 'ADMIN', status: 'ACTIVE', createdAt: fmt(now.subtract(30, 'day')) },
      { id: 'u-test', username: 'test', nickname: '测试用户', role: 'USER', status: 'ACTIVE', createdAt: fmt(now.subtract(20, 'day')) },
      { id: 'u-zhang', username: 'zhangsan', nickname: '张三', role: 'USER', status: 'ACTIVE', createdAt: fmt(now.subtract(15, 'day')) },
      { id: 'u-li', username: 'lisi', nickname: '李四', role: 'USER', status: 'ACTIVE', createdAt: fmt(now.subtract(10, 'day')) },
      { id: 'u-wang', username: 'wangwu', nickname: '王五', role: 'USER', status: 'DISABLED', createdAt: fmt(now.subtract(7, 'day')) },
      { id: 'u-zhao', username: 'zhaoliu', nickname: '赵六', role: 'USER', status: 'ACTIVE', createdAt: fmt(now.subtract(5, 'day')) },
      { id: 'u-sun', username: 'sunqi', nickname: '孙七', role: 'USER', status: 'ACTIVE', createdAt: fmt(now.subtract(3, 'day')) },
      { id: 'u-zhou', username: 'zhouba', nickname: '周八', role: 'USER', status: 'DISABLED', createdAt: fmt(now.subtract(1, 'day')) },
    ]
    let list = [...allUsers]
    if (params?.search) {
      const s = params.search.toLowerCase()
      list = list.filter((u) => u.username.includes(s) || u.nickname.includes(s))
    }
    return { code: 0, message: 'ok', data: { list, total: list.length } }
  },

  async toggleUserStatus(userId: string): Promise<ApiResponse<null>> {
    await delay(300)
    return { code: 0, message: 'ok', data: null }
  },
}

// Helper to determine if mock mode is on
export const isMockMode = (): boolean => {
  return import.meta.env.VITE_USE_MOCK === 'true'
}
