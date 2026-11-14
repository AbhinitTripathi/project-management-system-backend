import { AvailableUserRole, AvailableTaskStatus } from '../utils/constants.js';
import { body, oneOf, param } from 'express-validator';

// Auth Validators
const userChangeCurrentPasswordValidator = () => {
  return [
    body('oldPassword').notEmpty().withMessage('Old Password is Required'),
    body('newPassword').notEmpty().withMessage('New Password is Required'),
  ];
};

const userForgotPasswordValidator = () => {
  return [
    body('email')
      .notEmpty()
      .withMessage('Email is required')
      .isEmail()
      .withMessage('Email is invalid'),
  ];
};

const userLoginValidator = () => {
  return [
    oneOf([
      body('email').trim().isEmail().withMessage('Email is Invalid'),

      body('username')
        .trim()
        .isLength({ min: 3, max: 20 })
        .withMessage('Username is Invalid'),
    ]),
    body('password').notEmpty().withMessage('Password is required'),
  ];
};

const userResetForgotPasswordValidator = () => {
  return [body('newPassword').notEmpty().withMessage('Password is required')];
};

const userRegisterValidator = () => {
  return [
    body('email')
      .trim()
      .notEmpty()
      .withMessage('Email is required')
      .isEmail()
      .withMessage('Email is invalid'),
    body('username')
      .trim()
      .notEmpty()
      .withMessage('Username is required')
      .isLowercase()
      .withMessage('Username must be in lowercase')
      .isLength({ min: 3, max: 20 })
      .withMessage('Username must be 3 to 20 characters long'),
    body('password').notEmpty().withMessage('Passowrd is required'),
    body('fullName').optional().trim(),
  ];
};

// Project Validators
const addProjectMemeberValidator = () => {
  return [
    body('email')
      .trim()
      .notEmpty()
      .withMessage('Email is required')
      .isEmail()
      .withMessage('Email is invalid'),
    body('role')
      .trim()
      .notEmpty()
      .withMessage('Role is required')
      .isIn(AvailableUserRole)
      .withMessage('Invalid Role provided'),
  ];
};

const createProjectValidator = () => {
  return [
    body('name').trim().notEmpty().withMessage('Name is required'),
    body('description').trim().optional(),
  ];
};

// Task Validators
const createSubTaskValidator = () => {
  return [
    body('title')
      .trim()
      .notEmpty()
      .withMessage('Sub Task Title Cannot be Empty')
      .bail()
      .isLength({ min: 3, max: 100 })
      .withMessage('Title must be 3-100 characters long'),
    param('subTaskId')
      .isMongoId()
      .withMessage('Not a valid mongo ObjectId, create sub task /taskId'),
    param('projectId')
      .isMongoId()
      .withMessage('Not a valid mongo ObjectId, create sub task /projectId'),
  ];
};

const createTaskValidator = () => {
  return [
    body('title')
      .trim()
      .notEmpty()
      .withMessage('Task title cannot be empty')
      .bail()
      .isLength({ min: 3, max: 100 })
      .withMessage('Title must be 3-100 characters long'),
    body('description')
      .optional()
      .trim()
      .isLength({ min: 3, max: 1000 })
      .withMessage('description must be 3-1000 characters long'),
    body('assignedTo')
      .notEmpty()
      .withMessage('You need to assign this task to some user')
      .bail()
      .isMongoId()
      .withMessage('Not a valid mongo ObjectId, assignedTo'),
    body('status')
      .trim()
      .notEmpty()
      .withMessage('Task status is required')
      .bail()
      .isIn(AvailableTaskStatus)
      .withMessage('Not a valid task status'),
    param('projectId')
      .isMongoId()
      .withMessage('Not a valid mongo ObjectId, projectId'),
  ];
};

const deleteSubTaskValidator = () => {
  return [
    param('projectId').isMongoId().withMessage('Invalid project id'),
    param('subTaskId').isMongoId().withMessage('Invalid task id'),
  ];
};

const deleteTaskValidator = () => {
  return [
    param('projectId').isMongoId().withMessage('Invalid project id'),
    param('taskId').isMongoId().withMessage('Invalid task id'),
  ];
};

const getSubTasksValidator = () => {
  return [
    param('projectId').isMongoId().withMessage('Invalid Project id'),
    param('taskId').isMongoId().withMessage('Invalid Task id'),
  ];
};

const getTaskByIdValidator = () => {
  return [param('taskId').isMongoId().withMessage('Invalid task id')];
};

const getTasksValidator = () => {
  return [param('projectId').isMongoId().withMessage('Invalid project id')];
};

const updateSubTaskValidator = () => {
  return [
    param('projectId').isMongoId().withMessage('Invalid project id'),
    param('taskId').isMongoId().withMessage('Invalid task id'),
    body('title')
      .optional()
      .trim()
      .isLength({ min: 3, max: 100 })
      .withMessage('Title must be 3-100 characters long'),
    body('isCompleted')
      .optional()
      .isBoolean({ strict: true })
      .withMessage('completed status must be true or false'),
  ];
};

const updateTaskValidator = () => {
  return [
    body('title')
      .optional()
      .trim()
      .isLength({ min: 3, max: 100 })
      .withMessage('Title must be 3-100 characters long'),
    body('description')
      .optional()
      .trim()
      .isLength({ min: 3, max: 1000 })
      .withMessage('description must be 3-1000 characters long'),
    body('assignedTo')
      .optional()
      .isMongoId()
      .withMessage('Not a valid mongo ObjectId, assignedTo'),
    body('status')
      .optional()
      .trim()
      .isIn(AvailableTaskStatus)
      .withMessage('Not a valid task status'),
    param('projectId')
      .isMongoId()
      .withMessage('Not a valid mongo ObjectId, projectId'),
  ];
};

export {
  // Auth Exports
  userRegisterValidator,
  userLoginValidator,
  userChangeCurrentPasswordValidator,
  userResetForgotPasswordValidator,
  userForgotPasswordValidator,

  // Project Exports
  addProjectMemeberValidator,
  createProjectValidator,

  // Task Exports
  createSubTaskValidator,
  createTaskValidator,
  deleteSubTaskValidator,
  deleteTaskValidator,
  getSubTasksValidator,
  getTaskByIdValidator,
  getTasksValidator,
  updateSubTaskValidator,
  updateTaskValidator,
};
