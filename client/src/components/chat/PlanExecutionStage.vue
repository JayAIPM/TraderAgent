<template>
  <div class="plan-execution-stage">
    <div class="stage-item" :class="{ active: currentStage === 'planning', complete: isStageComplete('planning') }">
      <div class="stage-icon">
        <span v-if="isStageComplete('planning')">✓</span>
        <span v-else class="spinner">🎯</span>
      </div>
      <div class="stage-content">
        <div class="stage-title">规划中</div>
        <div class="stage-desc">理解您的需求并制定计划</div>
      </div>
    </div>
    
    <div class="stage-item" :class="{ active: currentStage === 'executing', complete: isStageComplete('executing') }">
      <div class="stage-icon">
        <span v-if="isStageComplete('executing')">✓</span>
        <span v-else class="spinner">⚡</span>
      </div>
      <div class="stage-content">
        <div class="stage-title">执行中</div>
        <div class="stage-desc">执行待办事项相关操作</div>
      </div>
    </div>
    
    <div class="stage-item" :class="{ active: currentStage === 'aggregating', complete: isStageComplete('aggregating') }">
      <div class="stage-icon">
        <span v-if="isStageComplete('aggregating')">✓</span>
        <span v-else class="spinner">📊</span>
      </div>
      <div class="stage-content">
        <div class="stage-title">聚合中</div>
        <div class="stage-desc">整理执行结果</div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'

type Stage = 'planning' | 'executing' | 'aggregating'

const props = defineProps<{
  currentStage: Stage
}>()

const stageOrder: Stage[] = ['planning', 'executing', 'aggregating']

const isStageComplete = (stage: Stage): boolean => {
  const currentIndex = stageOrder.indexOf(props.currentStage)
  const stageIndex = stageOrder.indexOf(stage)
  return stageIndex < currentIndex
}
</script>

<style scoped>
.plan-execution-stage {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 16px;
  background-color: #f5f7fa;
  border-radius: 8px;
}

.stage-item {
  display: flex;
  align-items: center;
  gap: 12px;
  opacity: 0.5;
  transition: all 0.3s ease;
}

.stage-item.active {
  opacity: 1;
}

.stage-item.complete {
  opacity: 0.8;
}

.stage-icon {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: #e0e0e0;
  font-size: 18px;
  transition: all 0.3s ease;
}

.stage-item.active .stage-icon {
  background-color: #409eff;
  color: white;
}

.stage-item.complete .stage-icon {
  background-color: #67c23a;
  color: white;
}

.spinner {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.stage-content {
  display: flex;
  flex-direction: column;
}

.stage-title {
  font-weight: 600;
  color: #303133;
  font-size: 14px;
}

.stage-desc {
  color: #909399;
  font-size: 12px;
}
</style>
