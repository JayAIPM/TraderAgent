import api from './index'
import type { ApiResponse } from './index'

export interface Todo {
  id: string
  title: string
  dueDate: string
  priority: 'high' | 'medium' | 'low'
  status: 'pending' | 'completed'
  createdAt: string
}

export interface CreateTodoRequest {
  title: string
  dueDate?: string
  priority?: 'high' | 'medium' | 'low'
}

export interface UpdateTodoRequest {
  title?: string
  dueDate?: string
  priority?: 'high' | 'medium' | 'low'
  status?: 'pending' | 'completed'
}

export const getTodos = async (): Promise<ApiResponse<Todo[]>> => {
  return api.get('/todos')
}

export const getTodoById = async (id: string): Promise<ApiResponse<Todo>> => {
  return api.get(`/todos/${id}`)
}

export const createTodo = async (data: CreateTodoRequest): Promise<ApiResponse<Todo>> => {
  return api.post('/todos', data)
}

export const updateTodo = async (id: string, data: UpdateTodoRequest): Promise<ApiResponse<Todo>> => {
  return api.put(`/todos/${id}`, data)
}

export const deleteTodo = async (id: string): Promise<ApiResponse<void>> => {
  return api.delete(`/todos/${id}`)
}
