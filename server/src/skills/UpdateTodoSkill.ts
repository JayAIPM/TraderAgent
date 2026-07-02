import { BaseSkill, SkillResult, SkillContext } from './Skill'
import { TodoService } from '../services/TodoService'

export class UpdateTodoSkill extends BaseSkill {
  private todoService: TodoService

  constructor() {
    super({
      name: 'update_todo',
      description: '修改已有的待办事项。可以通过 id 或 oldTitle 定位待办，然后修改标题、截止时间、优先级或状态。',
      parameters: {
        type: 'object',
        properties: {
          id: {
            type: 'string',
            description: '待办事项的 ID（与 oldTitle 二选一）'
          },
          oldTitle: {
            type: 'string',
            description: '待办事项的旧标题（与 id 二选一，用于模糊匹配）'
          },
          title: {
            type: 'string',
            description: '新的标题'
          },
          dueDate: {
            type: 'string',
            description: '新的截止时间，格式为 YYYY-MM-DD HH:mm'
          },
          priority: {
            type: 'string',
            enum: ['high', 'medium', 'low'],
            description: '新的优先级'
          },
          status: {
            type: 'string',
            enum: ['pending', 'completed'],
            description: '新的状态'
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

  async execute(params: Record<string, any>, context?: SkillContext): Promise<SkillResult> {
    let todoId = params.id as string
    let oldTitle = params.oldTitle as string

    if (context?.references && context.references.length > 0 && !todoId && !oldTitle) {
      for (const refId of context.references) {
        const createdId = context.state.get(`created:${refId}`)
        if (createdId) {
          todoId = createdId
          break
        }
      }
    }

    const updateInput: any = {}
    if (params.title) updateInput.title = params.title
    if (params.dueDate) updateInput.dueDate = this.parseDate(params.dueDate as string)
    if (params.priority) updateInput.priority = params.priority
    if (params.status) updateInput.status = params.status

    if (!todoId && !oldTitle) {
      return {
        success: false,
        message: '缺少定位待办的参数（id 或 oldTitle）'
      }
    }

    try {
      let updatedTodo
      if (todoId) {
        updatedTodo = await this.todoService.update(todoId, updateInput)
      } else {
        updatedTodo = await this.todoService.updateByTitle(oldTitle!, updateInput)
      }

      if (!updatedTodo) {
        return {
          success: false,
          message: todoId
            ? `未找到 ID 为 ${todoId} 的待办`
            : `未找到标题包含 "${oldTitle}" 的待办`
        }
      }

      if (context?.stepId) {
        context.state.set(`updated:${context.stepId}`, updatedTodo.id)
        context.state.set(`result:${context.stepId}`, updatedTodo)
      }

      return {
        success: true,
        message: `已修改待办：${updatedTodo.title}`,
        data: updatedTodo
      }
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : '修改失败'
      }
    }
  }
}

export const updateTodoSkill = new UpdateTodoSkill()
