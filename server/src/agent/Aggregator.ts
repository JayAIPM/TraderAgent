import { ExecutionResult, StepResult } from './Executor';

class Aggregator {
  private formatDueDate(date: Date | string | undefined): string {
    if (!date) return '';
    const d = new Date(date);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  }

  private aggregateSuccessResults(results: StepResult[]): string {
    const createResults = results.filter(r => r.success && r.step.type === 'create');
    const updateResults = results.filter(r => r.success && r.step.type === 'update');
    const deleteResults = results.filter(r => r.success && r.step.type === 'delete');
    const queryResults = results.filter(r => r.success && r.step.type === 'query');
    const clearResults = results.filter(r => r.success && r.step.type === 'clear');

    let parts: string[] = [];

    // 创建待办
    if (createResults.length > 0) {
      const createSummary = `已创建 ${createResults.length} 条待办：\n${
        createResults.map(r => `- ${r.result?.title || r.step.parameters?.title} (${this.formatDueDate(r.result?.dueDate)})`).join('\n')
      }`;
      parts.push(createSummary);
    }

    // 修改待办
    if (updateResults.length > 0) {
      const updateSummary = `已修改 ${updateResults.length} 条待办：\n${
        updateResults.map(r => `- ${r.result?.title || r.step.parameters?.oldTitle || '未找到标题'}`).join('\n')
      }`;
      parts.push(updateSummary);
    }

    // 删除待办
    if (deleteResults.length > 0) {
      const deleteSummary = `已删除 ${deleteResults.length} 条待办：\n${
        deleteResults.map(r => `- ${r.step.parameters?.title || r.step.parameters?.id}`).join('\n')
      }`;
      parts.push(deleteSummary);
    }

    // 查询待办
    if (queryResults.length > 0) {
      const queryResult = queryResults[0];
      if (queryResult.result && Array.isArray(queryResult.result) && queryResult.result.length > 0) {
        const todos = queryResult.result as any[];
        const summary = `查询到 ${todos.length} 条待办：\n${
          todos.slice(0, 10).map(t => `- ${t.title} (${this.formatDueDate(t.dueDate)})`).join('\n')
        }${todos.length > 10 ? `\n...还有 ${todos.length - 10} 条，共 ${todos.length} 条` : ''}`;
        parts.push(summary);
      } else {
        parts.push('暂无待办事项');
      }
    }

    // 清空待办
    if (clearResults.length > 0) {
      const clearResult = clearResults[0];
      const cleared = clearResult.result?.cleared || 0;
      parts.push(`已清空所有待办（共 ${cleared} 条）`);
    }

    return parts.join('\n\n');
  }

  private aggregateFailureResults(results: StepResult[]): string {
    const failed = results.filter(r => !r.success);

    if (failed.length === 0) {
      return '';
    }

    return `\n\n⚠️ 执行过程中遇到 ${failed.length} 个问题：\n${
      failed.map(r => `- ${r.step.id}: ${r.error}`).join('\n')
    }`;
  }

  aggregate(executionResult: ExecutionResult): string {
    console.log('📊 Aggregator 开始聚合结果...');

    const { results, totalSuccessful, totalFailed, terminated, terminatedAt } = executionResult;

    let response = '';

    if (totalSuccessful > 0) {
      response += this.aggregateSuccessResults(results);
    }

    if (totalFailed > 0) {
      response += this.aggregateFailureResults(results);
    }

    if (terminated && totalSuccessful > 0 && totalFailed > 0) {
      response += `\n\n⚠️ 流程在 ${terminatedAt} 处终止，后续步骤未执行`;
    }

    if (response === '') {
      response = '未执行任何操作';
    }

    console.log('✅ Aggregator 聚合完成');

    return response;
  }
}

export const aggregator = new Aggregator();
