import { Skill, SkillResult } from './Skill';
import { TodoService } from '../services/TodoService';

const todoService = new TodoService();

export class ClearTodosSkill extends Skill {
  name = 'ClearTodosSkill';

  async execute(input: string): Promise<SkillResult> {
    try {
      console.log('🗑️ ClearTodosSkill 执行，输入:', input);

      const deletedCount = await todoService.clearAll();

      return {
        success: true,
        message: `已清空所有待办，共删除 ${deletedCount} 条`
      };
    } catch (error) {
      console.error('❌ ClearTodosSkill 执行失败:', error);
      return {
        success: false,
        message: '清空待办失败，请稍后重试'
      };
    }
  }
}

export const clearTodosSkill = new ClearTodosSkill();
