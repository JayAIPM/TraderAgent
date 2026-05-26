export interface SkillResult {
  success: boolean;
  message: string;
  data?: any;
}

export abstract class Skill {
  abstract name: string;
  abstract execute(input: string): Promise<SkillResult>;
}
