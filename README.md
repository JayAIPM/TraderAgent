# 待办事项垂直 AI Agent

一个基于自然语言处理的智能待办事项管理助手，支持多意图识别、批量操作和智能时间解析。

## 功能特性

- **自然语言交互**：用日常对话方式管理待办，如"明天下午三点开会"、"删除买牛奶的待办"
- **多意图识别**：一句话可包含多个操作，如"先删除买牛奶，然后创建买香烟"
- **批量创建**：一次输入创建多个待办，如"今晚八点看柯南，九点吃炸鸡，十点睡觉"
- **智能时间解析**：支持"今晚"、"明天下午"、"后天早上"等自然语言时间
- **结构化输出**：使用 Zod 强类型验证，确保数据一致性
- **MVC 架构**：清晰的分层设计，便于维护和扩展

## 技术栈

### 后端

| 技术 | 说明 |
|-----|------|
| Node.js | 运行时环境 |
| Express | Web 框架 |
| MongoDB | 数据库 |
| Mongoose | ODM |
| Ollama | 本地 LLM 运行 |
| Zod | 参数验证 |
| TypeScript | 类型安全 |

### 前端

| 技术 | 说明 |
|-----|------|
| Vue 3 | 渐进式框架 |
| Element Plus | UI 组件库 |
| Tailwind CSS | 样式框架 |
| Axios | HTTP 客户端 |
| Vite | 构建工具 |

### AI 模型

- **模型**：gemma4:e2b-mlx（通过 Ollama 运行）
- **特性**：支持 JSON 结构化输出、语义理解、多任务拆分

## 项目结构

```
TraderAgent/
├── client/                    # 前端项目
│   ├── src/
│   │   ├── api/              # API 调用层
│   │   ├── components/       # Vue 组件
│   │   │   ├── ChatInterface.vue      # 聊天界面
│   │   │   ├── TodoList.vue           # 待办列表
│   │   │   └── ChatSkeleton.vue       # 加载骨架屏
│   │   ├── views/
│   │   │   └── MainLayout.vue         # 主布局
│   │   └── main.ts
│   └── package.json
│
├── server/                    # 后端项目
│   ├── src/
│   │   ├── agent/            # Agent 核心
│   │   │   ├── AgentService.ts        # 意图识别（旧）
│   │   │   └── UnifiedExtractor.ts    # 统一提取器（新）
│   │   ├── config/           # 配置文件
│   │   │   ├── db.ts                 # MongoDB 配置
│   │   │   └── ollama.ts             # Ollama 配置
│   │   ├── controllers/     # 控制器
│   │   │   ├── AgentController.ts    # Agent 控制器
│   │   │   └── TodoController.ts     # 待办 CRUD 控制器
│   │   ├── middlewares/      # 中间件
│   │   │   ├── errorHandler.ts        # 错误处理
│   │   │   └── validator.ts           # 参数验证
│   │   ├── models/           # 数据模型
│   │   │   └── Todo.ts               # 待办模型
│   │   ├── routers/          # 路由
│   │   │   ├── agentRouter.ts         # Agent 路由
│   │   │   └── todoRouter.ts         # 待办路由
│   │   ├── schemas/          # Zod Schema
│   │   │   ├── agentSchemas.ts       # Agent 相关 Schema
│   │   │   └── todoSchemas.ts        # 待办相关 Schema
│   │   ├── services/         # 服务层
│   │   │   └── TodoService.ts        # 待办业务逻辑
│   │   ├── skills/           # Agent 技能（旧）
│   │   │   ├── CreateTodoSkill.ts
│   │   │   ├── DeleteTodoSkill.ts
│   │   │   ├── QueryTodoSkill.ts
│   │   │   └── ClearTodosSkill.ts
│   │   └── app.ts            # 应用入口
│   └── package.json
│
├── docs/                     # 文档
│   ├── SRS.md                # 需求规格说明书
│   ├── API.md                # API 接口文档
│   └── REFACTOR_PLAN.md      # 重构计划
│
└── README.md                 # 项目说明
```

## 快速开始

### 环境要求

- Node.js >= 18.0.0
- MongoDB >= 6.0（本地或远程）
- Ollama >= 0.1.0

### 1. 克隆项目

```bash
cd TraderAgent
```

### 2. 安装依赖

```bash
# 安装后端依赖
cd server
npm install

# 安装前端依赖
cd ../client
npm install
```

### 3. 配置 Ollama

确保 Ollama 已安装并运行：

```bash
# 检查 Ollama 版本
ollama --version

# 确认 gemma4 模型已拉取（如果没有会自动下载）
ollama run gemma4:e2b-mlx
```

### 4. 启动服务

```bash
# 终端1：启动后端
cd server
npm run dev

# 终端2：启动前端
cd client
npm run dev
```

### 5. 访问应用

打开浏览器访问：http://localhost:5173

## API 接口

### Agent 接口

| 方法 | 路径 | 说明 |
|-----|------|-----|
| POST | /api/agent/chat | 自然语言对话，处理待办操作 |

**请求示例：**

```bash
# 创建单个待办
curl -X POST http://localhost:3000/api/agent/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "今晚八点洗澡"}'

# 创建多个待办
curl -X POST http://localhost:3000/api/agent/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "今晚八点看柯南，九点吃炸鸡，十点睡觉"}'

# 混合意图
curl -X POST http://localhost:3000/api/agent/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "先删除买牛奶，然后创建买香烟"}'
```

**响应示例：**

```json
{
  "code": 200,
  "msg": "全部成功",
  "data": {
    "actions": [
      {
        "type": "create",
        "success": true,
        "message": "创建2条待办事项",
        "data": {
          "successful": [...],
          "failed": []
        }
      }
    ],
    "totalSuccessful": 2,
    "totalFailed": 0
  }
}
```

### 待办 CRUD 接口

| 方法 | 路径 | 说明 |
|-----|------|-----|
| GET | /api/todos | 查询所有待办 |
| GET | /api/todos/:id | 根据 ID 查询 |
| POST | /api/todos | 创建待办 |
| PUT | /api/todos/:id | 更新待办 |
| DELETE | /api/todos/:id | 删除待办 |
| DELETE | /api/todos | 清空所有待办 |

## 使用示例

### 创建待办

```
用户：今晚八点先看一集《怪盗基德》，然后晚上九点就睡觉
系统：已为您创建2条待办事项：
      1. 看一集《怪盗基德》- 今晚 20:00
      2. 睡觉 - 今晚 21:00
```

### 删除待办

```
用户：先帮我删除买牛奶的待办，然后创建一条新的买香烟的待办
系统：已为您执行2个操作：
      - 删除"买牛奶" ✓
      - 创建"买香烟" ✓
```

### 修改待办

```
用户：现在决定睡觉时间改到晚上九点
系统：已将"睡觉"的时间修改为 21:00 ✓
```

### 查询待办

```
用户：显示所有待办
系统：当前共有3条待办：
      1. 看一集《怪盗基德》 - 今晚 20:00 [待完成]
      2. 睡觉 - 今晚 21:00 [待完成]
      3. 买香烟 - 未设置时间 [待完成]
```

### 清空待办

```
用户：清空所有待办
系统：已清空3条待办事项
```

## 架构说明

### Agent 执行流程（新架构）

```
用户输入
    ↓
┌─────────────────────────────────────┐
│  UnifiedExtractor                   │
│  - LLM 一步到位提取意图 + 参数       │
│  - Zod 强类型校验                   │
│  - 最多重试 2 次                    │
│  - 支持混合意图识别                 │
└─────────────────────────────────────┘
    ↓
┌─────────────────────────────────────┐
│  AgentController                    │
│  - 循环处理每个 action             │
│  - 分发到对应的 Service 方法        │
└─────────────────────────────────────┘
    ↓
┌─────────────────────────────────────┐
│  TodoService                        │
│  - createMany() - 批量创建          │
│  - updateByTitle() - 按标题更新      │
│  - deleteByTitle() - 按标题删除     │
│  - findAll() - 查询所有             │
│  - clearAll() - 清空               │
└─────────────────────────────────────┘
    ↓
  MongoDB
```

### 支持的意图类型

| 意图 | 说明 | 参数 |
|-----|------|-----|
| create | 创建待办 | todos[] |
| update | 更新待办 | updateInput |
| delete | 删除待办 | deleteInput |
| query | 查询待办 | queryOptions |
| clear | 清空待办 | 无 |
| unknown | 未知意图 | 拒绝处理 |

## 配置说明

### Ollama 配置

文件：`server/src/config/ollama.ts`

```typescript
export const OLLAMA_CONFIG = {
  BASE_URL: process.env.OLLAMA_BASE_URL || 'http://localhost:11434',
  MODEL_NAME: 'gemma4:e2b-mlx',
  TEMPERATURE: 0.1,
  MAX_TOKENS: 3000,
};
```

### MongoDB 配置

文件：`server/src/config/db.ts`

```typescript
export const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/todoagent';
```

## 开发指南

### 添加新的意图类型

1. 在 `schemas/agentSchemas.ts` 中定义新的 Schema
2. 在 `AgentController.ts` 中添加对应的 handler
3. 在 `UnifiedExtractor.ts` 的 SYSTEM_PROMPT 中添加示例

### 测试 UnifiedExtractor

```bash
cd server
npx ts-node test-unified-extractor.ts
```

### 项目规范

- 遵循 MVC 架构原则
- Controller：参数校验、调用 Service、封装响应
- Service：业务逻辑、数据操作
- Model：数据结构定义
- 使用 Zod 进行参数验证
- 使用 TypeScript 确保类型安全

## 许可证

ISC
