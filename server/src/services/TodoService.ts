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

export interface CreateTodoResult {
  success: boolean;
  todo?: ITodo;
  error?: string;
}

export interface BatchCreateResult {
  successful: ITodo[];
  failed: Array<{ input: CreateTodoInput; error: string }>;
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

  // 批量创建待办
  async createMany(inputs: CreateTodoInput[]): Promise<BatchCreateResult> {
    console.log('💾 TodoService.createMany 被调用，共', inputs.length, '条');
    
    const successful: ITodo[] = [];
    const failed: Array<{ input: CreateTodoInput; error: string }> = [];
    
    for (let i = 0; i < inputs.length; i++) {
      const input = inputs[i];
      try {
        const todo = await this.create(input);
        successful.push(todo);
      } catch (error) {
        failed.push({
          input,
          error: error instanceof Error ? error.message : '未知错误',
        });
      }
    }
    
    console.log('✅ createMany 完成，成功', successful.length, '条，失败', failed.length, '条');
    
    return { successful, failed };
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

  // 更新待办（通过ID）
  async update(id: string, input: UpdateTodoInput): Promise<ITodo | null> {
    return await Todo.findOneAndUpdate(
      { id },
      { $set: input },
      { new: true }
    ).exec();
  }

  // 更新待办（通过旧标题）
  async updateByTitle(oldTitle: string, input: UpdateTodoInput): Promise<ITodo | null> {
    console.log('💾 TodoService.updateByTitle 被调用，旧标题:', oldTitle, '新参数:', input);
    
    // 首先查找匹配的待办
    const todos = await this.findByTitle(oldTitle);
    
    if (todos.length === 0) {
      console.log('⚠️ 未找到标题匹配的待办:', oldTitle);
      return null;
    }
    
    // 如果有多个匹配，只更新第一个
    const todoToUpdate = todos[0];
    console.log('🔍 找到待办:', todoToUpdate.title, '(ID:', todoToUpdate.id, ')');
    
    const updatedTodo = await this.update(todoToUpdate.id, input);
    console.log('✅ updateByTitle 完成:', updatedTodo);
    
    return updatedTodo;
  }

  // 删除单个待办
  async delete(id: string): Promise<boolean> {
    const result = await Todo.deleteOne({ id }).exec();
    return result.deletedCount > 0;
  }

  // 根据标题删除
  async deleteByTitle(title: string): Promise<boolean> {
    console.log('💾 TodoService.deleteByTitle 被调用，标题:', title);
    
    const result = await Todo.deleteOne({
      title: { $regex: title, $options: 'i' }
    }).exec();
    
    console.log('✅ deleteByTitle 完成，删除数量:', result.deletedCount);
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
