import axios from 'axios';

const OLLAMA_BASE_URL = 'http://localhost:11434';
const MODEL_NAME = 'gemma4:e2b-mlx';

const MAX_RETRIES = 2;

const SYSTEM_PROMPT = `你是一个待办事项规划器。请将用户需求分解为多个可执行步骤。

输出格式（必须是有效的 JSON）：
{
  "thought": "思考过程...",
  "steps": [
    {
      "id": "step-1",
      "type": "create | update | delete | query | clear",
      "description": "自然语言描述（用于展示给用户）",
      "confidence": 0.95,
      "parameters": {
        // 根据 type 不同，参数不同：
        // create: { title: string, dueDate?: string, priority?: string }
        // update: { oldTitle?: string, oldId?: string, title?: string, dueDate?: string, priority?: string }
        // delete: { title?: string, id?: string }
        // query: { status?: string, searchKey?: string }
        // clear: {}
      },
      "references": ["step-0"]  // 可选，如果依赖之前的步骤则填写
    }
  ]
}

规划规则：
1. 每个步骤类型必须是：create/update/delete/query/clear 之一
2. 步骤 id 格式：step-1, step-2, step-3... 按顺序递增
3. confidence 为该步骤的置信度，范围 0-1
4. 如果某个步骤依赖之前的步骤（例如修改刚创建的待办），用 references 字段记录依赖的 step id
5. create 类型的 parameters 必须包含 title
6. update 类型的 parameters 必须包含 oldTitle 或 oldId 用于定位待办
7. 返回的 JSON 必须是有效的，不要包含任何其他文字

当前日期：{CURRENT_DATE}`;

class Planner {
  private cleanJSONResponse(response: string): string {
    // 去除 markdown 代码块包裹
    let clean = response.replace(/```json\s*/gi, '').replace(/```\s*/g, '');
    // 去除前后空白
    clean = clean.trim();
    return clean;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async plan(input: string): Promise<any> {
    const now = new Date();
    const currentDate = now.toISOString().split('T')[0]; // YYYY-MM-DD
    const systemPrompt = SYSTEM_PROMPT.replace('{CURRENT_DATE}', currentDate);

    console.log('🔍 Planner 开始规划，输入:', input);
    console.log('📅 当前日期:', currentDate);

    let lastError: any = null;

    for (let attempt = 1; attempt <= MAX_RETRIES + 1; attempt++) {
      try {
        console.log(`🔄 第 ${attempt} 次尝试规划...`);

        const response = await axios.post(`${OLLAMA_BASE_URL}/api/generate`, {
          model: MODEL_NAME,
          prompt: `${systemPrompt}\n\n用户输入：${input}\n\n请输出 JSON 格式的计划：`,
          format: 'json',
          options: {
            temperature: 0.1,
            max_tokens: 3000,
            num_ctx: 4096,
          },
          stream: false,
        });

        const rawResponse = response.data.response?.trim() || '';
        console.log('📝 LLM 原始响应:', rawResponse);

        const cleanResponse = this.cleanJSONResponse(rawResponse);
        console.log('🧹 清理后的 JSON:', cleanResponse);

        const parsed = JSON.parse(cleanResponse);
        
        // 确保每个 step 都有 confidence，默认为 0.95
        if (parsed.steps && Array.isArray(parsed.steps)) {
          parsed.steps = parsed.steps.map((step: any) => ({
            confidence: 0.95,
            ...step
          }));
        }
        
        console.log('✅ 规划完成:', JSON.stringify(parsed, null, 2));
        
        return parsed;
      } catch (error) {
        lastError = error;
        console.error(`❌ 第 ${attempt} 次规划失败:`, error);

        if (attempt <= MAX_RETRIES) {
          console.log(`⏳ ${1000 * attempt}ms 后重试...`);
          await this.sleep(1000 * attempt);
        }
      }
    }

    console.error('🚨 所有重试都失败，返回失败计划');
    
    // 返回一个失败计划
    return {
      thought: '规划失败',
      steps: [{
        id: 'step-error',
        type: 'unknown',
        confidence: 0.5,
        description: '无法理解您的需求，请尝试更清晰地描述',
        parameters: {},
        references: [],
      }],
    };
  }
}

export const planner = new Planner();
