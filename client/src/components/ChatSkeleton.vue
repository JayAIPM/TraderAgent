<template>
  <div class="chat-skeleton">
    <div class="chat-header">
      <h2>待办事项 AI 助手</h2>
    </div>
    <div class="chat-messages">
      <div class="welcome-message">
        <el-alert
          title="欢迎使用待办事项 AI 助手"
          type="info"
          :closable="false"
          description="我可以帮您管理待办事项，请在下方输入您的需求"
        />
      </div>
      <div class="message-placeholder">
        <p>聊天记录将显示在这里...</p>
      </div>
    </div>
    <div class="chat-input">
      <div class="input-container">
        <el-input
          v-model="inputText"
          type="textarea"
          :rows="3"
          placeholder="输入您的需求，例如：明天下午三点开会"
          disabled
        />
        <div class="input-footer">
          <el-button type="primary" disabled>发送</el-button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const inputText = ref('')
</script>

<style scoped>
.chat-skeleton {
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

.message-placeholder {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #909399;
}

.message-placeholder p {
  margin: 0;
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
