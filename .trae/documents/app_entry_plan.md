# Express 入口文件创建计划

## 1. 项目研究结论

### 1.1 当前项目状态
- 后端目录结构已创建：`server/src/{routers, controllers, services, models, skills, agent, utils, config}`
- 数据库连接配置已完成：`server/src/config/db.ts`
- Ollama 集成配置已完成：`server/src/config/ollama.ts`
- 依赖已安装：express、mongoose、axios、cors、body-parser

### 1.2 待完成任务
当前阶段一剩余任务：
- 1.5.2 创建 `server/src/app.ts` - Express 入口文件
- 1.5.3 配置中间件
- 1.5.4 创建根路由并测试启动

---

## 2. 文件和模块修改计划

### 2.1 创建文件
- `server/src/app.ts` - Express 主入口文件

### 2.2 配置内容
1. 导入必要依赖（express、cors、body-parser）
2. 创建 Express 应用实例
3. 配置中间件（cors、json、urlencoded）
4. 连接数据库（调用 connectDB）
5. 配置根路由
6. 启动服务监听

---

## 3. 实施步骤

### 步骤 1：创建 app.ts 入口文件
```typescript
// 导入依赖
import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import { connectDB } from './config/db';

// 创建应用实例
const app = express();
const PORT = process.env.PORT || 3000;

// 配置中间件
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// 根路由
app.get('/', (req, res) => {
  res.json({ code: 200, msg: '待办事项AI Agent服务已启动', data: null });
});

// 启动服务
const startServer = async () => {
  try {
    await connectDB();
    app.listen(PORT, () => {
      console.log(`✅ 服务器运行在 http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error('❌ 服务器启动失败:', error);
    process.exit(1);
  }
};

startServer();
```

### 步骤 2：启动测试
运行 `npm run dev` 启动开发服务器，验证：
- 数据库连接是否正常
- 服务器是否能正常启动
- 根路由是否能正常响应

---

## 4. 潜在依赖和考虑事项

### 4.1 依赖清单
| 依赖 | 用途 | 状态 |
|------|------|------|
| express | Web 框架 | ✅ 已安装 |
| cors | 跨域支持 | ✅ 已安装 |
| body-parser | 请求体解析 | ✅ 已安装 |
| mongoose | MongoDB ORM | ✅ 已安装 |

### 4.2 配置考虑
- 使用环境变量配置端口（默认 3000）
- 启用 CORS 支持前端访问
- 支持 JSON 和 URL 编码格式的请求体

---

## 5. 风险处理

### 5.1 数据库连接失败
- 处理方式：在启动前检查数据库连接
- 失败时输出错误信息并退出进程

### 5.2 端口占用
- 处理方式：使用环境变量 PORT 配置端口
- 建议使用 3000 作为默认端口

### 5.3 中间件顺序问题
- 确保 cors 中间件在路由之前配置
- 确保 body-parser 在路由之前配置

---

## 6. 验证标准

1. ✅ 服务器启动成功，控制台输出启动信息
2. ✅ 数据库连接成功，控制台输出连接成功信息
3. ✅ 访问 http://localhost:3000 返回成功响应
4. ✅ 响应格式符合统一格式：`{code, msg, data}`
