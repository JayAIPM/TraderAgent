import { Todo, ITodo } from '../models/Todo';
import { v4 as uuidv4 } from 'uuid';

export interface CreateTodoInput {
  title: string;
  dueDate?: Date;
  priority?: 'high' | 'medium' | 'low';
}

export interface UpdateTodoInput {
  title?: string;
  dueDate?: Date;
  priority?: 'high' | 'medium' | 'low';
  status?: 'pending' | 'completed';
}

export interface QueryOptions {
  status?: 'pending' | 'completed';
  searchKey?: string;
  startDate?: Date;
  endDate?: Date;
}

export class TodoService {
  // 创建待办
  async create(input: CreateTodoInput): Promise<ITodo> {
    console.log('💾 TodoService.create 被调用，参数:', input);
    
    const todo = new Todo({
      id: uuidv4(),
      title: input.title,
      dueDate: input.dueDate,
      priority: input.priority || 'medium',
      status: 'pending',
    });
    
    console.log('📝 准备保存到数据库...');
    const savedTodo = await todo.save();
    console.log('✅ 保存成功:', savedTodo);
    
    return savedTodo;
  }

  // 查询所有待办
  async findAll(options?: QueryOptions): Promise<ITodo[]> {
    const query: any = {};

    if (options?.status) {
      query.status = options.status;
    }

    if (options?.searchKey) {
      query.$text = { $search: options.searchKey };
    }

    if (options?.startDate || options?.endDate) {
      query.dueDate = {};
      if (options.startDate) {
        query.dueDate.$gte = options.startDate;
      }
      if (options.endDate) {
        query.dueDate.$lte = options.endDate;
      }
    }

    return await Todo.find(query).sort({ dueDate: 1 }).exec();
  }

  // 根据ID查询
  async findById(id: string): Promise<ITodo | null> {
    return await Todo.findOne({ id }).exec();
  }

  // 根据标题模糊查询
  async findByTitle(title: string): Promise<ITodo[]> {
    return await Todo.find({
      title: { $regex: title, $options: 'i' }
    }).sort({ dueDate: 1 }).exec();
  }

  // 更新待办
  async update(id: string, input: UpdateTodoInput): Promise<ITodo | null> {
    return await Todo.findOneAndUpdate(
      { id },
      { $set: input },
      { new: true }
    ).exec();
  }

  // 删除单个待办
  async delete(id: string): Promise<boolean> {
    const result = await Todo.deleteOne({ id }).exec();
    return result.deletedCount > 0;
  }

  // 根据标题删除
  async deleteByTitle(title: string): Promise<boolean> {
    const result = await Todo.deleteOne({
      title: { $regex: title, $options: 'i' }
    }).exec();
    return result.deletedCount > 0;
  }

  // 清空所有待办
  async clearAll(): Promise<number> {
    const result = await Todo.deleteMany({}).exec();
    return result.deletedCount || 0;
  }

  // 统计待办数量
  async count(options?: QueryOptions): Promise<number> {
    const query: any = {};

    if (options?.status) {
      query.status = options.status;
    }

    if (options?.searchKey) {
      query.$text = { $search: options.searchKey };
    }

    return await Todo.countDocuments(query).exec();
  }
}
