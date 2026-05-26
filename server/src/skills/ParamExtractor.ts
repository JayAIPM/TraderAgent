import axios from 'axios';

const OLLAMA_BASE_URL = 'http://localhost:11434';
const MODEL_NAME = 'qwen3.5:4b';

export interface ExtractedParams {
  title?: string;
  dueDate?: string;
  priority?: 'high' | 'medium' | 'low';
  id?: string;
  searchKey?: string;
}

const SYSTEM_PROMPT = `你是待办事项参数提取助手。

请从用户输入中提取待办事项相关参数，并只输出JSON格式的结果：

{
  "title": "待办标题（如果有）",
  "dueDate": "截止时间（YYYY-MM-DD HH:mm格式，如果有）",
  "priority": "high|medium|low（如果有）",
  "searchKey": "搜索关键词（如果是查询待办）",
  "id": "待办ID（如果有）"
}

提取规则：
1. 提取用户提到的待办标题
2. 提取时间信息（如"明天下午三点"转换为YYYY-MM-DD HH:mm格式）
3. 提取优先级（如"紧急"→high，"重要"→high，"尽快"→medium）
4. 如果是查询待办，提取搜索关键词
5. 没有明确提到的字段留空或省略

注意：
- 只输出JSON，不要任何其他文字、解释或格式
- 时间提取要准确，如"明天下午三点"转换成具体日期时间
- 只提取明确提到的信息，不要猜测或编造`;

export class ParamExtractor {
  async extract(input: string): Promise<ExtractedParams> {
    try {
      console.log('🔍 提取参数，输入:', input);

      const response = await axios.post(`${OLLAMA_BASE_URL}/api/generate`, {
        model: MODEL_NAME,
        prompt: `${SYSTEM_PROMPT}\n\n用户输入：${input}\n\n请输出JSON：`,
        options: {
          temperature: 0.1,
          max_tokens: 300,
          num_ctx: 2048
        },
        think: false,
        stream: false
      });

      const rawResponse = response.data.response?.trim() || '';
      console.log('📝 参数提取原始响应:', rawResponse);

      const jsonMatch = rawResponse.match(/\{[\s\S]*\}/);
      const jsonString = jsonMatch ? jsonMatch[0] : rawResponse;

      try {
        const parsed = JSON.parse(jsonString);
        console.log('✅ 参数解析结果:', parsed);
        return this.normalizeParams(parsed);
      } catch (parseError) {
        console.log('❌ JSON解析失败，使用规则匹配');
        return this.fallbackExtract(input);
      }
    } catch (error) {
      console.error('❌ 参数提取失败:', error);
      return this.fallbackExtract(input);
    }
  }

  private normalizeParams(params: any): ExtractedParams {
    const result: ExtractedParams = {};

    if (params.title) result.title = params.title;
    if (params.dueDate) result.dueDate = params.dueDate;
    if (params.priority && ['high', 'medium', 'low'].includes(params.priority)) {
      result.priority = params.priority;
    }
    if (params.searchKey) result.searchKey = params.searchKey;
    if (params.id) result.id = params.id;

    return result;
  }

  private fallbackExtract(input: string): ExtractedParams {
    const result: ExtractedParams = {};

    const trimmed = input.trim();
    result.title = this.extractTitle(trimmed);

    const priorityMatch = this.extractPriority(trimmed);
    if (priorityMatch) result.priority = priorityMatch;

    return result;
  }

  private extractTitle(input: string): string {
    const keywords = ['创建', '新增', '添加', '安排', '待办', '任务', '会议', '删除', '移除'];
    let title = input;
    for (const keyword of keywords) {
      if (title.includes(keyword)) {
        title = title.replace(new RegExp(`.*${keyword}`, 'gi'), '').trim();
      }
    }
    return title || input;
  }

  private extractPriority(input: string): 'high' | 'medium' | 'low' | undefined {
    const lower = input.toLowerCase();
    if (/紧急|重要|必须|high/i.test(lower)) return 'high';
    if (/尽快|medium/i.test(lower)) return 'medium';
    if (/不急|低|low/i.test(lower)) return 'low';
    return undefined;
  }
}

export const paramExtractor = new ParamExtractor();
