<template>
  <div class="todo-list">
    <div class="todo-header">
      <h2>待办事项</h2>
    </div>
    <div class="todo-content">
      <div v-if="loading" class="loading-state">
        <el-loading-spinner />
        <span class="loading-text">加载中...</span>
      </div>
      <el-empty v-else-if="todos.length === 0" description="暂无待办事项" />
      <div v-else class="todo-items">
        <div v-for="todo in todos" :key="todo.id" class="todo-item">
          <div class="todo-left">
            <el-checkbox 
              v-model="todo.completed" 
              @change="handleToggleComplete(todo)" 
              :disabled="loading"
            />
            <div class="todo-info">
              <div class="todo-title">
                <el-tag :type="getPriorityType(todo.priority)" size="small" class="priority-tag">
                  {{ getPriorityText(todo.priority) }}
                </el-tag>
                <span class="title-text" :class="{ completed: todo.completed }">{{ todo.title }}</span>
              </div>
              <div class="todo-meta">
                <span class="due-date">截止：{{ formatDateTime(todo.dueDate) }}</span>
                <span class="created-date">创建于：{{ formatDateTime(todo.createdAt) }}</span>
              </div>
            </div>
          </div>
          <div class="todo-right">
            <el-button type="primary" size="small" text @click="handleEdit(todo)" :disabled="loading">编辑</el-button>
            <el-button type="danger" size="small" text @click="handleDelete(todo)" :disabled="loading">删除</el-button>
          </div>
        </div>
      </div>
    </div>

    <el-dialog v-model="editDialogVisible" title="编辑待办" width="500px">
      <el-form :model="editForm" label-width="80px">
        <el-form-item label="标题">
          <el-input v-model="editForm.title" placeholder="请输入待办标题" />
        </el-form-item>
        <el-form-item label="截止时间">
          <el-date-picker
            v-model="editForm.dueDate"
            type="datetime"
            placeholder="选择截止时间"
            format="YYYY-MM-DD HH:mm"
            value-format="YYYY-MM-DD HH:mm:ss"
          />
        </el-form-item>
        <el-form-item label="优先级">
          <el-select v-model="editForm.priority" placeholder="请选择优先级">
            <el-option label="高" value="high" />
            <el-option label="中" value="medium" />
            <el-option label="低" value="low" />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="editDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleSaveEdit">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Todo, UpdateTodoRequest, getTodos, updateTodo, deleteTodo } from '../api/todos'

const formatDateTime = (dateStr: string): string => {
  const d = new Date(dateStr)
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  const hours = String(d.getHours()).padStart(2, '0')
  const minutes = String(d.getMinutes()).padStart(2, '0')
  return `${year}-${month}-${day} ${hours}:${minutes}`
}

const getPriorityType = (priority: string): any => {
  const map: Record<string, any> = {
    high: 'danger',
    medium: 'warning',
    low: 'success'
  }
  return map[priority] || 'info'
}

const getPriorityText = (priority: string): string => {
  const map: Record<string, string> = {
    high: '高',
    medium: '中',
    low: '低'
  }
  return map[priority] || priority
}

const todos = ref<Todo[]>([])
const loading = ref(false)
const editDialogVisible = ref(false)

interface EditForm {
  id: string
  title: string
  dueDate: string
  priority: 'high' | 'medium' | 'low'
}

const editForm = ref<EditForm>({
  id: '',
  title: '',
  dueDate: '',
  priority: 'medium'
})

const loadTodos = async () => {
  loading.value = true
  try {
    const response = await getTodos()
    if (response.code === 200) {
      todos.value = response.data.map((todo: Todo) => ({
        ...todo,
        completed: todo.status === 'completed'
      }))
    } else {
      ElMessage.error(response.msg || '加载待办失败')
    }
  } catch (error) {
    ElMessage.error('网络请求失败，请检查后端服务是否启动')
  } finally {
    loading.value = false
  }
}

const refresh = () => {
  loadTodos()
}

defineExpose({
  refresh
})

const handleToggleComplete = async (todo: Todo & { completed: boolean }) => {
  loading.value = true
  try {
    const status = todo.completed ? 'completed' : 'pending'
    await updateTodo(todo.id, { status })
    ElMessage.success(todo.completed ? '待办已标记为完成' : '待办已标记为未完成')
  } catch (error) {
    todo.completed = !todo.completed
    ElMessage.error('更新状态失败')
  } finally {
    loading.value = false
  }
}

const handleEdit = (todo: Todo & { completed: boolean }) => {
  editForm.value = {
    id: todo.id,
    title: todo.title,
    dueDate: formatDateTime(todo.dueDate) + ':00',
    priority: todo.priority
  }
  editDialogVisible.value = true
}

const handleSaveEdit = async () => {
  if (!editForm.value.title.trim()) {
    ElMessage.warning('请输入待办标题')
    return
  }
  loading.value = true
  try {
    const updateData: UpdateTodoRequest = {
      title: editForm.value.title,
      dueDate: editForm.value.dueDate,
      priority: editForm.value.priority
    }
    const response = await updateTodo(editForm.value.id, updateData)
    if (response.code === 200) {
      const index = todos.value.findIndex(t => t.id === editForm.value.id)
      if (index !== -1) {
        todos.value[index] = {
          ...todos.value[index],
          title: editForm.value.title,
          dueDate: editForm.value.dueDate,
          priority: editForm.value.priority
        }
      }
      editDialogVisible.value = false
      ElMessage.success('待办更新成功')
    } else {
      ElMessage.error(response.msg || '更新失败')
    }
  } catch (error) {
    ElMessage.error('网络请求失败')
  } finally {
    loading.value = false
  }
}

const handleDelete = (todo: Todo) => {
  ElMessageBox.confirm(
    `确定要删除待办"${todo.title}"吗？`,
    '删除确认',
    {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    }
  ).then(async () => {
    loading.value = true
    try {
      const response = await deleteTodo(todo.id)
      if (response.code === 200) {
        const index = todos.value.findIndex(t => t.id === todo.id)
        if (index !== -1) {
          todos.value.splice(index, 1)
        }
        ElMessage.success('待办删除成功')
      } else {
        ElMessage.error(response.msg || '删除失败')
      }
    } catch (error) {
      ElMessage.error('网络请求失败')
    } finally {
      loading.value = false
    }
  }).catch(() => {
    // 用户取消删除
  })
}

onMounted(() => {
  loadTodos()
})
</script>

<style scoped>
.todo-list {
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
}

.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px;
  gap: 12px;
}

.loading-text {
  font-size: 14px;
  color: #909399;
}

.todo-items {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.todo-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px;
  background-color: #ffffff;
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}

.todo-left {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  flex: 1;
}

.todo-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.todo-title {
  display: flex;
  align-items: center;
  gap: 8px;
}

.title-text {
  font-size: 15px;
  color: #303133;
  font-weight: 500;
  transition: all 0.3s;
}

.title-text.completed {
  text-decoration: line-through;
  color: #909399;
}

.todo-meta {
  display: flex;
  gap: 16px;
  font-size: 12px;
}

.due-date {
  color: #606266;
}

.created-date {
  color: #909399;
}

.todo-right {
  display: flex;
  gap: 8px;
}
</style>
