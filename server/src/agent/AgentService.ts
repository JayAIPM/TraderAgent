import axios from 'axios'

export type IntentType = 'create' | 'query' | 'delete' | 'clear' | 'unknown'

export interface IntentResult {
  intent: IntentType
  confidence: number
  rawResponse: string
}

const OLLAMA_BASE_URL = 'http://localhost:11434'
const MODEL_NAME = 'qwen3.5:4b'

export class AgentService {
  private systemPrompt = `你是待办事项管理助手，专门处理用户的待办操作。

请识别用户输入的意图，并只输出JSON格式的结果，不要输出任何其他内容：

{
  "intent": "create|query|delete|clear|unknown",
  "confidence": 0.95
}

意图定义：
- create: 用户想要创建新的待办事项（如"明天开会"、"创建待办"）
- query: 用户想要查看或查询待办事项（如"显示所有"、"查看任务"）
- delete: 用户想要删除某个待办事项（如"删除购买"、"移除会议"）
- clear: 用户想要清空所有待办事项（如"清空待办"、"删除全部"）
- unknown: 不属于以上任何类型的请求

示例：
输入：明天下午三点开会
输出：{"intent":"create","confidence":0.95}

输入：显示所有待办
输出：{"intent":"query","confidence":0.95}

输入：删除购买牛奶
输出：{"intent":"delete","confidence":0.95}

输入：清空所有待办
输出：{"intent":"clear","confidence":0.95}

输入：你好
输出：{"intent":"unknown","confidence":0.0}

注意：
- 只输出JSON，不要任何其他文字、解释或格式
- 置信度范围 0-1，表示你对意图判断的自信程度`

  async recognizeIntent(userInput: string): Promise<IntentResult> {
    try {
      console.log('🔍 识别意图，输入:', userInput)

      const response = await axios.post(`${OLLAMA_BASE_URL}/api/generate`, {
        model: MODEL_NAME,
        prompt: `${this.systemPrompt}\n\n用户输入：${userInput}\n\n请输出JSON：`,
        options: {
          temperature: 0.3,
          max_tokens: 300,
          num_ctx: 2048
        },
        think: true,
        stream: false
      })

      const rawResponse = response.data.response?.trim() || ''
      console.log('📝 Ollama 原始响应:', rawResponse)

      // 尝试提取JSON（可能包含思考过程）
      let jsonString = ''
      
      // 方法1：查找最后一个完整的JSON对象
      const jsonMatch = rawResponse.match(/\{[\s\S]*\}/g)
      if (jsonMatch && jsonMatch.length > 0) {
        jsonString = jsonMatch[jsonMatch.length - 1] // 取最后一个JSON
      } else {
        jsonString = rawResponse
      }

      try {
        const parsed = JSON.parse(jsonString)
        console.log('✅ 解析结果:', parsed)

        return {
          intent: parsed.intent || 'unknown',
          confidence: typeof parsed.confidence === 'number' ? parsed.confidence : 0.9,
          rawResponse
        }
      } catch (parseError) {
        console.log('❌ JSON 解析失败，尝试规则匹配')
        const intent = this.fallbackMatch(userInput)
        return {
          intent,
          confidence: intent !== 'unknown' ? 0.8 : 0.0,
          rawResponse
        }
      }
    } catch (error) {
      console.error('❌ 意图识别失败:', error)
      const intent = this.fallbackMatch(userInput)
      return {
        intent,
        confidence: intent !== 'unknown' ? 0.8 : 0.0,
        rawResponse: ''
      }
    }
  }

  private fallbackMatch(input: string): IntentType {
    const lower = input.toLowerCase()
    const trimmed = input.trim()

    if (/创建|新增|添加|安排|明天|后天|下周|会议|待办|任务/.test(trimmed) && !/删除|清空/.test(trimmed)) {
      return 'create'
    }
    if (/显示|查看|查询|列出|看看/.test(trimmed)) {
      return 'query'
    }
    if (/删除|移除|去掉|删除/.test(trimmed) && !/清空|全部|所有/.test(trimmed)) {
      return 'delete'
    }
    if (/清空|删除全部|删除所有|全部删除|全部清空/.test(trimmed)) {
      return 'clear'
    }
    return 'unknown'
  }
}

export const agentService = new AgentService()
