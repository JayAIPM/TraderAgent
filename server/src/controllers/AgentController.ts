import { Request, Response, NextFunction } from 'express'
import { planner } from '../agent/Planner'
import { executor } from '../agent/Executor'
import { aggregator } from '../agent/Aggregator'
import { StepResult } from '../agent/Executor'

interface ActionResult {
  type: string
  success: boolean
  message: string
  data?: any
}

// Step 执行详情（前端需要的格式）
interface StepExecution {
  id: string
  type: string
  description: string
  success: boolean
  message?: string
  data?: any
  error?: string
  references?: string[]
}

// 执行摘要
interface ExecutionSummary {
  total: number
  successful: number
  failed: number
  terminated: boolean
  terminatedAt?: string
}

// 计划详情
interface PlanDetails {
  thought?: string
  steps: StepExecution[]
  summary: ExecutionSummary
}

// 新格式：保持向后兼容
interface AgentResponseDataV1 {
  intent: string
  confidence: number
  action: string
  result?: ActionResult
  planDetails?: PlanDetails
}

export interface AgentResponse {
  code: number
  msg: string
  data: AgentResponseDataV1
}

// 将 StepResult 转换为旧格式的 ActionResult，保持兼容
const convertStepResultToActionResult = (stepResult: StepResult): ActionResult => {
  return {
    type: stepResult.step.type,
    success: stepResult.success,
    message: stepResult.success 
      ? (stepResult.message || '执行成功') 
      : (stepResult.error || '执行失败'),
    data: stepResult.success ? stepResult.result : { error: stepResult.error },
  }
}

// 将 StepResult 转换为前端需要的 StepExecution
const convertStepResultToStepExecution = (stepResult: StepResult): StepExecution => {
  return {
    id: stepResult.step.id,
    type: stepResult.step.type,
    description: stepResult.step.description,
    success: stepResult.success,
    message: stepResult.success ? stepResult.message : undefined,
    data: stepResult.success ? stepResult.result : undefined,
    error: !stepResult.success ? stepResult.error : undefined,
    references: stepResult.step.references,
  }
}

export const agentController = {
  async processMessage(req: Request, res: Response, next: NextFunction) {
    try {
      console.log('\n' + '='.repeat(60))
      console.log('🚀 NEW REQUEST RECEIVED! 🚀')
      console.log('📨 收到请求:', req.body)
      console.log('='.repeat(60))
      const { message } = req.body
      
      if (!message || typeof message !== 'string') {
        console.log('❌ 消息内容为空')
        return res.json({
          code: 400,
          msg: '请输入消息内容',
          data: { intent: 'unknown', confidence: 0, action: '未知操作' }
        })
      }

      // ============ 阶段一：规划 ============
      console.log('\n🎯 阶段一：规划中...')
      const plan = await planner.plan(message)
      console.log('📋 规划完成')

      // ============ 阶段二：执行 ============
      console.log('\n⚡ 阶段二：执行中...')
      const executionResult = await executor.execute(plan)
      console.log('✅ 执行完成')

      // ============ 阶段三：聚合 ============
      console.log('\n📊 阶段三：聚合结果...')
      const aggregateMessage = aggregator.aggregate(executionResult)
      console.log('✅ 聚合完成')

      // ============ 转换响应格式 ============
      // 保持向后兼容：将新格式转换为旧格式
      const actionResults: ActionResult[] = executionResult.results.map(convertStepResultToActionResult)
      const { totalSuccessful, totalFailed, terminated, terminatedAt } = executionResult
      
      // 主要结果：选择第一个成功的或者最后一个失败的作为主结果
      let primaryResult: ActionResult | null = null
      if (actionResults.length > 0) {
        const firstSuccess = actionResults.find(r => r.success)
        const lastFailed = actionResults.filter(r => !r.success).pop()
        primaryResult = firstSuccess || lastFailed || actionResults[0]
      }

      // 确定主意图和置信度
      const primaryStep = plan.steps?.[0] || { type: 'unknown', confidence: 0.95 }
      
      let responseMsg = '处理完成'
      if (totalFailed === 0 && totalSuccessful > 0) {
        responseMsg = '全部成功'
      } else if (totalFailed > 0 && totalSuccessful > 0) {
        responseMsg = '部分成功'
      } else if (totalFailed > 0 && totalSuccessful === 0) {
        responseMsg = '全部失败'
      }

      // ============ 构建 planDetails（新增） ============
      const steps: StepExecution[] = executionResult.results.map(convertStepResultToStepExecution)
      const planDetails: PlanDetails = {
        thought: plan.thought,
        steps,
        summary: {
          total: steps.length,
          successful: totalSuccessful,
          failed: totalFailed,
          terminated,
          terminatedAt
        }
      }

      // ============ 向后兼容响应 ============
      const responseData: AgentResponse = {
        code: 200,
        msg: responseMsg,
        data: {
          intent: (primaryStep.type || 'unknown') as any,
          confidence: primaryStep.confidence || 0.95,
          action: aggregateMessage || '操作完成',
          result: primaryResult || {
            success: totalSuccessful > 0,
            message: aggregateMessage || '操作完成',
            data: {
              actions: actionResults,
              totalSuccessful,
              totalFailed,
            }
          },
          planDetails  // 新增：完整的 Plan-and-Execute 详情
        }
      }

      console.log('\n📤 返回响应:', JSON.stringify(responseData, null, 2))
      res.json(responseData)
    } catch (error) {
      console.error('❌ processMessage 出错:', error)
      next(error)
    }
  }
}
