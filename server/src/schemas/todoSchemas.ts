import { z } from 'zod';

export const createTodoSchema = z.object({
  title: z.string().min(1, '待办标题不能为空').max(500, '待办标题不能超过500字符'),
  dueDate: z.string().datetime({ message: '截止时间格式不正确' }).optional(),
  priority: z.enum(['high', 'medium', 'low'], { message: '优先级只能是 high、medium 或 low' }).optional(),
});

export const updateTodoSchema = z.object({
  title: z.string().min(1, '待办标题不能为空').max(500, '待办标题不能超过500字符').optional(),
  dueDate: z.string().datetime({ message: '截止时间格式不正确' }).optional(),
  priority: z.enum(['high', 'medium', 'low'], { message: '优先级只能是 high、medium 或 low' }).optional(),
  status: z.enum(['pending', 'completed'], { message: '状态只能是 pending 或 completed' }).optional(),
});

export const todoIdSchema = z.object({
  id: z.string().min(1, '待办ID不能为空'),
});

export const searchByTitleSchema = z.object({
  title: z.string().min(1, '查询标题不能为空'),
});

export const queryTodosSchema = z.object({
  status: z.enum(['pending', 'completed']).optional(),
  searchKey: z.string().optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
});

export const deleteByTitleSchema = z.object({
  title: z.string().min(1, '待办标题不能为空'),
});
