import { z } from 'zod';

export const ActionType = z.enum(['create', 'query', 'delete', 'clear', 'update', 'unknown']);
export type ActionType = z.infer<typeof ActionType>;

export const TodoItemSchema = z.object({
  title: z.string().min(1, '待办标题不能为空').max(500, '待办标题不能超过500字符'),
  dueDate: z.string().optional(),
  priority: z.enum(['high', 'medium', 'low']).optional(),
});

export const QueryOptionsSchema = z.object({
  status: z.enum(['pending', 'completed']).optional(),
  searchKey: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});

export const DeleteInputSchema = z.object({
  title: z.string().optional(),
  id: z.string().optional(),
});

export const UpdateInputSchema = z.object({
  id: z.string().optional(),
  oldTitle: z.string().optional(), // 用于查找的旧标题
  title: z.string().min(1).max(500).optional(),
  dueDate: z.string().optional(),
  priority: z.enum(['high', 'medium', 'low']).optional(),
  status: z.enum(['pending', 'completed']).optional(),
});

export const ActionSchema = z.object({
  type: ActionType,
  confidence: z.number().min(0).max(1),
  todos: z.array(TodoItemSchema).optional(), // create 意图用
  queryOptions: QueryOptionsSchema.optional(), // query 意图用
  deleteInput: DeleteInputSchema.optional(), // delete 意图用
  updateInput: UpdateInputSchema.optional(), // update 意图用
  message: z.string().optional(), // 该操作对应的提示消息
});

export const UnifiedExtractResultSchema = z.object({
  actions: z.array(ActionSchema),
  message: z.string().optional(), // 总体提示消息
});

export type TodoItem = z.infer<typeof TodoItemSchema>;
export type QueryOptions = z.infer<typeof QueryOptionsSchema>;
export type DeleteInput = z.infer<typeof DeleteInputSchema>;
export type UpdateInput = z.infer<typeof UpdateInputSchema>;
export type Action = z.infer<typeof ActionSchema>;
export type UnifiedExtractResult = z.infer<typeof UnifiedExtractResultSchema>;
