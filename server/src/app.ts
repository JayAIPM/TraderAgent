import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import { connectDB } from './config/db';
import { errorHandler, notFoundHandler } from './middlewares/errorHandler';
import todoRouter from './routers/todoRouter';
import agentRouter from './routers/agentRouter';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.get('/', (req, res) => {
  res.json({ code: 200, msg: '待办事项AI Agent服务已启动', data: null });
});

app.get('/ping', (req, res) => {
  console.log('📡 /ping 请求到达');
  res.json({ code: 200, msg: 'pong', data: new Date().toISOString() });
});

app.use('/api/todos', todoRouter);
app.use('/api/agent', agentRouter);

app.use(notFoundHandler);
app.use(errorHandler);

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
