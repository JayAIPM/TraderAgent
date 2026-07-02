import { BaseTool, ToolResult, ToolContext } from './BaseTool'
import { TodoService } from '../services/TodoService'

export class ClearTodosTool extends BaseTool {
  private todoService: TodoService

  constructor() {
    super({
      name: 'clear_todos',
      description: '清空所有待办事项。此操作不可恢复，请谨慎使用。',
      parameters: {
        type: 'object',
        properties: {}
      }
    })
    this.todoService = new TodoService()
  }

  async execute(params: Record<string, any>, context?: ToolContext): Promise<ToolResult> {
    try {
      const count = await this.todoService.clearAll()

      if (context?.stepId) {
        context.state.set(`result:${context.stepId}`, { cleared: count })
      }

      return {
        success: true,
        message: `已清空 ${count} 条待办`,
        data: { cleared: count }
      }
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : '清空失败'
      }
    }
  }
}
