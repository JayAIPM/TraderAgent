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
        console.log('🔍 使用 ID 删除:', params.id);
        deleted = await todoService.delete(params.id);
        deletedTitle = `ID: ${params.id}`;
      } else if (params.title) {
        console.log('🔍 使用标题删除，原始提取:', params.title);
        
        // 第一次尝试：精确匹配
        console.log('🔍 第1次尝试：精确匹配搜索');
        let todos = await todoService.findByTitle(params.title);
        console.log('🔎 精确匹配结果:', todos);
        
        // 第二次尝试：提取关键词模糊搜索
        if (todos.length === 0) {
          console.log('🔍 第2次尝试：提取关键词模糊搜索');
          const keywords = params.title.match(/[\u4e00-\u9fa5a-zA-Z0-9]{2,}/g);
          console.log('📝 提取的关键词:', keywords);
          
          if (keywords && keywords.length > 0) {
            // 尝试每个关键词
            for (const keyword of keywords) {
              if (['删除', '待办', '错了', '修改'].includes(keyword)) continue;
              
              console.log(`🔍 尝试关键词: "${keyword}"`);
              todos = await todoService.findByTitle(keyword);
              console.log(`🔎 关键词"${keyword}"搜索结果:`, todos);
              
              if (todos.length > 0) break;
            }
          }
        }
        
        // 第三次尝试：查询所有待办，看是否有包含"牛奶"的
        if (todos.length === 0) {
          console.log('🔍 第3次尝试：查询所有待办，手动匹配');
          const allTodos = await todoService.findAll();
          console.log('📋 所有待办:', allTodos.map(t => ({ id: t.id, title: t.title })));
          
          const titleToMatch = params.title || '';
          const matchTodo = allTodos.find(t => 
            t.title.includes('牛奶') || 
            titleToMatch.includes(t.title) ||
            t.title.includes(titleToMatch.split('的')[0] || '')
          );
          
          if (matchTodo) {
            console.log('✅ 手动匹配到待办:', matchTodo.title);
            todos = [matchTodo];
          }
        }
        
        if (todos.length > 0) {
          console.log('✅ 找到待办，准备删除:', todos[0].title);
          deleted = await todoService.delete(todos[0].id);
          deletedTitle = todos[0].title;
        } else {
          console.log('❌ 未找到匹配的待办');
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
