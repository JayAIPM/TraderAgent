import api from './index'
import type { ApiResponse } from './index'

export interface SkillResult {
  success: boolean
  message: string
  data?: any
}

export interface AgentChatResponse {
  intent: 'create' | 'query' | 'delete' | 'clear' | 'unknown'
  confidence: number
  action: string
  result?: SkillResult
}

export interface AgentChatRequest {
  message: string
}

export const sendAgentMessage = async (
  message: string
): Promise<ApiResponse<AgentChatResponse>> => {
  return api.post('/agent/chat', { message })
}
