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

当前日期是：{CURRENT_DATE}

请从用户输入中提取待办事项相关参数，并只输出JSON格式的结果：

{
  "title": "待办标题（核心任务内容）",
  "dueDate": "截止时间（YYYY-MM-DD HH:mm格式，如果有）",
  "priority": "high|medium|low（如果有）",
  "searchKey": "搜索关键词（如果是查询待办）",
  "id": "待办ID（如果有）"
}

时间推算规则（重要！）：
- "今晚八点" = 今天晚上20:00
- "明天下午三点" = 明天下午15:00
- "后天早上九点" = 后天早上09:00
- "今天" = 今天某个时间
- "今晚" = 今天晚上20:00

示例：
输入："今晚八点洗澡"
输出：{"title": "洗澡", "dueDate": "{CURRENT_DATE} 20:00"}

输入："明天下午三点开会"
输出：{"title": "开会", "dueDate": "{TOMORROW_DATE} 15:00"}

输入："后天早上九点交报告"
输出：{"title": "交报告", "dueDate": "{DAY_AFTER_TOMORROW_DATE} 09:00"}

提取规则：
1. title: 只提取待办的核心任务内容，去除"删除"、"修改"、"错了"等动作词
2. 时间信息必须转换为YYYY-MM-DD HH:mm格式，基于当前日期推算
3. 提取优先级（如"紧急"→high，"重要"→high，"尽快"→medium）
4. 如果是查询待办，提取搜索关键词
5. 没有明确提到的字段留空或省略

注意：
- title 只需要待办的核心内容，不需要完整句子
- 去除动作词：删除、移除、修改、错了、创建、新增、添加等
- 必须使用真实日期替换占位符，不要输出"YYYY-MM-DD"这样的占位符`;

export class ParamExtractor {
  async extract(input: string): Promise<ExtractedParams> {
    try {
      console.log('🔍 提取参数，输入:', input);

      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      const dayAfterTomorrow = new Date(today);
      dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 2);

      const formatDate = (d: Date) => {
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${y}-${m}-${day}`;
      };

      const currentDate = formatDate(today);
      const tomorrowDate = formatDate(tomorrow);
      const dayAfterTomorrowDate = formatDate(dayAfterTomorrow);

      const systemPrompt = SYSTEM_PROMPT
        .replace('{CURRENT_DATE}', currentDate)
        .replace('{TOMORROW_DATE}', tomorrowDate)
        .replace('{DAY_AFTER_TOMORROW_DATE}', dayAfterTomorrowDate);

      console.log('📅 注入日期 - 今日:', currentDate, '明日:', tomorrowDate, '后天:', dayAfterTomorrowDate);

      const response = await axios.post(`${OLLAMA_BASE_URL}/api/generate`, {
        model: MODEL_NAME,
        prompt: `${systemPrompt}\n\n用户输入：${input}\n\n请输出JSON：`,
        options: {
          temperature: 0.1,
          max_tokens: 300,
          num_ctx: 2048
        },
        stream: false
      });

      const rawResponse = response.data.response?.trim() || '';
      console.log('📝 参数提取原始响应:', rawResponse);

      // 去除 markdown 代码块标记
      let cleanResponse = rawResponse
        .replace(/```json\s*/gi, '')
        .replace(/```\s*/g, '')
        .trim();

      // 尝试提取JSON（可能包含思考过程）
      let jsonString = '';
      
      // 方法1：查找最后一个完整的JSON对象
      const jsonMatch = cleanResponse.match(/\{[\s\S]*\}/g);
      if (jsonMatch && jsonMatch.length > 0) {
        jsonString = jsonMatch[jsonMatch.length - 1]; // 取最后一个JSON
      } else {
        jsonString = cleanResponse;
      }

      console.log('📝 清理后的JSON:', jsonString);

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

  public fallbackExtract(input: string): ExtractedParams {
    const result: ExtractedParams = {};

    const trimmed = input.trim();
    result.title = this.extractTitle(trimmed);

    // 尝试提取日期
    const extractedDate = this.extractDate(trimmed);
    if (extractedDate) {
      result.dueDate = extractedDate;
      console.log('📅 规则提取到日期:', extractedDate);
    }

    const priorityMatch = this.extractPriority(trimmed);
    if (priorityMatch) result.priority = priorityMatch;

    return result;
  }

  private extractDate(input: string): string | undefined {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    // 解析"今晚"
    if (/今晚|今夜/i.test(input)) {
      return this.formatDateTime(today, input);
    }

    // 解析"明天"
    if (/明天|明日/i.test(input)) {
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      return this.formatDateTime(tomorrow, input);
    }

    // 解析"后天"
    if (/后天/i.test(input)) {
      const dayAfterTomorrow = new Date(today);
      dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 2);
      return this.formatDateTime(dayAfterTomorrow, input);
    }

    // 解析"今天"
    if (/今天|今日/i.test(input)) {
      return this.formatDateTime(today, input);
    }

    return undefined;
  }

  private formatDateTime(date: Date, input: string): string {
    // 提取时间（如 9点、9:00、09:00、上午九点、下午三点半）
    let hour = 9; // 默认9点
    let minute = 0;

    // 匹配 HH:MM 格式
    const timeMatch = input.match(/(\d{1,2}):(\d{2})/);
    if (timeMatch) {
      hour = parseInt(timeMatch[1]);
      minute = parseInt(timeMatch[2]);
    } else {
      // 匹配 数字点、数字分、数字点分
      const hourMatch = input.match(/(\d{1,2})[点时]/);
      if (hourMatch) {
        hour = parseInt(hourMatch[1]);
      }
      const minuteMatch = input.match(/(\d{1,2})[分]/);
      if (minuteMatch) {
        minute = parseInt(minuteMatch[1]);
      }
    }

    // 处理"下午/晚上"
    if (/下午|晚上|傍晚/i.test(input) && hour < 12) {
      hour += 12;
    }
    // 处理"早上/上午"
    if (/早上|上午/i.test(input) && hour > 12) {
      hour -= 12;
    }

    date.setHours(hour, minute, 0, 0);
    
    // 格式化为 YYYY-MM-DD HH:mm
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    const hh = String(date.getHours()).padStart(2, '0');
    const mm = String(date.getMinutes()).padStart(2, '0');
    
    return `${y}-${m}-${d} ${hh}:${mm}`;
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
