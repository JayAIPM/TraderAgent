import { Skill, SkillResult } from './Skill';
import { paramExtractor, ExtractedParams } from './ParamExtractor';
import { TodoService } from '../services/TodoService';

const todoService = new TodoService();

export class DeleteTodoSkill extends Skill {
  name = 'DeleteTodoSkill';

  async execute(input: string): Promise<SkillResult> {
    try {
      console.log('🗑️ DeleteTodoSkill 执行，输入:', input);

      const params = await paramExtractor.extract(input);
      console.log('📋 提取到的参数:', params);

      let deleted = false;
      let deletedTitle = '';

      if (params.id) {
        deleted = await todoService.delete(params.id);
        deletedTitle = `ID: ${params.id}`;
      } else if (params.title) {
        const todos = await todoService.findByTitle(params.title);
        if (todos.length > 0) {
          deleted = await todoService.delete(todos[0].id);
          deletedTitle = todos[0].title;
        }
      } else {
        return {
          success: false,
          message: '请提供要删除的待办ID或标题'
        };
      }

      if (deleted) {
        return {
          success: true,
          message: `已删除待办：${deletedTitle}`
        };
      } else {
        return {
          success: false,
          message: '未找到指定的待办事项'
        };
      }
    } catch (error) {
      console.error('❌ DeleteTodoSkill 执行失败:', error);
      return {
        success: false,
        message: '删除待办失败，请稍后重试'
      };
    }
  }
}

export const deleteTodoSkill = new DeleteTodoSkill();
