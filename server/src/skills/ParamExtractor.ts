import axios from 'axios';

const OLLAMA_BASE_URL = 'http://localhost:11434';
const MODEL_NAME = 'gemma4:e2b-mlx';

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
  "title": "待办标题（核心任务内容）",
  "dueDate": "截止时间（YYYY-MM-DD HH:mm格式，如果有）",
  "priority": "high|medium|low（如果有）",
  "searchKey": "搜索关键词（如果是查询待办）",
  "id": "待办ID（如果有）"
}

提取规则：
1. title: 只提取待办的核心任务内容，去除"删除"、"修改"、"错了"等动作词
   - 例如："买牛奶的待办写错了" → title: "牛奶"
   - 例如："删除明天开会" → title: "开会"
2. 提取时间信息（如"明天下午三点"转换为YYYY-MM-DD HH:mm格式）
3. 提取优先级（如"紧急"→high，"重要"→high，"尽快"→medium）
4. 如果是查询待办，提取搜索关键词
5. 没有明确提到的字段留空或省略

注意：
- title 只需要待办的核心内容，不需要完整句子
- 去除动作词：删除、移除、修改、错了、创建、新增、添加等
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
        stream: false
      });

      const rawResponse = response.data.response?.trim() || '';
      console.log('📝 参数提取原始响应:', rawResponse);

      // 尝试提取JSON（可能包含思考过程）
      let jsonString = '';
      
      // 方法1：查找最后一个完整的JSON对象
      const jsonMatch = rawResponse.match(/\{[\s\S]*\}/g);
      if (jsonMatch && jsonMatch.length > 0) {
        jsonString = jsonMatch[jsonMatch.length - 1]; // 取最后一个JSON
      } else {
        jsonString = rawResponse;
      }

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
    // 动作词列表（需要去除）
    const actionWords = [
      '创建', '新增', '添加', '安排', '待办', '任务', '会议', 
      '删除', '移除', '去掉', '改', '错了', '修改', '错了'
    ];
    
    let title = input;
    
    // 去除动作词
    for (const keyword of actionWords) {
      if (title.includes(keyword)) {
        title = title.replace(new RegExp(`.*${keyword}`, 'gi'), '').trim();
      }
    }
    
    // 去除一些常见的前缀
    title = title.replace(/^的/, '').trim();
    
    // 如果提取后为空，尝试提取名词部分
    if (!title || title.length < 2) {
      // 尝试提取中文或英文单词
      const matches = input.match(/[\u4e00-\u9fa5a-zA-Z0-9]{2,}/g);
      if (matches && matches.length > 0) {
        // 过滤掉动作词
        title = matches.find(m => !actionWords.some(a => m.includes(a))) || input;
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
