import { Skill, SkillResult } from './Skill';
import { paramExtractor, ExtractedParams } from './ParamExtractor';
import { TodoService, QueryOptions } from '../services/TodoService';

const todoService = new TodoService();

export class QueryTodoSkill extends Skill {
  name = 'QueryTodoSkill';

  async execute(input: string): Promise<SkillResult> {
    try {
      console.log('🔍 QueryTodoSkill 执行，输入:', input);

      const params = await paramExtractor.extract(input);
      console.log('📋 提取到的参数:', params);

      const options: QueryOptions = {};
      if (params.searchKey) {
        options.searchKey = params.searchKey;
      }

      const todos = await todoService.findAll(options);

      return {
        success: true,
        message: todos.length > 0 ? `找到 ${todos.length} 条待办` : '暂无待办事项',
        data: todos.map(todo => ({
          id: todo.id,
          title: todo.title,
          dueDate: todo.dueDate?.toISOString(),
          priority: todo.priority,
          status: todo.status,
          createdAt: todo.createdAt?.toISOString()
        }))
      };
    } catch (error) {
      console.error('❌ QueryTodoSkill 执行失败:', error);
      return {
        success: false,
        message: '查询待办失败，请稍后重试'
      };
    }
  }
}

export const queryTodoSkill = new QueryTodoSkill();
