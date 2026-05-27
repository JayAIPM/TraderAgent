import { Request, Response, NextFunction } from 'express'
import { unifiedExtractor } from '../agent/UnifiedExtractor'
import { TodoService } from '../services/TodoService'
import type { UnifiedExtractResult, Action, TodoItem, UpdateInput, DeleteInput } from '../schemas/agentSchemas'

const todoService = new TodoService()

interface ActionResult {
  type: string
  success: boolean
  message: string
  data?: any
}

interface AgentResponseData {
  actions: ActionResult[]
  totalSuccessful: number
  totalFailed: number
}

export interface AgentResponse {
  code: number
  msg: string
  data: AgentResponseData
}

const handleCreate = async (action: Action): Promise<ActionResult> => {
  if (!action.todos || action.todos.length === 0) {
    return {
      type: 'create',
      success: false,
      message: '未找到要创建的待办事项',
    }
  }

  const createInputs = action.todos.map((todo: TodoItem) => ({
    title: todo.title,
    dueDate: todo.dueDate ? new Date(todo.dueDate) : undefined,
    priority: todo.priority,
  }))

  const result = await todoService.createMany(createInputs)

  let message = ''
  if (result.failed.length === 0) {
    message = `成功创建 ${result.successful.length} 条待办事项`
  } else {
    message = `创建 ${result.successful.length} 条，失败 ${result.failed.length} 条`
  }

  return {
    type: 'create',
    success: result.successful.length > 0,
    message: action.message || message,
    data: result,
  }
}

const handleUpdate = async (action: Action): Promise<ActionResult> => {
  if (!action.updateInput || !action.updateInput.oldTitle) {
    return {
      type: 'update',
      success: false,
      message: '缺少待办事项的旧标题',
    }
  }

  const { oldTitle, ...updateData } = action.updateInput
  const updateInput: any = {}
  if (updateData.title) updateInput.title = updateData.title
  if (updateData.dueDate) updateInput.dueDate = new Date(updateData.dueDate)
  if (updateData.priority) updateInput.priority = updateData.priority
  if (updateData.status) updateInput.status = updateData.status

  const updatedTodo = await todoService.updateByTitle(oldTitle, updateInput)

  if (!updatedTodo) {
    return {
      type: 'update',
      success: false,
      message: action.message ? `${action.message}，但未找到相关待办` : `未找到标题为 "${oldTitle}" 的待办事项`,
    }
  }

  return {
    type: 'update',
    success: true,
    message: action.message || '成功更新待办事项',
    data: updatedTodo,
  }
}

const handleDelete = async (action: Action): Promise<ActionResult> => {
  if (!action.deleteInput) {
    return {
      type: 'delete',
      success: false,
      message: '缺少要删除的待办事项信息',
    }
  }

  const deleteInput = action.deleteInput as DeleteInput
  let deleted = false

  if (deleteInput.id) {
    deleted = await todoService.delete(deleteInput.id)
  } else if (deleteInput.title) {
    deleted = await todoService.deleteByTitle(deleteInput.title)
  } else {
    return {
      type: 'delete',
      success: false,
      message: '缺少待办ID或标题',
    }
  }

  return {
    type: 'delete',
    success: deleted,
    message: deleted ? (action.message || '成功删除待办事项') : (action.message ? `${action.message}，但未找到相关待办` : '未找到要删除的待办事项'),
    data: { deleted },
  }
}

const handleQuery = async (action: Action): Promise<ActionResult> => {
  const options = action.queryOptions || {}
  const todos = await todoService.findAll({
    status: options.status,
    searchKey: options.searchKey,
    startDate: options.startDate ? new Date(options.startDate) : undefined,
    endDate: options.endDate ? new Date(options.endDate) : undefined,
  })

  return {
    type: 'query',
    success: true,
    message: action.message || '查询成功',
    data: { todos },
  }
}

const handleClear = async (action: Action): Promise<ActionResult> => {
  const count = await todoService.clearAll()
  return {
    type: 'clear',
    success: true,
    message: action.message || `清空了 ${count} 条待办事项`,
    data: { count },
  }
}

const processAction = async (action: Action): Promise<ActionResult> => {
  console.log('⚡ 处理动作:', action.type, '置信度:', action.confidence)
  
  try {
    switch (action.type) {
      case 'create':
        return await handleCreate(action)
      case 'update':
        return await handleUpdate(action)
      case 'delete':
        return await handleDelete(action)
      case 'query':
        return await handleQuery(action)
      case 'clear':
        return await handleClear(action)
      case 'unknown':
      default:
        return {
          type: action.type,
          success: false,
          message: action.message || '抱歉，我只能处理待办事项相关操作',
        }
    }
  } catch (error) {
    console.error('❌ 处理动作失败:', error)
    return {
      type: action.type,
      success: false,
      message: '处理失败，请稍后重试',
    }
  }
}

export const agentController = {
  async processMessage(req: Request, res: Response, next: NextFunction) {
    try {
      console.log('='.repeat(60))
      console.log('🚀 NEW REQUEST RECEIVED! 🚀')
      console.log('📨 收到请求:', req.body)
      console.log('='.repeat(60))
      const { message } = req.body
      
      if (!message || typeof message !== 'string') {
        console.log('❌ 消息内容为空')
        return res.json({
          code: 400,
          msg: '请输入消息内容',
          data: { actions: [], totalSuccessful: 0, totalFailed: 0 }
        })
      }

      console.log('🤖 开始提取意图和参数...')
      const extractResult = await unifiedExtractor.extract(message)
      console.log('🎯 提取结果:', JSON.stringify(extractResult, null, 2))
      
      const actionResults: ActionResult[] = []
      let totalSuccessful = 0
      let totalFailed = 0

      for (const action of extractResult.actions) {
        const result = await processAction(action)
        actionResults.push(result)
        if (result.success) {
          totalSuccessful++
        } else {
          totalFailed++
        }
      }

      let responseMsg = '处理完成'
      if (totalFailed === 0 && totalSuccessful > 0) {
        responseMsg = '全部成功'
      } else if (totalFailed > 0 && totalSuccessful > 0) {
        responseMsg = '部分成功'
      } else if (totalFailed > 0 && totalSuccessful === 0) {
        responseMsg = '全部失败'
      }

      const responseData: AgentResponse = {
        code: 200,
        msg: responseMsg,
        data: {
          actions: actionResults,
          totalSuccessful,
          totalFailed,
        }
      }

      console.log('📤 返回响应:', JSON.stringify(responseData, null, 2))
      res.json(responseData)
    } catch (error) {
      console.error('❌ processMessage 出错:', error)
      next(error)
    }
  }
}
