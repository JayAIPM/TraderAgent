import { Request, Response, NextFunction } from 'express'
import { agentService, IntentType } from '../agent/AgentService'
import { createTodoSkill, queryTodoSkill, deleteTodoSkill, clearTodosSkill } from '../skills'

export interface AgentResponse {
  code: number
  msg: string
  data: {
    intent: IntentType
    confidence: number
    action?: string
    result?: any
  }
}

export class AgentController {
  async processMessage(req: Request, res: Response, next: NextFunction) {
    try {
      console.log('📨 收到请求:', req.body)
      const { message } = req.body
      
      if (!message || typeof message !== 'string') {
        console.log('❌ 消息内容为空')
        return res.json({
          code: 400,
          msg: '请输入消息内容',
          data: null
        })
      }

      console.log('🤖 开始识别意图...')
      const result = await agentService.recognizeIntent(message)
      console.log('🎯 意图识别结果:', result)
      
      let action = ''
      let actionResult: any = null

      switch (result.intent) {
        case 'create':
          console.log('⚡ 调用 CreateTodoSkill...')
          const createResult = await createTodoSkill.execute(message)
          console.log('✅ Skill 执行结果:', createResult)
          action = '创建待办事项'
          actionResult = createResult
          break
        case 'query':
          console.log('⚡ 调用 QueryTodoSkill...')
          const queryResult = await queryTodoSkill.execute(message)
          console.log('✅ Skill 执行结果:', queryResult)
          action = '查询待办事项'
          actionResult = queryResult
          break
        case 'delete':
          console.log('⚡ 调用 DeleteTodoSkill...')
          const deleteResult = await deleteTodoSkill.execute(message)
          console.log('✅ Skill 执行结果:', deleteResult)
          action = '删除待办事项'
          actionResult = deleteResult
          break
        case 'clear':
          console.log('⚡ 调用 ClearTodosSkill...')
          const clearResult = await clearTodosSkill.execute(message)
          console.log('✅ Skill 执行结果:', clearResult)
          action = '清空待办事项'
          actionResult = clearResult
          break
        case 'unknown':
          action = '未知意图'
          actionResult = {
            success: false,
            message: '抱歉，我只能处理待办事项相关操作（创建、查询、删除、清空）'
          }
          break
      }

      const responseData = {
        code: 200,
        msg: '意图识别成功',
        data: {
          intent: result.intent,
          confidence: result.confidence,
          action,
          result: actionResult
        }
      }

      console.log('📤 返回响应:', JSON.stringify(responseData, null, 2))
      res.json(responseData)
    } catch (error) {
      console.error('❌ processMessage 出错:', error)
      next(error)
    }
  }

  async testIntent(req: Request, res: Response, next: NextFunction) {
    try {
      const testCases = [
        '明天下午三点开会',
        '显示所有待办',
        '删除购买牛奶',
        '清空所有待办',
        '你好'
      ]

      const results: Array<{
        input: string
        intent: string
        confidence: number
      }> = []

      for (const input of testCases) {
        console.log(`⏳ 正在测试: ${input}`)
        const result = await agentService.recognizeIntent(input)
        results.push({
          input,
          intent: result.intent,
          confidence: result.confidence
        })
        console.log(`✅ 测试完成: ${input} -> ${result.intent} (${result.confidence})`)
      }

      res.json({
        code: 200,
        msg: '测试完成',
        data: results
      })
    } catch (error) {
      next(error)
    }
  }
}

export const agentController = new AgentController()
