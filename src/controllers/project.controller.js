import { ApiError } from '../utils/api-error.js';
import { ApiResponse } from '../utils/api-response.js';
import { asyncHandler } from '../utils/async-handler.js';
import mongoose from 'mongoose';
import { Project } from '../models/project.model.js';
import { ProjectMember } from '../models/projectmember.model.js';
import { ProjectNote } from '../models/note.model.js';
import { Task } from '../models/task.model.js';
import { addedToProjectContent, sendEmail } from '../utils/mail.js';
import { SubTask } from '../models/subtask.model.js';
import { User } from '../models/user.model.js';
import { UserRolesEnum } from '../utils/constants.js';
import { pipeline } from 'nodemailer/lib/xoauth2/index.js';

const addMembersToProject = asyncHandler(async (req, res) => {
  // Get user to be added
  const { email, role } = req.body;
  email = email?.trim().toLowerCase();
  // Get project to add the user into
  const { projectId } = req.params;

  // Check if user has permission to add members
  const allowedRoles = [UserRolesEnum.ADMIN, UserRolesEnum.PROJECT_ADMIN];
  const requesterUser = await ProjectMember.findOne({
    user: req.user._id,
    project: projectId,
  });
  if (!requesterUser || !allowedRoles.includes(requesterUser.role))
    throw new ApiError(403, 'You do not have permission to add members');

  // Find required User
  const user = await User.findOne({ email });
  if (!user) throw new ApiError(404, 'Requested user not found');

  // Find required project
  const project = await Project.findById(projectId);
  if (!project) throw new ApiError(404, 'Project not found');

  // Check if user already exists as a member of the project
  const existingMember = await ProjectMember.findOne({
    user: user._id,
    project: projectId,
  });
  if (!existingMember)
    throw new ApiError(400, 'User already a member of this project');

  // Add User as a member of project
  const createdMember = await ProjectMember.findByOneAndUpdate(
    {
      user: user._id,
      project: projectId,
    },
    {
      $set: { role: role },
      $setOnInsert: {
        user: user._id,
        project: projectId,
      },
    },
    {
      new: true,
      upsert: true,
    }
  );
  if (!createdMember) throw new ApiError(500, 'Internal Server Error');

  // Send invitation mail
  try {
    await sendEmail({
      mailGenContent: addedToProjectContent(user.username, project.name),
      email,
      subject: 'You have been added to collaborate on a project',
    });
  } catch (error) {
    console.error('Failerd to send project invitation mail: ', error);
  }

  return res
    .status(201)
    .json(
      new ApiResponse(
        201,
        createdMember,
        'Member added to project successfully'
      )
    );
});

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
          {
            $project: {
              projectmembers: 0,
            },
          },
        ],
      },
    },
    {
      $unwind: '$projects',
    },
    {
      $project: {
        project: {
          _id: '$projects._id',
          name: '$projects.name',
          description: '$projects.description',
          members: '$projects.members',
          createdAt: '$projects.createdAt',
          createdBy: '$projects.createdBy',
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

const getProjectById = asyncHandler(async (req, res) => {
  const { projectId } = req.params;

  const project = await Project.findById(projectId);

  if (!project) throw new ApiError(404, `Project not found`);

  return res
    .status(200)
    .json(new ApiResponse(200, project, `Project fetched successfully`));
});

const getProjectMembers = asyncHandler(async (req, res) => {
  const { projectId } = req.params;

  const project = await Project.findById(projectId);
  if (!project) throw new ApiError(404, 'project not found');

  const projectMembers = await ProjectMember.aggregate([
    {
      $match: {
        project: new mongoose.Types.ObjectId(projectId),
      },
    },
    {
      $lookup: {
        from: 'users',
        localField: 'user',
        foreignField: '_id',
        as: 'user',
        pipeline: [
          {
            $project: {
              _id: 1,
              username: 1,
              fullname: 1,
              avatar: 1,
            },
          },
        ],
      },
    },
    {
      $unwind: '$user',
    },
    {
      $project: {
        project: 1,
        user: 1,
        role: 1,
        createdAt: 1,
        updatedAt: 1,
        _id: 0,
      },
    },
  ]);

  return res
    .status(200)
    .json(new ApiResponse(200, projectMembers, 'Project Members fetched'));
});

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
