<template>
  <div class="step-execution-card" :class="{ 'success': step.success, 'failed': !step.success }">
    <div class="step-header" @click="toggleExpanded">
      <div class="step-icon">{{ getStepIcon(step.type) }}</div>
      <div class="step-info">
        <div class="step-title">{{ step.description }}</div>
        <div class="step-type">{{ step.type.toUpperCase() }}</div>
      </div>
      <div class="step-status">
        <el-icon v-if="step.success" class="success-icon"><Check /></el-icon>
        <el-icon v-else class="error-icon"><Close /></el-icon>
      </div>
      <el-icon class="expand-icon" :class="{ rotated: expanded }">
        <ArrowRight />
      </el-icon>
    </div>
    
    <div v-if="expanded" class="step-details">
      <div v-if="step.data" class="detail-section">
        <div class="detail-title">执行结果</div>
        <pre class="detail-content">{{ formatData(step.data) }}</pre>
      </div>
      
      <div v-if="step.error" class="detail-section error-section">
        <div class="detail-title">错误详情</div>
        <div class="detail-content error">{{ step.error }}</div>
      </div>
      
      <div v-if="step.references && step.references.length > 0" class="detail-section">
        <div class="detail-title">依赖步骤</div>
        <div class="detail-content">{{ step.references.join(', ') }}</div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { Check, Close, ArrowRight } from '@element-plus/icons-vue'
import type { StepExecution } from '../api/agent'

const props = defineProps<{
  step: StepExecution
  expanded?: boolean
}>()

const emit = defineEmits<{
  (e: 'toggle'): void
}>()

const internalExpanded = ref(props.expanded ?? !props.step.success)

const getStepIcon = (type: string): string => {
  const iconMap: Record<string, string> = {
    'create': '✏️',
    'update': '🔄',
    'delete': '🗑️',
    'query': '🔍',
    'clear': '🚫',
    'unknown': '❓'
  }
  return iconMap[type] || '❓'
}

const toggleExpanded = () => {
  internalExpanded.value = !internalExpanded.value
  emit('toggle')
}

const formatData = (data: any): string => {
  if (typeof data === 'string') return data
  if (data.title) return data.title
  if (data.deleted) return `已删除 ${data.deleted} 条`
  return JSON.stringify(data, null, 2)
}
</script>

<style scoped>
.step-execution-card {
  border-radius: 8px;
  padding: 12px;
  transition: all 0.3s ease;
}

.step-execution-card.success {
  background-color: #f0f9ff;
  border: 1px solid #b3e19d;
}

.step-execution-card.failed {
  background-color: #fef0f0;
  border: 1px solid #fbc4c4;
}

.step-header {
  display: flex;
  align-items: center;
  gap: 12px;
  cursor: pointer;
}

.step-icon {
  font-size: 24px;
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.step-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.step-title {
  font-weight: 600;
  color: #303133;
  font-size: 14px;
}

.step-type {
  font-size: 12px;
  color: #909399;
}

.step-status {
  display: flex;
  align-items: center;
}

.success-icon {
  color: #67c23a;
  font-size: 20px;
}

.error-icon {
  color: #f56c6c;
  font-size: 20px;
}

.expand-icon {
  color: #909399;
  transition: transform 0.3s ease;
}

.expand-icon.rotated {
  transform: rotate(90deg);
}

.step-details {
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid #e4e7ed;
}

.detail-section {
  margin-bottom: 12px;
}

.detail-section:last-child {
  margin-bottom: 0;
}

.detail-title {
  font-weight: 600;
  color: #606266;
  font-size: 13px;
  margin-bottom: 4px;
}

.detail-content {
  font-size: 13px;
  color: #909399;
  background-color: #f5f7fa;
  padding: 8px;
  border-radius: 4px;
  white-space: pre-wrap;
  word-break: break-word;
}

.detail-content.error {
  color: #f56c6c;
  background-color: #fef0f0;
}
</style>
