import { Router } from 'express';
import { TodoController } from '../controllers/TodoController';
import { validateBody, validateQuery, validateParams } from '../middlewares/validator';
import {
  createTodoSchema,
  updateTodoSchema,
  todoIdSchema,
  searchByTitleSchema,
  queryTodosSchema,
  deleteByTitleSchema,
} from '../schemas/todoSchemas';

const router = Router();
const todoController = new TodoController();

router.get('/', validateQuery(queryTodosSchema), todoController.findAll);

router.get('/search', validateQuery(searchByTitleSchema), todoController.findByTitle);

router.get('/:id', validateParams(todoIdSchema), todoController.findById);

router.post('/', validateBody(createTodoSchema), todoController.create);

router.put('/:id', validateParams(todoIdSchema), validateBody(updateTodoSchema), todoController.update);

router.delete('/:id', validateParams(todoIdSchema), todoController.delete);

router.delete('/', validateBody(deleteByTitleSchema), todoController.deleteByTitle);

router.delete('/all', todoController.clearAll);

export default router;
