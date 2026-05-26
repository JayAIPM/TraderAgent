<template>
  <div class="main-layout">
    <div class="left-panel">
      <ChatInterface @message-sent="handleMessageSent" />
    </div>
    <div class="divider"></div>
    <div class="right-panel">
      <TodoList ref="todoListRef" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import ChatInterface from '../components/ChatInterface.vue'
import TodoList from '../components/TodoList.vue'

const todoListRef = ref<InstanceType<typeof TodoList> | null>(null)

const handleMessageSent = () => {
  todoListRef.value?.refresh()
}
</script>

<style scoped>
.main-layout {
  display: flex;
  width: 100vw;
  height: 100vh;
  overflow: hidden;
  background-color: #f5f7fa;
}

.left-panel {
  width: 40%;
  height: 100%;
  display: flex;
  flex-direction: column;
  background-color: #ffffff;
}

.divider {
  width: 1px;
  height: 100%;
  background-color: #e4e7ed;
}

.right-panel {
  width: 60%;
  height: 100%;
  display: flex;
  flex-direction: column;
  background-color: #ffffff;
}
</style>
