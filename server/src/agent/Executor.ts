import { PlanStep } from '../schemas/agentSchemas'
import { skillRegistry } from '../skills/registry'
import { SkillContext } from '../skills/Skill'

export interface ExecutionState {
  stepResults: Map<string, any>
  createdTodos: Map<string, string>
  updatedTodos: Map<string, string>
}

export interface StepResult {
  step: PlanStep
  success: boolean
  result?: any
  error?: string
  message?: string
}

export interface ExecutionResult {
  results: StepResult[]
  totalSuccessful: number
  totalFailed: number
  terminated: boolean
  terminatedAt?: string
}

const typeToSkillMap: Record<string, string> = {
  create: 'create_todo',
  update: 'update_todo',
  delete: 'delete_todo',
  query: 'query_todos',
  clear: 'clear_todos'
}

class Executor {
  private state: Map<string, any>

  constructor() {
    this.state = new Map()
  }

  async execute(plan: any): Promise<ExecutionResult> {
    console.log('🚀 Executor 开始执行计划...')
    console.log('📋 计划步骤数:', plan.steps?.length || 0)
    console.log('🔧 已注册的技能:', skillRegistry.getAll().map(s => s.name).join(', '))

    const results: StepResult[] = []
    let terminated = false
    let terminatedAt: string | undefined

    const steps = plan.steps || []

    for (const step of steps) {
      console.log(`\n${'='.repeat(60)}`)
      console.log(`📍 即将执行: ${step.id} - ${step.type}`)
      console.log(`📝 描述: ${step.description}`)
      if (step.references && step.references.length > 0) {
        console.log(`📎 依赖: ${step.references.join(', ')}`)
      }
      console.log('='.repeat(60))

      const skillName = typeToSkillMap[step.type]
      const skill = skillRegistry.get(skillName || '')

      if (!skill) {
        const result: StepResult = {
          step,
          success: false,
          error: `未知类型: ${step.type} (找不到技能: ${skillName})`
        }
        results.push(result)
        terminated = true
        terminatedAt = step.id
        break
      }

      const context: SkillContext = {
        state: this.state,
        stepId: step.id,
        references: step.references
      }

      try {
        const skillResult = await skill.execute(step.parameters || {}, context)

        const stepResult: StepResult = {
          step,
          success: skillResult.success,
          result: skillResult.data,
          message: skillResult.message,
          error: skillResult.success ? undefined : skillResult.message
        }

        results.push(stepResult)

        if (stepResult.success) {
          console.log(`✅ ${step.id} 执行成功: ${stepResult.message}`)
        } else {
          console.log(`❌ ${step.id} 执行失败: ${stepResult.error}`)
          console.log('🚨 检测到失败，终止整个流程')
          terminated = true
          terminatedAt = step.id
          break
        }
      } catch (error) {
        const stepResult: StepResult = {
          step,
          success: false,
          error: error instanceof Error ? error.message : '执行异常'
        }
        results.push(stepResult)
        console.log(`❌ ${step.id} 执行异常: ${stepResult.error}`)
        console.log('🚨 检测到异常，终止整个流程')
        terminated = true
        terminatedAt = step.id
        break
      }
    }

    const totalSuccessful = results.filter(r => r.success).length
    const totalFailed = results.filter(r => !r.success).length

    console.log('\n' + '='.repeat(60))
    console.log('📊 执行统计:')
    console.log(`   总步骤数: ${steps.length}`)
    console.log(`   成功: ${totalSuccessful}`)
    console.log(`   失败: ${totalFailed}`)
    console.log(`   终止: ${terminated ? '是 (终止于 ' + terminatedAt + ')' : '否'}`)
    console.log('='.repeat(60))

    return {
      results,
      totalSuccessful,
      totalFailed,
      terminated,
      terminatedAt
    }
  }

  getState(): Map<string, any> {
    return this.state
  }
}

export const executor = new Executor()
