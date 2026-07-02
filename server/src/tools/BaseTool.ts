export interface ToolResult {
  success: boolean
  message: string
  data?: any
}

export interface ToolParameterSchema {
  type: 'string' | 'number' | 'boolean' | 'object' | 'array'
  description?: string
  properties?: Record<string, ToolParameterSchema>
  required?: string[]
  items?: ToolParameterSchema
  enum?: string[]
}

export interface ToolDefinition {
  name: string
  description: string
  parameters: ToolParameterSchema
}

export abstract class BaseTool {
  protected _definition: ToolDefinition

  constructor(definition: ToolDefinition) {
    this._definition = definition
  }

  get definition(): ToolDefinition {
    return this._definition
  }

  get name(): string {
    return this._definition.name
  }

  get description(): string {
    return this._definition.description
  }

  abstract execute(params: Record<string, any>, context?: ToolContext): Promise<ToolResult>
}

export interface ToolContext {
  state: Map<string, any>
  stepId?: string
  references?: string[]
}
