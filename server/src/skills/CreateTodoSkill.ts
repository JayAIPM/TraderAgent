import { Skill, SkillResult } from './Skill';
import { paramExtractor, ExtractedParams } from './ParamExtractor';
import { TodoService, CreateTodoInput } from '../services/TodoService';

const todoService = new TodoService();

export class CreateTodoSkill extends Skill {
  name = 'CreateTodoSkill';

  async execute(input: string): Promise<SkillResult> {
    try {
      console.log('🚀 CreateTodoSkill 执行，输入:', input);

      const params = await paramExtractor.extract(input);
      console.log('📋 提取到的参数:', params);

      if (!params.title) {
        return {
          success: false,
          message: '请提供待办事项的标题'
        };
      }

      const createInput: CreateTodoInput = {
        title: params.title
      };

      if (params.dueDate) {
        const parsedDate = new Date(params.dueDate);
        if (!isNaN(parsedDate.getTime())) {
          createInput.dueDate = parsedDate;
          console.log('📅 使用 LLM 提取的日期:', params.dueDate);
        } else {
          console.log('⚠️ LLM 返回的日期无效:', params.dueDate, '，尝试规则提取...');
        }
      }

      if (!createInput.dueDate) {
        const fallbackParams = paramExtractor.fallbackExtract(input);
        if (fallbackParams.dueDate) {
          const fallbackDate = new Date(fallbackParams.dueDate);
          if (!isNaN(fallbackDate.getTime())) {
            createInput.dueDate = fallbackDate;
            console.log('📅 使用 fallback 规则提取的日期:', fallbackParams.dueDate);
          }
        }
      }
      if (params.priority) {
        createInput.priority = params.priority;
      }

      console.log('💾 调用 TodoService.create...');
      const todo = await todoService.create(createInput);
      console.log('✅ Todo 创建成功:', todo);

      return {
        success: true,
        message: `已创建待办：${todo.title}`,
        data: {
          id: todo.id,
          title: todo.title,
          dueDate: todo.dueDate?.toISOString(),
          priority: todo.priority,
          status: todo.status,
          createdAt: todo.createdAt?.toISOString()
        }
      };
    } catch (error) {
      console.error('❌ CreateTodoSkill 执行失败:', error);
      return {
        success: false,
        message: '创建待办失败，请稍后重试'
      };
    }
  }
}

export const createTodoSkill = new CreateTodoSkill();
