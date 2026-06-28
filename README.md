# PlanFlow AI 🧠✨

> **多源信息转任务、时间轴与智能提醒系统**  
> 把杂乱信息自动转化成可执行的计划，让 AI 帮你管理待办。

[![Spring Boot](https://img.shields.io/badge/Spring%20Boot-3.2-green)](https://spring.io/projects/spring-boot)
[![React](https://img.shields.io/badge/React-18.3-61DAFB)](https://react.dev)
[![Capacitor](https://img.shields.io/badge/Capacitor-6-119EFF)](https://capacitorjs.com)
[![PaddleOCR](https://img.shields.io/badge/OCR-PaddleOCR-FF6F00)](#)

---

## 简介

**PlanFlow AI** —— 输入一句话、公告文本、图片截图或 PDF 文件，系统自动识别目标、拆解任务、生成时间轴和智能提醒。

传统待办 App 需要手动录入标题、时间和提醒。PlanFlow AI 通过 **OCR + 文档解析 + 大语言模型** 把非结构化信息自动转化为结构化任务计划，大幅降低信息整理成本。

---

## 功能一览

| 核心能力 | 说明 |
|---------|------|
| 📝 **多源输入** | 自然语言、公告文本、图片截图、PDF、Word 文件 |
| 👁 **OCR 识别** | PaddleOCR 提取图片中的文字 |
| 🤖 **AI 解析** | DeepSeek/Qwen 提取目标、任务、时间、约束、检查清单 |
| 📋 **任务管理** | 状态流转、优先级、筛选、手动创建 |
| ✅ **检查清单** | 自动生成可核对项，支持勾选 |
| 📅 **时间轴** | 按天/周展示截止事件、日程事件 |
| 🔔 **智能提醒** | 站内通知 + Android 本地通知，支持插件化扩展 |
| ⚡ **异步解析** | 后台任务队列，前端实时查看进度 |
| 📱 **双端复用** | React Web + Capacitor Android APK，一套代码 |

---

## 技术栈

| 层级 | 技术 |
|------|------|
| 前端 | React 18 + TypeScript + Vite + shadcn/ui + Zustand |
| 移动端 | Capacitor 6 + Local Notifications |
| 后端 | Spring Boot 3.2 + Java 17 + MyBatis Plus + Spring Security + JWT |
| 数据库 | MySQL 8 |
| OCR | PaddleOCR + FastAPI (Python) |
| AI 模型 | DeepSeek / Qwen API（统一接口，可切换） |

---

## 项目结构（Monorepo）

```
planflow-ai/
├── frontend/           # React + Capacitor 前端
│   ├── src/pages/      # 页面：Dashboard、Input、Tasks、Timeline...
│   ├── src/components/ # 通用组件
│   ├── src/services/   # API + 本地通知服务
│   └── src/stores/     # Zustand 状态管理
├── backend/            # Spring Boot 后端
│   ├── auth/           # 认证模块
│   ├── input/          # 输入源模块
│   ├── job/            # 异步任务队列
│   ├── extract/        # PDF/Word 文本提取
│   ├── ocr/            # OCR 调用
│   ├── ai/             # AI 解析 + Prompt
│   ├── task/           # 任务 + 检查清单
│   ├── timeline/       # 时间轴
│   ├── reminder/       # 提醒（插件化）
│   └── notification/   # 站内通知
├── ocr-service/        # PaddleOCR 独立服务
├── docs/               # 文档
├── docker-compose.yml
└── README.md
```

---

## 快速开始

### Docker Compose

```bash
cp .env.example .env
# 编辑 .env，至少填写 JWT_SECRET 和所选 AI Provider 的 API Key

cd frontend
npm install
npm run build
cd ..

docker compose up --build
```

默认端口来自 `.env`：Web `WEB_PORT`，后端 `BACKEND_PORT`，MySQL `MYSQL_PORT`，OCR `OCR_PORT`。如果本机端口被占用，直接修改 `.env` 后重新执行 `docker compose up --build`。

### 本地开发

```
# 后端
cd backend && ./mvnw spring-boot:run

# OCR 服务
cd ocr-service && pip install -r requirements.txt && python app/main.py

# 前端
cd frontend && npm install && npm run dev

# Android APK
cd frontend && npm run build && npx cap sync && npx cap open android
```

> 详细设计见 [docs/DESIGN.md](docs/DESIGN.md) | 开发排期见 [docs/ROADMAP.md](docs/ROADMAP.md)

---

## 文档

| 文档 | 说明 |
|------|------|
| [文档中心](docs/README.md) | 文档目录和阅读建议 |
| [系统设计](docs/DESIGN.md) | 系统架构、模块划分、数据流、插件化方案 |
| [需求规格说明书](docs/REQUIREMENTS.md) | 功能需求、非功能需求、MVP 范围 |
| [开发排期](docs/ROADMAP.md) | 分阶段开发计划、TODO 清单 |

---

## 许可证

本项目为《软件项目开发与实践》课程项目，仅供学习交流使用。

---

> **PlanFlow AI** — 让 AI 帮你把杂乱信息变成清晰计划。
