import axios from 'axios';
import { z } from 'zod';
import { UnifiedExtractResultSchema, UnifiedExtractResult } from '../schemas/agentSchemas';

const OLLAMA_BASE_URL = 'http://localhost:11434';
const MODEL_NAME = 'gemma4:e2b-mlx';
const MAX_RETRIES = 2;

const SYSTEM_PROMPT = `你是一个专业的待办事项管理助手。
当前日期是：{CURRENT_DATE}

请从用户输入中理解意图，识别为以下几种之一（可多个）：
- create：用户要创建待办事项
- query：用户要查询/查看待办事项
- delete：用户要删除/取消待办事项
- update：用户要修改/更新待办事项
- clear：用户要清空所有待办事项
- unknown：无法识别用户意图

【重要识别规则】
- 如果用户说"不做XX了"、"取消XX"、"不干XX了"、"不看XX了"、"不买XX了"等，表示要取消/删除XX待办，识别为 delete 意图
- 如果用户说"XX改到YY"、"XX时间改成YY"、"XX改到YY时间"，识别为 update 意图

输出要求：
1. 严格按照 JSON 格式输出
2. 不要输出任何额外解释文字
3. 如果有多个操作，按顺序放到 actions 数组
4. 如果是 create 意图，请提取所有独立的待办事项到 todos 数组
5. 如果是 query 意图，请提取查询条件到 queryOptions
6. 如果是 delete 意图，请提取待办标题或 id 到 deleteInput
7. 如果是 update 意图，请提取：
   - oldTitle：要修改的待办旧标题（用于查找）
   - 其他字段：要修改成的新值

输出格式示例：

// 示例1：混合意图（先删除，再创建）
{
  "actions": [
    {
      "type": "delete",
      "confidence": 0.95,
      "deleteInput": {"title": "买牛奶"},
      "message": "删除买牛奶的待办"
    },
    {
      "type": "create",
      "confidence": 0.92,
      "todos": [{"title": "买香烟", "priority": "medium"}],
      "message": "创建买香烟的待办"
    }
  ],
  "message": "已为您安排2个操作"
}

// 示例1.5：删除+创建的变体（取消旧的，做新的）
{
  "actions": [
    {
      "type": "delete",
      "confidence": 0.93,
      "deleteInput": {"title": "看《名侦探柯南》"},
      "message": "取消看《名侦探柯南》的待办"
    },
    {
      "type": "create",
      "confidence": 0.95,
      "todos": [{"title": "买一袋大米"}],
      "message": "创建买一袋大米的待办"
    }
  ],
  "message": "已为您安排2个操作"
}

// 示例2：混合 update
{
  "actions": [
    {
      "type": "update",
      "confidence": 0.93,
      "updateInput": {"oldTitle": "看《名侦探柯南》", "dueDate": "2026-05-27 20:00"},
      "message": "修改看《名侦探柯南》的时间"
    },
    {
      "type": "update",
      "confidence": 0.91,
      "updateInput": {"oldTitle": "睡觉", "dueDate": "2026-05-27 21:00"},
      "message": "修改睡觉的时间"
    }
  ],
  "message": "已为您安排2个修改操作"
}

// 示例3：单条 create
{
  "actions": [
    {
      "type": "create",
      "confidence": 0.95,
      "todos": [
        {"title": "看一集《怪盗基德》", "dueDate": "2026-05-27 20:00", "priority": "medium"},
        {"title": "睡觉", "dueDate": "2026-05-27 21:00", "priority": "medium"}
      ],
      "message": "创建2条待办"
    }
  ]
}

// 示例4：query
{
  "actions": [
    {
      "type": "query",
      "confidence": 0.90,
      "queryOptions": {"status": "pending", "searchKey": "工作"},
      "message": "为您查询待办"
    }
  ]
}

// 示例5：delete
{
  "actions": [
    {
      "type": "delete",
      "confidence": 0.92,
      "deleteInput": {"title": "买牛奶"},
      "message": "删除待办"
    }
  ]
}

// 示例6：clear
{
  "actions": [
    {
      "type": "clear",
      "confidence": 0.98,
      "message": "清空所有待办"
    }
  ]
}

// 示例7：unknown
{
  "actions": [
    {
      "type": "unknown",
      "confidence": 0.3,
      "message": "抱歉，我只能处理待办事项相关操作"
    }
  ]
}
`;

export class UnifiedExtractor {
  async extract(input: string): Promise<UnifiedExtractResult> {
    const now = new Date();
    const currentDate = this.formatDate(now);

    const systemPrompt = SYSTEM_PROMPT.replace('{CURRENT_DATE}', currentDate);
    console.log('🔍 UnifiedExtractor 开始提取，输入:', input);
    console.log('📅 注入日期:', currentDate);

    let lastError: any = null;

    for (let attempt = 1; attempt <= MAX_RETRIES + 1; attempt++) {
      try {
        console.log(`🔄 第 ${attempt} 次尝试提取...`);

        const response = await axios.post(`${OLLAMA_BASE_URL}/api/generate`, {
          model: MODEL_NAME,
          prompt: `${systemPrompt}\n\n用户输入：${input}\n\n请输出JSON：`,
          format: "json", // 启用 JSON 结构化输出
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
        const validated = UnifiedExtractResultSchema.parse(parsed);
        console.log('✅ 校验成功:', JSON.stringify(validated, null, 2));

        return validated;
      } catch (error) {
        lastError = error;
        console.error(`❌ 第 ${attempt} 次尝试失败:`, error);

        if (attempt <= MAX_RETRIES) {
          console.log(`⏳ ${1000 * attempt}ms 后重试...`);
          await this.sleep(1000 * attempt);
        }
      }
    }

    console.error('🚨 所有重试都失败，返回 unknown');
    return {
      actions: [
        {
          type: 'unknown',
          confidence: 0,
          message: '抱歉，处理您的请求时出现异常，请稍后再试',
        },
      ],
    };
  }

  private cleanJSONResponse(raw: string): string {
    let clean = raw;

    clean = clean.replace(/```json\s*/gi, '');
    clean = clean.replace(/```\s*/g, '');

    const match = clean.match(/\{[\s\S]*\}/);
    if (match) {
      clean = match[0];
    }

    return clean.trim();
  }

  private formatDate(date: Date): string {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

export const unifiedExtractor = new UnifiedExtractor();
