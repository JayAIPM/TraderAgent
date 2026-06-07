# 需求规格说明书（SRS）
## Plan-and-Execute 功能迭代

---

## 1. 迭代概述

| 项 | 内容 |
|---|---|
| 迭代名称 | Plan-and-Execute 规划与执行架构升级 |
| 迭代目标 | 从"一步到位"架构升级为"规划 → 执行 → 聚合"三步架构 |
| 状态管理 | 简单内存状态（方案 A），单次请求内有效 |
| 重试机制 | 支持，任意 step 失败终止整个流程 |
| 保留现有架构 | UnifiedExtractor 保留，但本阶段被完全替换 |
| 可选技术 | Redis（可选，暂不使用，先做内存状态） |

---

## 2. 新架构设计

### 2.1 Plan-and-Execute 流程

```
用户输入
    ↓
┌─────────────────────────────────────┐
│  1. Planner (规划器)                 │
│  输入：用户自然语言                  │
│  输出：Plan 结构化计划（steps[]）    │
└─────────────────────────────────────┘
    ↓
┌─────────────────────────────────────┐
│  2. Executor (执行器)                │
│  - 按顺序执行每个 step               │
│  - 调用对应 Service 方法             │
│  - 维护内存状态 ExecutionState       │
│  - 任意 step 失败立即终止            │
└─────────────────────────────────────┘
    ↓
┌─────────────────────────────────────┐
│  3. Aggregator (结果聚合)            │
│  - 汇总所有 step 结果                │
│  - 生成友好自然语言响应              │
└─────────────────────────────────────┘
    ↓
  返回用户
```

### 2.2 目录结构变更

```
server/src/
├── agent/
│   ├── UnifiedExtractor.ts        (保留，但本阶段不使用)
│   ├── Planner.ts                 (新增)
│   ├── Executor.ts                (新增)
│   └── Aggregator.ts              (新增)
├── schemas/
│   ├── agentSchemas.ts            (扩展：Plan/PlanStep Schema)
│   └── todoSchemas.ts
├── controllers/
│   └── AgentController.ts         (重构：集成 P&E 流程)
└── services/
    └── TodoService.ts             (保持不变)
```

---

## 3. 数据模型

### 3.1 Plan（计划）Schema

```typescript
import { z } from 'zod';

export const PlanStepSchema = z.object({
  id: z.string().describe('步骤唯一标识，如 step-1'),
  type: z.enum(['create', 'update', 'delete', 'query', 'clear']).describe('步骤类型'),
  description: z.string().describe('自然语言描述（用于展示）'),
  parameters: z.object({}).describe('执行该步骤需要的参数'),
  references: z.array(z.string()).optional().describe('依赖的其他步骤 ID'),
});

export const PlanSchema = z.object({
  thought: z.string().optional().describe('LLM 的思考过程'),
  steps: z.array(PlanStepSchema),
});

export type PlanStep = z.infer<typeof PlanStepSchema>;
export type Plan = z.infer<typeof PlanSchema>;
```

### 3.2 ExecutionState（执行状态）

```typescript
interface ExecutionState {
  stepResults: Map<string, any>;  // stepId -> result
  createdTodos: Map<string, string>;  // stepId -> todoId
  updatedTodos: Map<string, string>;  // stepId -> todoId
}
```

### 3.3 StepResult（步骤执行结果）

```typescript
interface StepResult {
  step: PlanStep;
  success: boolean;
  result?: any;
  error?: Error;
}
```

---

## 4. 核心功能规格

### 4.1 Planner（规划器）

| 规格项 | 详情 |
|-------|------|
| **输入** | 用户自然语言 + 当前日期 |
| **输出** | Plan 对象（JSON） |
| **Prompt 设计** | 明确要求分解步骤，支持 step-references 依赖关系 |
| **Zod 校验** | 完整校验，失败重试 2 次 |
| **示例输入** | "今晚八点看柯南，九点吃炸鸡" |
| **示例输出** | 见下方 4.1.1 |

#### 4.1.1 Planner 输出示例

```json
{
  "thought": "用户需要创建两个待办事项，分别在今晚20点和21点",
  "steps": [
    {
      "id": "step-1",
      "type": "create",
      "description": "创建看柯南的待办",
      "parameters": {
        "title": "看一集《怪盗基德》",
        "dueDate": "2026-06-07 20:00"
      },
      "references": []
    },
    {
      "id": "step-2",
      "type": "create",
      "description": "创建吃炸鸡的待办",
      "parameters": {
        "title": "吃炸鸡",
        "dueDate": "2026-06-07 21:00"
      },
      "references": []
    }
  ]
}
```

#### 4.1.2 Planner SYSTEM_PROMPT

```
你是一个待办事项规划器。请将用户需求分解为多个可执行步骤。

输出格式：
{
  "thought": "思考过程...",
  "steps": [
    {
      "id": "step-1",
      "type": "create | update | delete | query | clear",
      "description": "自然语言描述",
      "parameters": { ... },
      "references": ["step-0"]  // 如果依赖之前的步骤
    }
  ]
}

规划规则：
1. 每个步骤类型必须是：create/update/delete/query/clear 之一
2. 步骤 id 格式：step-1, step-2 递增
3. 如果某个步骤依赖之前的步骤（例如修改刚创建的待办），用 references 字段记录依赖的 step id
4. 当前日期：{CURRENT_DATE}
```

---

### 4.2 Executor（执行器）

| 规格项 | 详情 |
|-------|------|
| **输入** | Plan 对象 |
| **输出** | StepResult[] |
| **执行顺序** | 严格按 steps 顺序执行 |
| **失败处理** | 任意 step 失败 → 立即终止整个流程，返回已执行成功的部分 |
| **状态管理** | 内存状态 ExecutionState，单次请求内有效 |
| **依赖注入** | 如果 step 有 references，从 state 中注入依赖参数 |

#### 4.2.1 步骤类型映射

| Step 类型 | TodoService 方法 | 参数映射 |
|----------|----------------|---------|
| `create` | `createMany()` | `parameters` → CreateInput[] |
| `update` | `updateByTitle()` 或 `updateById()` | `parameters.oldTitle/oldId` + 其他字段 |
| `delete` | `deleteByTitle()` 或 `delete()` | `parameters.title/id` |
| `query` | `findAll()` | `parameters.queryOptions` |
| `clear` | `clearAll()` | 无参 |

#### 4.2.2 依赖注入场景示例

```
用户输入：创建一个待办，然后把它的时间改成21点

Step 1:
  id: step-1
  type: create
  parameters: { title: "测试待办", dueDate: "20:00" }

Step 2:
  id: step-2
  type: update
  references: ["step-1"]
  parameters: { dueDate: "21:00" }

执行时：
Step 1 执行成功 → state.createdTodos.set('step-1', 'todo-123')
Step 2 执行时，从 references 找到 step-1 → 自动注入 id=todo-123
```

---

### 4.3 Aggregator（结果聚合器）

| 规格项 | 详情 |
|-------|------|
| **输入** | StepResult[] + Plan |
| **输出** | 友好自然语言响应（字符串） |
| **规则** | 汇总所有 step 结果，用自然语言总结 |
| **示例输出** | "已为您创建2个待办：\n1. 看柯南 - 20:00\n2. 吃炸鸡 - 21:00" |

---

### 4.4 重试机制

| 规格项 | 详情 |
|-------|------|
| **Planner 重试** | Zod 校验失败时重试，最多 2 次 |
| **Executor 重试** | 单个 step 失败不重试，立即终止 |
| **整体失败处理** | 任意 step 失败 → 返回已执行成功的部分 + 失败原因 |

---

## 5. API 接口变更

### 5.1 Agent 接口保持不变

| 项 | 内容 |
|---|---|
| 路径 | `POST /api/agent/chat` |
| 输入 | `{ message: string }` |
| 输出 | 保持现有格式，无需变更 |

---

## 6. 实施阶段

### 阶段一：定义 Schema 和 Planner

| 子任务 | 内容 |
|-------|------|
| 1.1 | 在 schemas/agentSchemas.ts 中添加 Plan/PlanStep Schema |
| 1.2 | 创建 agent/Planner.ts，实现规划功能 |
| 1.3 | 编写 Planner 单元测试（可选） |

### 阶段二：实现 Executor 和状态管理

| 子任务 | 内容 |
|-------|------|
| 2.1 | 创建 agent/Executor.ts，实现执行调度逻辑 |
| 2.2 | 实现 ExecutionState 内存状态管理 |
| 2.3 | 实现 step 类型到 TodoService 方法的映射 |
| 2.4 | 实现依赖注入逻辑（references） |

### 阶段三：实现 Aggregator

| 子任务 | 内容 |
|-------|------|
| 3.1 | 创建 agent/Aggregator.ts |
| 3.2 | 实现结果聚合和自然语言生成 |

### 阶段四：集成和重构

| 子任务 | 内容 |
|-------|------|
| 4.1 | 修改 AgentController.ts，集成完整 P&E 流程 |
| 4.2 | 保留 UnifiedExtractor 但标记为 @deprecated（暂不删除） |
| 4.3 | 完整端到端测试 |

---

## 7. 验收标准

| 验收项 | 验收条件 |
|-------|---------|
| Planner 准确率 | 简单任务分解准确率达 90% 以上 |
| 执行顺序 | 严格按 steps 顺序执行 |
| 状态管理 | 支持 step 间依赖和参数注入（场景：创建后立即修改） |
| 失败处理 | 任意 step 失败时正确终止流程，并返回已执行部分 |
| 结果聚合 | 生成自然友好的响应 |
| 向后兼容 | 现有 API 调用方式保持不变 |

---

## 8. 可选：Redis 使用说明（暂不实施）

如果后续需要支持跨请求状态或更高级的功能，可以使用 Redis：

| 场景 | Redis 用途 |
|-----|-----------|
| 执行计划持久化 | 存储 Plan 对象，支持恢复执行 |
| 状态管理 | 替代内存状态，支持跨请求 |
| 锁 | 防止并发问题 |

本阶段先不引入 Redis，用简单内存状态实现。

---

## 9. 后续迭代规划（P&E v2.0）

| 功能项 | 描述 |
|-------|------|
| 持久化状态 | 使用 Redis，支持跨请求 |
| 分支和循环 | 支持条件执行和循环步骤 |
| 计划验证 | 执行前检查计划可行性（如时间冲突） |
| 计划反馈 | 允许用户确认/调整计划后再执行 |
