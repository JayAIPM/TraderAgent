export interface SkillResult {
  success: boolean
  message: string
  data?: any
}

export interface SkillParameterSchema {
  type: 'string' | 'number' | 'boolean' | 'object' | 'array'
  description?: string
  properties?: Record<string, SkillParameterSchema>
  required?: string[]
  items?: SkillParameterSchema
  enum?: string[]
}

export interface SkillDefinition {
  name: string
  description: string
  parameters: SkillParameterSchema
}

export interface SkillContext {
  state: Map<string, any>
  stepId?: string
  references?: string[]
}

export abstract class BaseSkill {
  protected _definition: SkillDefinition

  constructor(definition: SkillDefinition) {
    this._definition = definition
  }

  get definition(): SkillDefinition {
    return this._definition
  }

  get name(): string {
    return this._definition.name
  }

  get description(): string {
    return this._definition.description
  }

  abstract execute(params: Record<string, any>, context?: SkillContext): Promise<SkillResult>
}
