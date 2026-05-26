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
          <div v-if="msg.result" class="message-result">
            <el-alert
              :title="msg.result.message"
              :type="msg.result.success ? 'success' : 'error'"
              :closable="false"
              :description="msg.result.data ? formatResultData(msg.result.data) : undefined"
            />
          </div>
        </div>
      </div>
      <div v-if="loading" class="message agent">
        <div class="message-avatar">
          <el-icon><ChatDotRound /></el-icon>
        </div>
        <div class="message-content">
          <div class="message-text">
            <span class="typing">思考中</span>
            <span class="dot"></span>
            <span class="dot"></span>
            <span class="dot"></span>
          </div>
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
import { sendAgentMessage } from '../api/agent'

type MessageRole = 'user' | 'agent'

interface Message {
  id: string
  role: MessageRole
  content: string
  result?: {
    success: boolean
    message: string
    data?: any
  }
}

const emit = defineEmits<{
  (e: 'messageSent'): void
}>()

const messages = ref<Message[]>([])
const inputText = ref('')
const loading = ref(false)
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
  scrollToBottom()

  try {
    const response = await sendAgentMessage(text)

    let agentContent = ''
    if (response.data.result) {
      agentContent = response.data.result.message
    } else {
      agentContent = '操作已完成'
    }

    const agentMessage: Message = {
      id: (Date.now() + 1).toString(),
      role: 'agent',
      content: agentContent,
      result: response.data.result
    }
    messages.value.push(agentMessage)

    if (response.data.intent !== 'unknown') {
      emit('messageSent')
    }

    scrollToBottom()
  } catch (error) {
    ElMessage.error('发送消息失败，请稍后重试')
    console.error('Chat error:', error)
  } finally {
    loading.value = false
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

.message-result {
  max-width: 400px;
}

.typing {
  animation: blink 1s infinite;
}

@keyframes blink {
  0%, 50% { opacity: 1; }
  51%, 100% { opacity: 0.3; }
}

.dot {
  animation: dotBounce 1.4s infinite ease-in-out both;
  margin-left: 4px;
}

.dot:nth-child(1) { animation-delay: -0.32s; }
.dot:nth-child(2) { animation-delay: -0.16s; }

@keyframes dotBounce {
  0%, 80%, 100% { opacity: 0; }
  40% { opacity: 1; }
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
