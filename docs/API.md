# 待办事项 AI Agent - API 接口文档

## 基础信息

- **Base URL**: `http://localhost:3000/api`
- **Content-Type**: `application/json`
- **统一响应格式**:
  ```json
  {
    "code": 200,
    "msg": "操作成功",
    "data": {}
  }
  ```

---

## 待办管理接口

### 1. 查询所有待办

**GET** `/todos`

#### 请求参数（Query）

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| status | string | 否 | 状态筛选：`pending` / `completed` |
| searchKey | string | 否 | 全文搜索关键词 |
| startDate | string | 否 | 开始时间（ISO 8601 格式） |
| endDate | string | 否 | 结束时间（ISO 8601 格式） |

#### 响应示例

```json
{
  "code": 200,
  "msg": "查询成功",
  "data": [
    {
      "id": "uuid-string",
      "title": "完成项目报告",
      "dueDate": "2026-05-26T09:00:00.000Z",
      "priority": "high",
      "status": "pending",
      "createdAt": "2026-05-25T08:00:00.000Z"
    }
  ]
}
```

---

### 2. 根据 ID 查询待办

**GET** `/todos/:id`

#### 路径参数

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| id | string | 是 | 待办唯一标识 |

#### 响应示例

```json
{
  "code": 200,
  "msg": "查询成功",
  "data": {
    "id": "uuid-string",
    "title": "完成项目报告",
    "dueDate": "2026-05-26T09:00:00.000Z",
    "priority": "high",
    "status": "pending",
    "createdAt": "2026-05-25T08:00:00.000Z"
  }
}
```

#### 错误响应

```json
{
  "code": 404,
  "msg": "未找到指定待办",
  "data": null
}
```

---

### 3. 根据标题搜索待办

**GET** `/todos/search?title=关键词`

#### 请求参数（Query）

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| title | string | 是 | 搜索关键词（模糊匹配） |

#### 响应示例

```json
{
  "code": 200,
  "msg": "查询成功",
  "data": [
    {
      "id": "uuid-string",
      "title": "完成项目报告",
      "dueDate": "2026-05-26T09:00:00.000Z",
      "priority": "high",
      "status": "pending",
      "createdAt": "2026-05-25T08:00:00.000Z"
    }
  ]
}
```

---

### 4. 创建待办

**POST** `/todos`

#### 请求体（Body）

| 字段名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| title | string | 是 | 待办标题（1-500 字符） |
| dueDate | string | 否 | 截止时间（ISO 8601 格式） |
| priority | string | 否 | 优先级：`high` / `medium` / `low`，默认 `medium` |

#### 请求示例

```json
{
  "title": "明天下午三点开会",
  "dueDate": "2026-05-26T15:00:00.000Z",
  "priority": "high"
}
```

#### 响应示例

```json
{
  "code": 200,
  "msg": "待办创建成功",
  "data": {
    "id": "uuid-string",
    "title": "明天下午三点开会",
    "dueDate": "2026-05-26T15:00:00.000Z",
    "priority": "high",
    "status": "pending",
    "createdAt": "2026-05-25T08:00:00.000Z"
  }
}
```

#### 验证错误响应

```json
{
  "code": 400,
  "msg": "待办标题不能为空",
  "data": null
}
```

---

### 5. 更新待办

**PUT** `/todos/:id`

#### 路径参数

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| id | string | 是 | 待办唯一标识 |

#### 请求体（Body）

| 字段名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| title | string | 否 | 待办标题（1-500 字符） |
| dueDate | string | 否 | 截止时间（ISO 8601 格式） |
| priority | string | 否 | 优先级：`high` / `medium` / `low` |
| status | string | 否 | 状态：`pending` / `completed` |

#### 请求示例

```json
{
  "title": "明天下午四点开会",
  "priority": "medium"
}
```

#### 响应示例

```json
{
  "code": 200,
  "msg": "待办更新成功",
  "data": {
    "id": "uuid-string",
    "title": "明天下午四点开会",
    "dueDate": "2026-05-26T15:00:00.000Z",
    "priority": "medium",
    "status": "pending",
    "createdAt": "2026-05-25T08:00:00.000Z"
  }
}
```

---

### 6. 删除待办（按 ID）

**DELETE** `/todos/:id`

#### 路径参数

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| id | string | 是 | 待办唯一标识 |

#### 响应示例

```json
{
  "code": 200,
  "msg": "待办删除成功",
  "data": null
}
```

#### 错误响应

```json
{
  "code": 404,
  "msg": "未找到指定待办",
  "data": null
}
```

---

### 7. 删除待办（按标题）

**DELETE** `/todos`

#### 请求体（Body）

| 字段名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| title | string | 是 | 待办标题（模糊匹配删除） |

#### 请求示例

```json
{
  "title": "开会"
}
```

#### 响应示例

```json
{
  "code": 200,
  "msg": "待办删除成功",
  "data": null
}
```

---

### 8. 清空所有待办

**DELETE** `/todos/all`

#### 响应示例

```json
{
  "code": 200,
  "msg": "已清空 5 条待办",
  "data": {
    "deletedCount": 5
  }
}
```

---

## 错误码说明

| 错误码 | 说明 |
|--------|------|
| 200 | 操作成功 |
| 400 | 请求参数错误（验证失败） |
| 404 | 资源不存在 |
| 500 | 服务器内部错误 |

---

## 测试示例

### 创建待办

```bash
curl -X POST http://localhost:3000/api/todos \
  -H "Content-Type: application/json" \
  -d '{
    "title": "明天下午三点开会",
    "dueDate": "2026-05-26T15:00:00.000Z",
    "priority": "high"
  }'
```

### 查询所有待办

```bash
curl http://localhost:3000/api/todos
```

### 根据标题搜索

```bash
curl "http://localhost:3000/api/todos/search?title=开会"
```

### 删除待办

```bash
curl -X DELETE http://localhost:3000/api/todos/uuid-string
```
