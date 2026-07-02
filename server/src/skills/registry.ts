import { BaseSkill, SkillDefinition } from './Skill'
import { CreateTodoSkill } from './CreateTodoSkill'
import { UpdateTodoSkill } from './UpdateTodoSkill'
import { DeleteTodoSkill } from './DeleteTodoSkill'
import { QueryTodoSkill } from './QueryTodoSkill'
import { ClearTodosSkill } from './ClearTodosSkill'

class SkillRegistry {
  private skills: Map<string, BaseSkill> = new Map()

  constructor() {
    this.register(new CreateTodoSkill())
    this.register(new UpdateTodoSkill())
    this.register(new DeleteTodoSkill())
    this.register(new QueryTodoSkill())
    this.register(new ClearTodosSkill())
  }

  register(skill: BaseSkill): void {
    this.skills.set(skill.name, skill)
  }

  get(name: string): BaseSkill | undefined {
    return this.skills.get(name)
  }

  getAll(): BaseSkill[] {
    return Array.from(this.skills.values())
  }

  getDefinitions(): SkillDefinition[] {
    return this.getAll().map(skill => skill.definition)
  }

  generateSkillDescriptionText(): string {
    const skills = this.getDefinitions()
    return skills.map(skill => {
      const params = Object.entries(skill.parameters.properties || {})
        .map(([key, value]) => {
          const required = skill.parameters.required?.includes(key) ? '【必填】' : '【可选】'
          const type = value.type
          const desc = value.description || ''
          const enumValues = value.enum ? ` (可选值: ${value.enum.join(', ')})` : ''
          return `  - ${key} (${type}) ${required}${desc}${enumValues}`
        })
        .join('\n')

      return `技能名称: ${skill.name}
描述: ${skill.description}
参数:
${params}`
    }).join('\n\n')
  }
}

export const skillRegistry = new SkillRegistry()
