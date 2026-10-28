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
import { UserRolesEnum } from '../utils/constants.js';

const addMembersToProject = asyncHandler(async (req, res) => {});

const createProject = asyncHandler(async (req, res) => {
  // Get name and description of project
  const { name, description } = req.body;

  // Create project in project DB
  const project = await Project.create({
    name,
    description,
    createdBy: new mongoose.Types.ObjectId(req.user._id),
  });

  // Make the creating member ADMIN of project
  await ProjectMember.create({
    user: new mongoose.Types.ObjectId(req.user._id),
    project: new mongoose.Types.ObjectId(project._id),
    role: UserRolesEnum.ADMIN,
  });

  return res
    .status(201)
    .json(new ApiResponse(201, { project }, 'Project Created Successfully'));
});

const deleteMember = asyncHandler(async (req, res) => {});

const deleteProject = asyncHandler(async (req, res) => {
  // Get projectId from req prameters
  const { projectId } = req.params;

  // Start a mongoose session for DB Transaction
  const session = await mongoose.startSession();

  try {
    await session.withTransaction(async () => {
      // Find the project to be deleted
      const project = await Project.findById(projectId).session(session);

      // Check authorization
      if (!project) throw new ApiError(404, 'Project not found');
      if (project.createdBy.equals(req.user._id))
        throw new ApiError(403, 'Forbidden/unauthorized request');

      // Delete the corresponding projectMembers, ProjectNotes, Tasks, SubTasks
      await ProjectMember.deleteMany({ projectId }, { session });
      await ProjectNote.deleteMany({ projectId }, { session });
      await Task.deleteMany({ projectId }, { session });
      await SubTask.deleteMany({ projectId }, { session });

      // Delete the corresponding Project
      await Project.deleteOne({ _id: projectId }, { session });

      return res
        .status(200)
        .json(new ApiResponse(200, {}, 'Project deleted successfully'));
    });
  } finally {
    // End Session
    await session.endSession();
  }
});

const getProject = asyncHandler(async (req, res) => {
  const projects = await ProjectMember.aggregate([
    {
      $match: {
        user: new mongoose.Types.ObjectId(req.user._id),
      },
    },
    {
      $lookup: {
        from: 'projects',
        localField: 'projects',
        foreignField: '_id',
        as: 'projects',
        pipeline: [
          {
            $lookup: {
              from: 'projectmembers',
              localField: '_id',
              foreignField: 'projects',
              as: 'projectmembers',
            },
          },
          {
            $addFields: {
              members: {
                $size: '$projectmembers',
              },
            },
          },
        ],
      },
    },
    {
      $unwind: '$project',
    },
    {
      $project: {
        project: {
          _id: 1,
          name: 1,
          description: 1,
          members: 1,
          createdAt: 1,
          createdBy: 1,
        },
        role: 1,
        _id: 0,
      },
    },
  ]);

  return res
    .status(200)
    .json(new ApiResponse(200, projects, 'Projects Fetched'));
});

const getProjectById = asyncHandler(async (req, res) => {});

const getProjectMembers = asyncHandler(async (req, res) => {});

const updateMemberRole = asyncHandler(async (req, res) => {});

const updateProject = asyncHandler(async (req, res) => {
  // Get name, description & projectId
  const { name, description } = req.body;
  const { projectId } = rq.params;

  const updates = {};
  if (name) updates.name = name;
  if (description) updates.description = description;

  const updatedProject = await Project.findOneAndUpdate(
    {
      _id: projectId,
      createdBy: req.user._id,
    },
    { $set: updates },
    { new: true }
  );

  if (!updatedProject)
    throw new ApiError(404, 'Project no found or unauthorized access');

  return res.status(200).json(
    new ApiResponse(
      200,
      { updatedProject },
      `Project Updated successfully
        name: ${updatedProject.name},
        description: ${updatedProject.description}`
    )
  );
});

export {
  addMembersToProject,
  createProject,
  deleteMember,
  deleteProject,
  getProject,
  getProjectById,
  getProjectMembers,
  updateMemberRole,
  updateProject,
};
