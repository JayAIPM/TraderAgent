<template>
  <div class="todo-list-placeholder">
    <div class="todo-header">
      <h2>待办事项</h2>
    </div>
    <div class="todo-content">
      <div class="empty-state">
        <el-empty description="待办事项将显示在这里" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
</script>

<style scoped>
.todo-list-placeholder {
  display: flex;
  flex-direction: column;
  height: 100%;
  padding: 24px;
  gap: 16px;
}

.todo-header {
  padding: 0 12px;
}

.todo-header h2 {
  margin: 0;
  font-size: 20px;
  font-weight: 600;
  color: #303133;
}

.todo-content {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
  border-radius: 8px;
  background-color: #f5f7fa;
  display: flex;
  align-items: center;
  justify-content: center;
}

.empty-state {
  text-align: center;
}
</style>
