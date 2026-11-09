import { ApiError } from '../utils/api-error.js';
import { ApiResponse } from '../utils/api-response.js';
import { asyncHandler } from '../utils/async-handler.js';
import mongoose, { mongo } from 'mongoose';
import { Project } from '../models/project.model.js';
import { ProjectMember } from '../models/projectmember.model.js';
import { ProjectNote } from '../models/note.model.js';
import { Task } from '../models/task.model.js';
import { SubTask } from '../models/subtask.model.js';
import { User } from '../models/user.model.js';
import { AvailableUserRole, UserRolesEnum } from '../utils/constants.js';
import removeUploads from '../utils/uploads.js';

const createSubTask = asyncHandler(async (req, res) => {
  // Extract title, taskId, projectId
  const { title } = req.body;
  if (!title) throw new ApiError(400, 'Title is required');

  const { taskId, projectId } = req.params;
  if (!(await Task.exists({ _id: taskId })))
    throw new ApiError(404, 'task not found');
  if (!(await Project.exists({ _id: projectId })))
    throw new ApiError(404, 'project not found');

  // Create SubTask
  const subTask = await SubTask.create({
    title: title,
    task: taskId,
    project: projectId,
    createdBy: new mongoose.Types.ObjectId(req.user._id),
  });

  if (!subTask) {
    // Check validity
    if (!(await Task.exists({ _id: taskId })))
      throw new ApiError(404, 'task not found');
    if (!(await Project.exists({ _id: projectId })))
      throw new ApiError(404, 'project not found');

    // Bothe project and task do not exist together
    throw new ApiError(400, 'Task does not belong to this project');
  }

  return res
    .status(201)
    .json(new ApiResponse(201, subTask, 'Sub Task created'));
});

const createTask = asyncHandler(async (req, res) => {
  const { title, description, assignedTo, status } = req.body;
  const { projectId } = req.params;
  const files = Array.isArray(req.files) ? req.files : [];
  const attachments = files.map((file) => {
    return {
      url: `${process.env.SERVER_URL}/images/${file.originalname}`,
      mimetype: file.mimetype,
      size: file.size,
    };
  });

  try {
    if (!mongoose.isValidObjectId(projectId))
      throw new ApiError(400, 'Invalid project id');
    if (!assignedTo || !mongoose.isValidObjectId(assignedTo))
      throw new ApiError(400, 'Invalid assignee id');
    if (!(await Project.exists({ _id: projectId })))
      throw new ApiError(404, 'Project not found');

    if (!(await ProjectMember.exists({ user: assignedTo, project: projectId })))
      throw new ApiError(400, 'User is not a member of this project');

    const task = await Task.create({
      title,
      description,
      status,
      project: projectId,
      assignedTo,
      assignedBy: req.user._id,
      attachments,
    });

    return res
      .status(201)
      .json(
        new ApiResponse(201, task, `New task added to project ${projectId}`)
      );
  } catch (err) {
    await removeUploads(files).catch(() => {});
    throw err;
  }
});

const deleteSubTask = asyncHandler(async (req, res) => {
  // Get project id and subtask id from the url
  const { projectId, subTaskId } = req.params;

  // Delete subtask
  const deletedSubTask = await SubTask.findOneAndDelete({
    _id: subTaskId,
    project: projectId,
  });

  if (!deletedSubTask) {
    // Check validity
    if (!(await Project.exists({ _id: projectId })))
      throw new ApiError(404, 'Project not found');
    if (!(await SubTask.exists({ _id: subTaskId })))
      throw new ApiError(404, 'Subtask not found');

    // Both project and subtask do not exist together
    throw new ApiError(400, 'Subtask does not belong to this project');
  }

  return res
    .status(204)
    .json(
      new ApiResponse(204, deletedSubTask, 'Sub Task deleted successfully')
    );
});

const deleteTask = asyncHandler(async (req, res) => {});

const getTaskById = asyncHandler(async (req, res) => {
  const { taskId } = req.params;

  const task = await Task.aggregate([
    {
      $match: new mongoose.Types.ObjectId(taskId),
    },

    {
      $lookup: {
        from: 'users',
        localField: 'assignedTo',
        foreignField: '_id',
        as: 'assignedTo',
        pipeline: [
          {
            _id: 1,
            username: 1,
            fullname: 1,
            avatar: 1,
          },
        ],
      },
    },

    {
      $lookup: {
        from: 'subtasks',
        localField: '_id',
        foreignField: 'task',
        as: 'subtasks',
        pipeline: [
          {
            $lookup: {
              from: 'users',
              localField: 'createdBy',
              foreignField: '_id',
              as: 'createdBy',
              pipeline: [
                {
                  $project: {
                    _id: 1,
                    username: 1,
                    fullname: 1,
                    avatar: 1,
                  },
                },
                {
                  $addFields: {
                    createdBy: { $arrayElemAt: ['$createdBy', 0] },
                  },
                },
              ],
            },
          },
        ],
      },
    },

    {
      $addFields: {
        assignedTo: { $arrayElemAt: ['$assinedTo', 0] },
      },
    },
  ]);

  if (!task || task.length === 0) {
    throw new ApiError(404, 'Task not found');
  }

  return res
    .status(200)
    .json(new ApiResponse(200, task[0], 'Task fetched successfullt'));
});

const getTasks = asyncHandler(async (req, res) => {
  const { projectId } = req.params;
  if (!Project.exists({ _id: new mongoose.Types.ObjectId(projectId) }))
    throw new ApiError(404, 'Project not found');

  const tasks = await Task.find({
    project: new mongoose.Types.ObjectId(projectId),
  }).populate('assignedTo', 'avatar username fullName');

  return res
    .status(200)
    .json(new ApiResponse(200, tasks, 'Tasks fetched successfully'));
});

const updateSubTask = asyncHandler(async (req, res) => {});

const updateTask = asyncHandler(async (req, res) => {});

export {
  createSubTask,
  createTask,
  deleteSubTask,
  deleteTask,
  getTaskById,
  getTasks,
  updateSubTask,
  updateTask,
};
