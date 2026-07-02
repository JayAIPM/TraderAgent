import { BaseTool, ToolResult, ToolContext } from './BaseTool'
import { TodoService } from '../services/TodoService'

export class CreateTodoTool extends BaseTool {
  private todoService: TodoService

  constructor() {
    super({
      name: 'create_todo',
      description: '创建一个新的待办事项。支持设置标题、截止时间和优先级。',
      parameters: {
        type: 'object',
        required: ['title'],
        properties: {
          title: {
            type: 'string',
            description: '待办事项的标题，简短描述要做的事情'
          },
          dueDate: {
            type: 'string',
            description: '截止时间，格式为 YYYY-MM-DD HH:mm'
          },
          priority: {
            type: 'string',
            enum: ['high', 'medium', 'low'],
            description: '优先级，默认 medium'
          }
        }
      }
    })
    this.todoService = new TodoService()
  }

  private parseDate(dateStr: string | undefined): Date | undefined {
    if (!dateStr) return undefined
    try {
      if (/^\d{1,2}:\d{2}$/.test(dateStr)) {
        const today = new Date().toISOString().split('T')[0]
        return new Date(`${today} ${dateStr}`)
      }
      return new Date(dateStr)
    } catch {
      return undefined
    }
  }

  async execute(params: Record<string, any>, context?: ToolContext): Promise<ToolResult> {
    const { title, dueDate, priority } = params

    if (!title) {
      return {
        success: false,
        message: '缺少 title 参数'
      }
    }

    try {
      const todo = await this.todoService.create({
        title: title as string,
        dueDate: this.parseDate(dueDate as string),
        priority: (priority as 'high' | 'medium' | 'low') || 'medium'
      })

      if (context) {
        context.state.set(`created:${context.stepId}`, todo.id)
        context.state.set(`result:${context.stepId}`, todo)
      }

      return {
        success: true,
        message: `已创建待办：${todo.title}`,
        data: todo
      }
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : '创建失败'
      }
    }
  }
}
