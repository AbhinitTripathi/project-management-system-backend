import { Router } from 'express';
import {
  createSubTaskValidator,
  createTaskValidator,
  deleteSubTaskValidator,
  deleteTaskValidator,
  getTaskByIdValidator,
  getTasksValidator,
  updateSubTaskValidator,
  updateTaskValidator,
} from '../validators/index.js';
import {
  createSubTask,
  createTask,
  deleteSubTask,
  deleteTask,
  getTaskById,
  getTasks,
  updateSubTask,
  updateTask,
} from '../controllers/task.controller.js';
import {
  validateProjectPermission,
  verifyJWT,
} from '../middlewares/auth.middleware.js';
import { validate } from '../middlewares/validator.middleware.js';
import { AvailableUserRole, UserRolesEnum } from '../utils/constants.js';

const router = Router();

router.use(verifyJWT);

const MANAGERS = [UserRolesEnum.ADMIN, UserRolesEnum.PROJECT_ADMIN];

// Get and Post tasks
router
  .route('/:projectId')
  .get(
    getTasksValidator(),
    validate,
    validateProjectPermission(AvailableUserRole),
    getTasks
  )
  .post(
    createTaskValidator(),
    validate,
    validateProjectPermission(MANAGERS),
    createTask
  );

// Get, Update & Delete task by id
router
  .route('/:projectId/t/:taskId')
  .get(
    getTaskByIdValidator(),
    validate,
    validateProjectPermission(AvailableUserRole),
    getTaskById
  )
  .put(
    updateTaskValidator(),
    validate,
    validateProjectPermission(MANAGERS),
    updateTask
  )
  .delete(
    deleteTaskValidator(),
    validate,
    validateProjectPermission(MANAGERS),
    deleteTask
  );

// Get and Create SubTasks
router
  .route('/:projectId/t/:taskId/subtasks')
  //.get() TODO
  .post(
    createSubTaskValidator(),
    validate,
    validateProjectPermission(AvailableUserRole),
    createSubTask
  );

// Update & Delete SubTasks by id
router
  .route('/:projectId/st/:subTaskId')
  .put(
    updateSubTaskValidator(),
    validate,
    validateProjectPermission(AvailableUserRole),
    updateSubTask
  )
  .delete(
    deleteSubTaskValidator(),
    validate,
    validateProjectPermission(MANAGERS),
    deleteSubTask
  );
