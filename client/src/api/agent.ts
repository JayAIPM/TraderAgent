import api from './index'
import type { ApiResponse } from './index'

export interface SkillResult {
  success: boolean
  message: string
  data?: any
}

// Step 执行详情（Plan-and-Execute 新增）
export interface StepExecution {
  id: string
  type: string
  description: string
  success: boolean
  message?: string
  data?: any
  error?: string
  references?: string[]
}

// 执行摘要（Plan-and-Execute 新增）
export interface ExecutionSummary {
  total: number
  successful: number
  failed: number
  terminated: boolean
  terminatedAt?: string
}

// 计划详情（Plan-and-Execute 新增）
export interface PlanDetails {
  thought?: string
  steps: StepExecution[]
  summary: ExecutionSummary
}

export interface AgentChatResponse {
  intent: 'create' | 'query' | 'delete' | 'clear' | 'update' | 'unknown'
  confidence: number
  action: string
  result?: SkillResult
  
  // 新增：Plan-and-Execute 详情（可选，保持向后兼容）
  planDetails?: PlanDetails
}

export interface AgentChatRequest {
  message: string
}

export const sendAgentMessage = async (
  message: string
): Promise<ApiResponse<AgentChatResponse>> => {
  return api.post('/agent/chat', { message })
}
