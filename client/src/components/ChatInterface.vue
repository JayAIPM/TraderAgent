<template>
  <div class="chat-interface">
    <div class="chat-header">
      <h2>待办事项 AI 助手</h2>
    </div>
    <div class="chat-messages" ref="messagesContainer">
      <div class="welcome-message">
        <el-alert
          title="欢迎使用待办事项 AI 助手"
          type="info"
          :closable="false"
          description="我可以帮您管理待办事项，请在下方输入您的需求"
        />
      </div>
      <div v-for="msg in messages" :key="msg.id" :class="['message', msg.role]">
        <div class="message-avatar">
          <el-icon v-if="msg.role === 'user'"><User /></el-icon>
          <el-icon v-else><ChatDotRound /></el-icon>
        </div>
        <div class="message-content">
          <div class="message-text">{{ msg.content }}</div>
          
          <!-- Plan-and-Execute 详细结果 -->
          <div v-if="msg.planDetails" class="plan-details">
            <div v-if="msg.planDetails.thought" class="thought-section">
              <el-tag type="info" size="small">思考过程</el-tag>
              <p class="thought-text">{{ msg.planDetails.thought }}</p>
            </div>
            <StepExecutionList
              :steps="msg.planDetails.steps"
              :summary="msg.planDetails.summary"
            />
          </div>
          
          <!-- 向后兼容的旧格式 -->
          <div v-else-if="msg.result" class="message-result">
            <el-alert
              :title="msg.result.message"
              :type="msg.result.success ? 'success' : 'error'"
              :closable="false"
              :description="msg.result.data ? formatResultData(msg.result.data) : undefined"
            />
          </div>
        </div>
      </div>
      <!-- 阶段式加载组件 -->
      <div v-if="loading" class="message agent">
        <div class="message-avatar">
          <el-icon><ChatDotRound /></el-icon>
        </div>
        <div class="message-content">
          <PlanExecutionStage :currentStage="currentStage" />
        </div>
      </div>
    </div>
    <div class="chat-input">
      <div class="input-container">
        <el-input
          v-model="inputText"
          type="textarea"
          :rows="3"
          placeholder="输入您的需求，例如：明天下午三点开会"
          :disabled="loading"
          @keyup.enter="handleSend"
        />
        <div class="input-footer">
          <el-button type="primary" :loading="loading" :disabled="!inputText.trim()" @click="handleSend">
            发送
          </el-button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, nextTick } from 'vue'
import { User, ChatDotRound } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import { sendAgentMessage, type AgentChatResponse, type PlanDetails } from '../api/agent'
import PlanExecutionStage from './chat/PlanExecutionStage.vue'
import StepExecutionList from './chat/StepExecutionList.vue'

type MessageRole = 'user' | 'agent'

type Stage = 'planning' | 'executing' | 'aggregating'

interface Message {
  id: string
  role: MessageRole
  content: string
  result?: {
    success: boolean
    message: string
    data?: any
  }
  planDetails?: PlanDetails
}

const emit = defineEmits<{
  (e: 'messageSent'): void
}>()

const messages = ref<Message[]>([])
const inputText = ref('')
const loading = ref(false)
const currentStage = ref<Stage>('planning')
const messagesContainer = ref<HTMLElement | null>(null)

const formatResultData = (data: any): string => {
  if (!data) return ''
  if (typeof data === 'string') return data
  if (Array.isArray(data)) {
    return data.map((item: any) => item.title || JSON.stringify(item)).join(', ')
  }
  if (typeof data === 'object') {
    if (data.title) return `标题：${data.title}`
    return JSON.stringify(data)
  }
  return String(data)
}

const scrollToBottom = () => {
  nextTick(() => {
    if (messagesContainer.value) {
      messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight
    }
  })
}

const handleSend = async () => {
  const text = inputText.value.trim()
  if (!text) return

  const userMessage: Message = {
    id: Date.now().toString(),
    role: 'user',
    content: text
  }
  messages.value.push(userMessage)
  inputText.value = ''
  loading.value = true
  currentStage.value = 'planning'
  scrollToBottom()

  try {
    // 模拟阶段切换（让用户看到动画效果）
    setTimeout(() => {
      if (currentStage.value === 'planning') {
        currentStage.value = 'executing'
      }
    }, 800)

    const response = await sendAgentMessage(text)
    const responseData = response.data as AgentChatResponse

    // 切换到聚合阶段
    currentStage.value = 'aggregating'
    await new Promise(resolve => setTimeout(resolve, 300))

    let agentContent = ''
    if (responseData.result) {
      agentContent = responseData.result.message
    } else {
      agentContent = '操作已完成'
    }

    const agentMessage: Message = {
      id: (Date.now() + 1).toString(),
      role: 'agent',
      content: agentContent,
      result: responseData.result,
      planDetails: responseData.planDetails
    }
    messages.value.push(agentMessage)

    if (responseData.intent !== 'unknown') {
      emit('messageSent')
    }

    scrollToBottom()
  } catch (error) {
    ElMessage.error('发送消息失败，请稍后重试')
    console.error('Chat error:', error)
  } finally {
    loading.value = false
    currentStage.value = 'planning'
  }
}
</script>

<style scoped>
.chat-interface {
  display: flex;
  flex-direction: column;
  height: 100%;
  padding: 24px;
  gap: 16px;
}

.chat-header {
  padding: 0 12px;
}

.chat-header h2 {
  margin: 0;
  font-size: 20px;
  font-weight: 600;
  color: #303133;
}

.chat-messages {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
  border-radius: 8px;
  background-color: #f5f7fa;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.welcome-message {
  margin-bottom: 24px;
}

.message {
  display: flex;
  gap: 12px;
  max-width: 80%;
}

.message.user {
  margin-left: auto;
  flex-direction: row-reverse;
}

.message.agent {
  margin-right: auto;
}

.message-avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  background-color: #e0e0e0;
}

.message.user .message-avatar {
  background-color: #409eff;
  color: white;
}

.message.agent .message-avatar {
  background-color: #67c23a;
  color: white;
}

.message-avatar .el-icon {
  font-size: 18px;
}

.message-content {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.message-text {
  padding: 10px 14px;
  border-radius: 8px;
  line-height: 1.5;
}

.message.user .message-text {
  background-color: #409eff;
  color: white;
}

.message.agent .message-text {
  background-color: white;
  color: #303133;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.plan-details {
  margin-top: 8px;
  background-color: white;
  padding: 12px;
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.thought-section {
  margin-bottom: 12px;
}

.thought-text {
  margin-top: 8px;
  color: #606266;
  font-size: 13px;
  font-style: italic;
}

.message-result {
  max-width: 400px;
}

.chat-input {
  border-top: 1px solid #ebeef5;
  padding-top: 16px;
}

.input-container {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.input-footer {
  display: flex;
  justify-content: flex-end;
}
</style>
