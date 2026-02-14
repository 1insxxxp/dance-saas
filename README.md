# Dance SaaS

舞蹈机构 SaaS 平台 Monorepo 项目。

## 技术栈

- **包管理**: pnpm
- **语言**: TypeScript
- **后端**: NestJS 11 + Express
- **前端**: Vue 3 + Vite 7

## 项目结构

```
dance-saas/
├── apps/
│   ├── server/        # 后端 API 服务 (NestJS)
│   └── student-h5/    # 学员端 H5 应用 (Vue + Vite)
├── packages/          # 共享包
└── pnpm-workspace.yaml
```

## 环境要求

- Node.js >= 18
- pnpm

## 快速开始

### 安装依赖

```bash
pnpm install
```

### 开发

**启动后端服务**

```bash
pnpm --filter server start:dev
```

**启动学员端 H5**

```bash
pnpm --filter student-h5 dev
```

### 构建

```bash
# 构建后端
pnpm --filter server build

# 构建学员端
pnpm --filter student-h5 build
```

## 应用说明

| 应用 | 说明 |
|------|------|
| `server` | NestJS 后端 API，提供课程等业务接口 |
| `student-h5` | 学员端 H5 页面，适配移动端访问 |

## License

Private
