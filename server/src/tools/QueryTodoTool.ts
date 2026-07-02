import { BaseTool, ToolResult, ToolContext } from './BaseTool'
import { TodoService } from '../services/TodoService'

export class QueryTodoTool extends BaseTool {
  private todoService: TodoService

  constructor() {
    super({
      name: 'query_todos',
      description: '查询待办事项列表。支持按状态过滤、按关键词搜索。',
      parameters: {
        type: 'object',
        properties: {
          status: {
            type: 'string',
            enum: ['pending', 'completed'],
            description: '按状态过滤：pending=待完成，completed=已完成'
          },
          searchKey: {
            type: 'string',
            description: '按标题关键词搜索'
          }
        }
      }
    })
    this.todoService = new TodoService()
  }

  async execute(params: Record<string, any>, context?: ToolContext): Promise<ToolResult> {
    const status = params.status as 'pending' | 'completed' | undefined
    const searchKey = params.searchKey as string | undefined

    try {
      const todos = await this.todoService.findAll({
        status,
        searchKey
      })

      if (context?.stepId) {
        context.state.set(`result:${context.stepId}`, todos)
      }

      return {
        success: true,
        message: todos.length === 0 ? '暂无待办事项' : `共 ${todos.length} 条待办`,
        data: todos
      }
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : '查询失败'
      }
    }
  }
}
