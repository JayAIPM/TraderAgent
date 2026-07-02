import { BaseTool, ToolResult, ToolContext } from './BaseTool'
import { TodoService } from '../services/TodoService'

export class DeleteTodoTool extends BaseTool {
  private todoService: TodoService

  constructor() {
    super({
      name: 'delete_todo',
      description: '删除待办事项。可以通过 id 或 title 定位要删除的待办。',
      parameters: {
        type: 'object',
        properties: {
          id: {
            type: 'string',
            description: '待办事项的 ID（与 title 二选一）'
          },
          title: {
            type: 'string',
            description: '待办事项的标题（与 id 二选一，用于模糊匹配删除）'
          }
        }
      }
    })
    this.todoService = new TodoService()
  }

  async execute(params: Record<string, any>, context?: ToolContext): Promise<ToolResult> {
    const title = params.title as string
    const id = params.id as string

    if (!title && !id) {
      return {
        success: false,
        message: '缺少删除参数（title 或 id）'
      }
    }

    try {
      let deleted: boolean
      if (id) {
        deleted = await this.todoService.delete(id)
      } else {
        deleted = await this.todoService.deleteByTitle(title!)
      }

      if (!deleted) {
        return {
          success: false,
          message: id
            ? `未找到 ID 为 ${id} 的待办`
            : `未找到标题包含 "${title}" 的待办`
        }
      }

      if (context?.stepId) {
        context.state.set(`result:${context.stepId}`, { deleted: true })
      }

      return {
        success: true,
        message: `已删除待办：${title || id}`,
        data: { deleted: true }
      }
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : '删除失败'
      }
    }
  }
}
