import { Request, Response, NextFunction } from 'express';
import { TodoService } from '../services/TodoService';

const todoService = new TodoService();

export class TodoController {
  // 创建待办
  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { title, dueDate, priority } = req.body;

      const todo = await todoService.create({
        title: title.trim(),
        dueDate: dueDate ? new Date(dueDate) : undefined,
        priority,
      });

      res.status(201).json({
        code: 200,
        msg: '待办创建成功',
        data: todo,
      });
    } catch (error) {
      next(error);
    }
  }

  // 查询所有待办
  async findAll(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { status, searchKey, startDate, endDate } = req.query;

      const options: any = {};
      if (status) options.status = status as string;
      if (searchKey) options.searchKey = searchKey as string;
      if (startDate) options.startDate = new Date(startDate as string);
      if (endDate) options.endDate = new Date(endDate as string);

      const todos = await todoService.findAll(options);

      res.status(200).json({
        code: 200,
        msg: '查询成功',
        data: todos,
      });
    } catch (error) {
      next(error);
    }
  }

  // 根据ID查询
  async findById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;

      const todo = await todoService.findById(id as string);

      if (!todo) {
        res.status(404).json({
          code: 404,
          msg: '未找到指定待办',
          data: null,
        });
        return;
      }

      res.status(200).json({
        code: 200,
        msg: '查询成功',
        data: todo,
      });
    } catch (error) {
      next(error);
    }
  }

  // 根据标题查询
  async findByTitle(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { title } = req.query;

      const todos = await todoService.findByTitle(title as string);

      res.status(200).json({
        code: 200,
        msg: '查询成功',
        data: todos,
      });
    } catch (error) {
      next(error);
    }
  }

  // 更新待办
  async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const { title, dueDate, priority, status } = req.body;

      const updateData: any = {};
      if (title !== undefined) updateData.title = title.trim();
      if (dueDate !== undefined) updateData.dueDate = new Date(dueDate);
      if (priority !== undefined) updateData.priority = priority;
      if (status !== undefined) updateData.status = status;

      const todo = await todoService.update(id as string, updateData);

      if (!todo) {
        res.status(404).json({
          code: 404,
          msg: '未找到指定待办',
          data: null,
        });
        return;
      }

      res.status(200).json({
        code: 200,
        msg: '待办更新成功',
        data: todo,
      });
    } catch (error) {
      next(error);
    }
  }

  // 删除待办
  async delete(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;

      const deleted = await todoService.delete(id as string);

      if (!deleted) {
        res.status(404).json({
          code: 404,
          msg: '未找到指定待办',
          data: null,
        });
        return;
      }

      res.status(200).json({
        code: 200,
        msg: '待办删除成功',
        data: null,
      });
    } catch (error) {
      next(error);
    }
  }

  // 根据标题删除
  async deleteByTitle(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { title } = req.body;

      const deleted = await todoService.deleteByTitle(title);

      if (!deleted) {
        res.status(404).json({
          code: 404,
          msg: '未找到指定待办',
          data: null,
        });
        return;
      }

      res.status(200).json({
        code: 200,
        msg: '待办删除成功',
        data: null,
      });
    } catch (error) {
      next(error);
    }
  }

  // 清空所有待办
  async clearAll(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const count = await todoService.clearAll();

      res.status(200).json({
        code: 200,
        msg: `已清空 ${count} 条待办`,
        data: { deletedCount: count },
      });
    } catch (error) {
      next(error);
    }
  }
}
