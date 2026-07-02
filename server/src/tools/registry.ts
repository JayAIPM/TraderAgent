import { BaseTool, ToolDefinition } from './BaseTool'
import { CreateTodoTool } from './CreateTodoTool'
import { UpdateTodoTool } from './UpdateTodoTool'
import { DeleteTodoTool } from './DeleteTodoTool'
import { QueryTodoTool } from './QueryTodoTool'
import { ClearTodosTool } from './ClearTodosTool'

class ToolRegistry {
  private tools: Map<string, BaseTool> = new Map()

  constructor() {
    this.register(new CreateTodoTool())
    this.register(new UpdateTodoTool())
    this.register(new DeleteTodoTool())
    this.register(new QueryTodoTool())
    this.register(new ClearTodosTool())
  }

  register(tool: BaseTool): void {
    this.tools.set(tool.name, tool)
  }

  get(name: string): BaseTool | undefined {
    return this.tools.get(name)
  }

  getAll(): BaseTool[] {
    return Array.from(this.tools.values())
  }

  getDefinitions(): ToolDefinition[] {
    return this.getAll().map(tool => tool.definition)
  }

  generateToolDescriptionText(): string {
    const tools = this.getDefinitions()
    return tools.map(tool => {
      const params = Object.entries(tool.parameters.properties || {})
        .map(([key, value]) => {
          const required = tool.parameters.required?.includes(key) ? '【必填】' : '【可选】'
          const type = value.type
          const desc = value.description || ''
          const enumValues = value.enum ? ` (可选值: ${value.enum.join(', ')})` : ''
          return `  - ${key} (${type}) ${required}${desc}${enumValues}`
        })
        .join('\n')

      return `工具名称: ${tool.name}
描述: ${tool.description}
参数:
${params}`
    }).join('\n\n')
  }
}

export const toolRegistry = new ToolRegistry()
