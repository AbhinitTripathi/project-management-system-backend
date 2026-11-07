import { ApiError } from '../utils/api-error.js';
import { ApiResponse } from '../utils/api-response.js';
import { asyncHandler } from '../utils/async-handler.js';
import mongoose from 'mongoose';
import { Project } from '../models/project.model.js';
import { ProjectMember } from '../models/projectmember.model.js';
import { ProjectNote } from '../models/note.model.js';
import { Task } from '../models/task.model.js';
import { SubTask } from '../models/subtask.model.js';
import { User } from '../models/user.model.js';
import { AvailableUserRole, UserRolesEnum } from '../utils/constants.js';

const createSubTask = asyncHandler(async (req, res) => { })

const createTask = asyncHandler(async (req, res) => { })

const deleteSubTask = asyncHandler(async (req, res) => { })

const deleteTask = asyncHandler(async (req, res) => { })

const getTaskById = asyncHandler(async (req, res) => { })

const getTasks = asyncHandler(async (req, res) => { })

const updateSubTask = asyncHandler(async (req, res) => { })

const updateTask = asyncHandler(async (req, res) => { })


export {
  createSubTask,
  createTask,
  deleteSubTask,
  deleteTask,
  getTaskById,
  getTasks,
  updateSubTask,
  updateTask,
}
