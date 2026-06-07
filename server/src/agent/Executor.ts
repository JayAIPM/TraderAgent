import { TodoService } from '../services/TodoService';
import { PlanStep } from '../schemas/agentSchemas';

// 执行状态接口
export interface ExecutionState {
  stepResults: Map<string, any>;  // stepId -> result
  createdTodos: Map<string, string>;  // stepId -> todoId
  updatedTodos: Map<string, string>;  // stepId -> todoId
}

// 单个步骤执行结果
export interface StepResult {
  step: PlanStep;
  success: boolean;
  result?: any;
  error?: string;
  message?: string;
}

// 批量执行结果
export interface ExecutionResult {
  results: StepResult[];
  totalSuccessful: number;
  totalFailed: number;
  terminated: boolean;  // 是否因失败而终止
  terminatedAt?: string;  // 终止时的 step id
}

class Executor {
  private todoService: TodoService;
  private state: ExecutionState;

  constructor() {
    this.todoService = new TodoService();
    this.state = {
      stepResults: new Map(),
      createdTodos: new Map(),
      updatedTodos: new Map(),
    };
  }

  private getCurrentDate(): string {
    return new Date().toISOString().split('T')[0];
  }

  private parseDate(dateStr: string | undefined): Date | undefined {
    if (!dateStr) return undefined;
    
    try {
      // 如果只包含时间（HH:mm），加上当前日期
      if (/^\d{1,2}:\d{2}$/.test(dateStr)) {
        return new Date(`${this.getCurrentDate()} ${dateStr}`);
      }
      // 如果是完整日期时间或只有日期
      return new Date(dateStr);
    } catch {
      console.log('⚠️ 日期解析失败:', dateStr);
      return undefined;
    }
  }

  private async executeCreate(step: PlanStep): Promise<StepResult> {
    const params = step.parameters;
    console.log(`⚡ 执行 step-${step.id} (create):`, params);

    const createInput = {
      title: params.title as string,
      dueDate: this.parseDate(params.dueDate as string),
      priority: (params.priority as 'high' | 'medium' | 'low') || 'medium',
    };

    if (!createInput.title) {
      return {
        step,
        success: false,
        error: '缺少 title 参数',
      };
    }

    try {
      const todo = await this.todoService.create(createInput);
      
      // 保存到状态
      this.state.createdTodos.set(step.id, todo.id);
      this.state.stepResults.set(step.id, todo);

      return {
        step,
        success: true,
        result: todo,
        message: `已创建待办：${todo.title}`,
      };
    } catch (error) {
      return {
        step,
        success: false,
        error: error instanceof Error ? error.message : '创建失败',
      };
    }
  }

  private async executeUpdate(step: PlanStep): Promise<StepResult> {
    const params = step.parameters;
    console.log(`⚡ 执行 step-${step.id} (update):`, params);

    // 检查是否有 references，需要注入依赖的 id
    let todoId = params.id;
    let oldTitle = params.oldTitle;

    if (step.references && step.references.length > 0 && !todoId && !oldTitle) {
      // 从 references 中获取依赖的 step
      for (const refId of step.references) {
        if (this.state.createdTodos.has(refId)) {
          todoId = this.state.createdTodos.get(refId);
          console.log(`📎 从依赖 ${refId} 注入 todoId: ${todoId}`);
          break;
        }
      }
    }

    const updateInput: any = {};
    if (params.title) updateInput.title = params.title;
    if (params.dueDate) updateInput.dueDate = this.parseDate(params.dueDate);
    if (params.priority) updateInput.priority = params.priority;
    if (params.status) updateInput.status = params.status;

    if (!todoId && !oldTitle) {
      return {
        step,
        success: false,
        error: '缺少定位待办的参数（id 或 oldTitle）',
      };
    }

    try {
      let updatedTodo;
      if (todoId) {
        updatedTodo = await this.todoService.update(todoId, updateInput);
      } else {
        updatedTodo = await this.todoService.updateByTitle(oldTitle!, updateInput);
      }

      if (!updatedTodo) {
        return {
          step,
          success: false,
          error: todoId 
            ? `未找到 ID 为 ${todoId} 的待办` 
            : `未找到标题包含 "${oldTitle}" 的待办`,
        };
      }

      // 保存到状态
      this.state.updatedTodos.set(step.id, updatedTodo.id);
      this.state.stepResults.set(step.id, updatedTodo);

      return {
        step,
        success: true,
        result: updatedTodo,
        message: `已修改待办：${updatedTodo.title}`,
      };
    } catch (error) {
      return {
        step,
        success: false,
        error: error instanceof Error ? error.message : '修改失败',
      };
    }
  }

  private async executeDelete(step: PlanStep): Promise<StepResult> {
    const params = step.parameters;
    console.log(`⚡ 执行 step-${step.id} (delete):`, params);

    const title = params.title as string;
    const id = params.id as string;

    if (!title && !id) {
      return {
        step,
        success: false,
        error: '缺少删除参数（title 或 id）',
      };
    }

    try {
      let deleted: boolean;
      if (id) {
        deleted = await this.todoService.delete(id);
      } else {
        deleted = await this.todoService.deleteByTitle(title!);
      }

      if (!deleted) {
        return {
          step,
          success: false,
          error: id 
            ? `未找到 ID 为 ${id} 的待办` 
            : `未找到标题包含 "${title}" 的待办`,
        };
      }

      this.state.stepResults.set(step.id, { deleted: true });

      return {
        step,
        success: true,
        result: { deleted: true },
        message: `已删除待办：${title || id}`,
      };
    } catch (error) {
      return {
        step,
        success: false,
        error: error instanceof Error ? error.message : '删除失败',
      };
    }
  }

  private async executeQuery(step: PlanStep): Promise<StepResult> {
    const params = step.parameters || {};
    console.log(`⚡ 执行 step-${step.id} (query):`, params);

    try {
      const todos = await this.todoService.findAll({
        status: params.status as 'pending' | 'completed' | undefined,
        searchKey: params.searchKey as string | undefined,
      });

      this.state.stepResults.set(step.id, todos);

      return {
        step,
        success: true,
        result: todos,
        message: todos.length === 0 
          ? '暂无待办事项' 
          : `共 ${todos.length} 条待办`,
      };
    } catch (error) {
      return {
        step,
        success: false,
        error: error instanceof Error ? error.message : '查询失败',
      };
    }
  }

  private async executeClear(step: PlanStep): Promise<StepResult> {
    console.log(`⚡ 执行 step-${step.id} (clear):`);

    try {
      const count = await this.todoService.clearAll();

      this.state.stepResults.set(step.id, { cleared: count });

      return {
        step,
        success: true,
        result: { cleared: count },
        message: `已清空 ${count} 条待办`,
      };
    } catch (error) {
      return {
        step,
        success: false,
        error: error instanceof Error ? error.message : '清空失败',
      };
    }
  }

  async execute(plan: any): Promise<ExecutionResult> {
    console.log('🚀 Executor 开始执行计划...');
    console.log('📋 计划步骤数:', plan.steps?.length || 0);

    const results: StepResult[] = [];
    let terminated = false;
    let terminatedAt: string | undefined;

    const steps = plan.steps || [];

    for (const step of steps) {
      console.log(`\n${'='.repeat(60)}`);
      console.log(`📍 即将执行: ${step.id} - ${step.type}`);
      console.log(`📝 描述: ${step.description}`);
      if (step.references && step.references.length > 0) {
        console.log(`📎 依赖: ${step.references.join(', ')}`);
      }
      console.log('='.repeat(60));

      let result: StepResult;

      switch (step.type) {
        case 'create':
          result = await this.executeCreate(step);
          break;
        case 'update':
          result = await this.executeUpdate(step);
          break;
        case 'delete':
          result = await this.executeDelete(step);
          break;
        case 'query':
          result = await this.executeQuery(step);
          break;
        case 'clear':
          result = await this.executeClear(step);
          break;
        default:
          result = {
            step,
            success: false,
            error: `未知类型: ${step.type}`,
          };
      }

      results.push(result);

      if (result.success) {
        console.log(`✅ ${step.id} 执行成功:`, result.message);
      } else {
        console.log(`❌ ${step.id} 执行失败:`, result.error);
        console.log('🚨 检测到失败，终止整个流程');
        terminated = true;
        terminatedAt = step.id;
        break;
      }
    }

    const totalSuccessful = results.filter(r => r.success).length;
    const totalFailed = results.filter(r => !r.success).length;

    console.log('\n' + '='.repeat(60));
    console.log('📊 执行统计:');
    console.log(`   总步骤数: ${steps.length}`);
    console.log(`   成功: ${totalSuccessful}`);
    console.log(`   失败: ${totalFailed}`);
    console.log(`   终止: ${terminated ? '是 (终止于 ' + terminatedAt + ')' : '否'}`);
    console.log('='.repeat(60));

    return {
      results,
      totalSuccessful,
      totalFailed,
      terminated,
      terminatedAt,
    };
  }

  // 获取执行状态（用于调试）
  getState(): ExecutionState {
    return this.state;
  }
}

export const executor = new Executor();
