<template>
  <div class="step-execution-list">
    <div class="list-summary">
      <div class="summary-text">
        共执行 <strong>{{ summary.total }}</strong> 个步骤，
        <span class="success">成功 {{ summary.successful }}</span>，
        <span v-if="summary.failed > 0" class="failed">失败 {{ summary.failed }}</span>
      </div>
      <el-button size="small" text @click="toggleExpandAll">
        {{ allExpanded ? '全部收起' : '全部展开' }}
      </el-button>
    </div>
    
    <div class="step-list">
      <StepExecutionCard
        v-for="(step, index) in steps"
        :key="step.id"
        :step="step"
        :expanded="cardExpandedStates[index]"
        @toggle="toggleCard(index)"
      />
    </div>
    
    <div v-if="summary.terminated" class="terminated-notice">
      <el-alert
        title="执行终止"
        type="warning"
        :closable="false"
        :description="`在第 ${getTerminatedStepIndex()} 步终止执行`"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import StepExecutionCard from './StepExecutionCard.vue'
import type { StepExecution, ExecutionSummary } from '../api/agent'

const props = defineProps<{
  steps: StepExecution[]
  summary: ExecutionSummary
}>()

const cardExpandedStates = ref<boolean[]>([])

const allExpanded = computed({
  get: () => cardExpandedStates.value.every(state => state),
  set: (value) => {
    cardExpandedStates.value = new Array(props.steps.length).fill(value)
  }
})

const toggleExpandAll = () => {
  allExpanded.value = !allExpanded.value
}

const toggleCard = (index: number) => {
  cardExpandedStates.value[index] = !cardExpandedStates.value[index]
}

const getTerminatedStepIndex = (): number => {
  if (!props.summary.terminatedAt) return props.summary.total
  const stepIndex = props.steps.findIndex(step => step.id === props.summary.terminatedAt)
  return stepIndex >= 0 ? stepIndex + 1 : props.summary.total
}

// 初始化状态：默认展开失败的步骤
watch(() => props.steps, (newSteps) => {
  if (newSteps && newSteps.length > 0) {
    cardExpandedStates.value = newSteps.map(step => !step.success)
  }
}, { immediate: true })
</script>

<style scoped>
.step-execution-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.list-summary {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
  background-color: #f5f7fa;
  border-radius: 4px;
}

.summary-text {
  color: #606266;
  font-size: 13px;
}

.summary-text strong {
  color: #303133;
  font-size: 14px;
}

.success {
  color: #67c23a;
  font-weight: 600;
}

.failed {
  color: #f56c6c;
  font-weight: 600;
}

.step-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.terminated-notice {
  margin-top: 8px;
}
</style>
