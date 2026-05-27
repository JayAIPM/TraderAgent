# 待办事项 AI Agent - 项目重构方案

## 1. 项目现状分析

### 1.1 当前架构
```
┌─────────────────────────────────────────────────────────┐
│                    AgentController                       │
│          (路由入口 /api/agent/chat)                     │
└────────────────────────┬────────────────────────────────┘
                         │
            ┌────────────┴────────────┐
            │    AgentService         │
            │  (意图识别 - create/...)│
            └────────────┬────────────┘
                         │
    ┌────────────────────┼────────────────────┐
    │                    │                    │
┌───▼────────┐  ┌──────▼───────┐  ┌────────▼────────┐
│ CreateTodo │  │ QueryTodo    │  │ DeleteTodo     │
│ Skill      │  │ Skill        │  │ Skill          │
└───┬────────┘  └──────┬───────┘  └────────┬────────┘
    │                  │                   │
┌───▼──────────┐  ┌───▼──────────┐  ┌────▼──────────┐
│ParamExtractor│  │ParamExtractor│  │ParamExtractor │
└───┬──────────┘  └───┬──────────┘  └────┬──────────┘
    │                  │                   │
┌───▼───────────────────▼──────────────────▼───────┐
│                TodoService                        │
│            (数据层 CRUD)                          │
└──────────────────────────────────────────────────┘
```

### 1.2 现有问题
1. **意图识别与参数提取分离**：两次 LLM 调用，效率低
2. **不支持多意图/多条待办**：当前只能处理单条待办
3. **无 Zod 强校验**：LLM 输出仅靠 JSON.parse，缺少健壮校验
4. **代码冗余**：多个 Skill 都包含相同的参数提取逻辑

---

## 2. 重构目标

1. **LLM 一步到位**：意图识别 + 参数提取统一处理
2. **支持多任务**：单条输入可创建多条待办
3. **Structured Output**：利用 Ollama 结构化输出特性
4. **Zod 强校验**：新增 Zod schema，输出异常时最多重试 2 次
5. **架构精简**：减少不必要的分层，提升可维护性

---

## 3. 新架构设计

### 3.1 新架构流程图
```
┌─────────────────────────────────────────────────────────┐
│                    AgentController                       │
│          (路由入口 /api/agent/chat)                     │
└────────────────────────┬────────────────────────────────┘
                         │
            ┌────────────▼────────────┐
            │   UnifiedExtractor      │
            │  (统一提取器)           │
            │  - LLM 一步到位         │
            │  - Structured Output    │
            │  - Zod 强校验           │
            │  - 最多重试 2 次        │
            └────────────┬────────────┘
                         │
            ┌────────────▼────────────┐
            │   结果解析与分发         │
            └────────────┬────────────┘
                         │
    ┌────────────────────┼────────────────────┐
    │                    │                    │
┌───▼────────┐  ┌──────▼───────┐  ┌────────▼────────┐
│  批量创建  │  │   查询待办   │  │   删除/清空    │
│  待办     │  │              │  │                 │
└───┬────────┘  └──────┬───────┘  └────────┬────────┘
    │                  │                   │
┌───▼───────────────────▼──────────────────▼───────┐
│                TodoService                        │
│            (数据层 CRUD)                          │
└──────────────────────────────────────────────────┘
```

### 3.2 新增/变更文件清单

| 变更类型 | 文件路径 | 说明 |
|---------|---------|------|
| 新增 | [server/src/schemas/agentSchemas.ts](file:///Users/xiaer/works/TraderAgent/server/src/schemas/agentSchemas.ts) | Agent 统一提取器的 Zod Schema |
| 新增 | [server/src/agent/UnifiedExtractor.ts](file:///Users/xiaer/works/TraderAgent/server/src/agent/UnifiedExtractor.ts) | 统一提取器核心逻辑 |
| 修改 | [server/src/controllers/AgentController.ts](file:///Users/xiaer/works/TraderAgent/server/src/controllers/AgentController.ts) | 简化流程，调用新的提取器 |
| 修改 | [server/src/services/TodoService.ts](file:///Users/xiaer/works/TraderAgent/server/src/services/TodoService.ts) | 新增 `createMany` 批量创建方法 |
| 删除 | [server/src/agent/AgentService.ts](file:///Users/xiaer/works/TraderAgent/server/src/agent/AgentService.ts) | 不再单独做意图识别 |
| 删除 | [server/src/skills/](file:///Users/xiaer/works/TraderAgent/server/src/skills/) 目录下大部分文件 | 简化架构，不再需要单独 Skill |

---

## 4. 核心实现细节

### 4.1 Zod Schema 设计

```typescript
// server/src/schemas/agentSchemas.ts
import { z } from 'zod';

export const IntentType = z.enum(['create', 'query', 'delete', 'clear', 'unknown']);
export type IntentType = z.infer<typeof IntentType>;

export const TodoItemSchema = z.object({
  title: z.string().min(1).max(500),
  dueDate: z.string().optional(), // 'YYYY-MM-DD HH:mm' 格式
  priority: z.enum(['high', 'medium', 'low']).optional(),
});

export const UnifiedExtractResultSchema = z.object({
  intent: IntentType,
  confidence: z.number().min(0).max(1),
  todos: z.array(TodoItemSchema).optional(), // create 意图时必填
  queryOptions: z.object({
    status: z.enum(['pending', 'completed']).optional(),
    searchKey: z.string().optional(),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
  }).optional(), // query 意图时使用
  deleteInput: z.object({
    title: z.string().optional(),
    id: z.string().optional(),
  }).optional(), // delete 意图时使用
  message: z.string().optional(), // 最终给用户的响应消息
});
```

### 4.2 UnifiedExtractor 设计

```typescript
// server/src/agent/UnifiedExtractor.ts
import axios from 'axios';
import { z } from 'zod';
import { UnifiedExtractResultSchema } from '../schemas/agentSchemas';
import { OLLAMA_BASE_URL, MODEL_NAME } from '../config/ollama';

const SYSTEM_PROMPT = `你是一个专业的待办事项管理助手。
...
`;

export class UnifiedExtractor {
  async extract(input: string): Promise<z.infer<typeof UnifiedExtractResultSchema>> {
    // 1. 调用 Ollama Structured Output 或普通 JSON 输出
    // 2. Zod 校验
    // 3. 失败最多重试 2 次
    // 4. 返回解析结果
  }
}
```

### 4.3 TodoService 新增方法

```typescript
// server/src/services/TodoService.ts
export class TodoService {
  // ... 现有方法
  
  // 新增批量创建方法
  async createMany(inputs: CreateTodoInput[]): Promise<{
    successful: ITodo[];
    failed: Array<{ input: CreateTodoInput; error: string }>;
  }> {
    // 循环调用 create，收集成功/失败结果
  }
}
```

---

## 5. 响应格式设计

### 5.1 统一响应格式

```json
{
  "code": 200,
  "msg": "处理成功", // "处理成功" | "部分成功" | "处理失败"
  "data": {
    "intent": "create",
    "confidence": 0.95,
    "action": "创建待办事项",
    "result": {
      "successful": [
        { "id": "...", "title": "...", "dueDate": "...", ... }
      ],
      "failed": [
        { "title": "...", "error": "..." }
      ]
    }
  }
}
```

---

## 6. 执行计划

### 阶段一：Schema 与提取器实现（优先级：高）
1. 创建 [agentSchemas.ts](file:///Users/xiaer/works/TraderAgent/server/src/schemas/agentSchemas.ts)
2. 实现 [UnifiedExtractor.ts](file:///Users/xiaer/works/TraderAgent/server/src/agent/UnifiedExtractor.ts)
3. 单测：验证 LLM 输出 + Zod 校验

### 阶段二：服务层支持（优先级：中）
1. 修改 [TodoService.ts](file:///Users/xiaer/works/TraderAgent/server/src/services/TodoService.ts)，新增 `createMany`
2. 单测：批量创建功能

### 阶段三：Controller 重构（优先级：高）
1. 简化 [AgentController.ts](file:///Users/xiaer/works/TraderAgent/server/src/controllers/AgentController.ts)
2. 移除旧的 AgentService 依赖
3. 集成新的提取器与批量创建

### 阶段四：清理与测试（优先级：中）
1. 删除旧的 Skill 文件
2. 删除旧的 AgentService
3. 完整功能测试：多待办创建、查询、删除、清空

---

## 7. 边界情况处理

### 7.1 部分成功场景
- 创建 2 条待办，1 条成功 1 条失败
- 响应 code: 200, msg: "部分成功"
- 结果包含 successful 与 failed 数组

### 7.2 Zod 校验失败
- 失败最多重试 2 次
- 仍失败则返回 "处理失败，无法识别您的指令"

### 7.3 Ollama 不支持 Structured Output
- 降级为普通 JSON 输出 + Zod 校验
- 使用现有正则清洗 + Zod 兜底

---

## 8. 非目标

本次重构不涉及：
- 前端界面改动
- 新增功能（如编辑待办）
- 高并发优化
- 多语言支持

---

请审查此重构方案，确认：
1. 架构设计是否符合预期？
2. 是否需要补充其他细节？
3. 是否可以进入执行阶段？
