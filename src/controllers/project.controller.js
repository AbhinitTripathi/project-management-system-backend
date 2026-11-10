import { ApiError } from '../utils/api-error.js';
import { ApiResponse } from '../utils/api-response.js';
import { asyncHandler } from '../utils/async-handler.js';
import mongoose from 'mongoose';
import { Project } from '../models/project.model.js';
import { ProjectMember } from '../models/projectmember.model.js';
import { ProjectNote } from '../models/note.model.js';
import { Task } from '../models/task.model.js';
import {
  addedToProjectContent,
  sendEmail,
  updatedRoleContent,
} from '../utils/mail.js';
import { SubTask } from '../models/subtask.model.js';
import { User } from '../models/user.model.js';
import { AvailableUserRole, UserRolesEnum } from '../utils/constants.js';

const addMembersToProject = asyncHandler(async (req, res) => {
  // Get user to be added
  let { email, role } = req.body;
  email = email?.trim().toLowerCase();
  // Get project to add the user into
  const { projectId } = req.params;

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
  if (existingMember)
    throw new ApiError(400, 'User already a member of this project');

  // Add User as a member of project
  const createdMember = await ProjectMember.findOneAndUpdate(
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
      returnDocument: 'after',
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

const deleteMember = asyncHandler(async (req, res) => {
  const { projectId, userId } = req.params;

  // Validate project and user id
  if (!mongoose.isValidObjectId(userId) || !mongoose.isValidObjectId(projectId))
    throw new ApiError(400, 'Invalid project or user Id');

  // Find requesting user's membership
  const reqUser = await ProjectMember.findOne({
    user: req.user._id,
    project: projectId,
  });
  if (!reqUser) throw new ApiError(404, 'User does not exist in the project');

  // Check authorization
  if (reqUser.role !== UserRolesEnum.ADMIN)
    throw new ApiError(403, 'You are not authorized to delete user');

  // Delete user
  const userToBeDel = await ProjectMember.findOneAndDelete({
    user: userId,
    project: projectId,
  });
  if (!userToBeDel) throw new ApiError(404, 'User to be deleted not found');

  return res
    .status(204)
    .json(new ApiResponse(204, userToBeDel, 'User deleted successfully'));
});

const deleteProject = asyncHandler(async (req, res) => {
  const { projectId } = req.params;

  const session = await mongoose.startSession();

  try {
    await session.withTransaction(async () => {
      // Authorization and existence check in one query
      const project = await Project.findById(projectId)
        .select('createdBy')
        .session(session);

      if (!project) throw new ApiError(404, 'Project not found');
      if (!project.createdBy.equals(req.user._id))
        throw new ApiError(403, 'Forbidden/unauthorized request');

      // Delete dependents first, then the project itself
      await ProjectMember.deleteMany({ projectId }, { session });
      await ProjectNote.deleteMany({ projectId }, { session });
      await Task.deleteMany({ projectId }, { session });
      await SubTask.deleteMany({ projectId }, { session });
      await Project.deleteOne({ _id: projectId }, { session });
    });
  } finally {
    await session.endSession();
  }

  // Respond only after the transaction has committed
  return res
    .status(200)
    .json(new ApiResponse(200, {}, 'Project deleted successfully'));
});

const getProjects = asyncHandler(async (req, res) => {
  const projects = await ProjectMember.aggregate([
    {
      $match: {
        user: new mongoose.Types.ObjectId(req.user._id),
      },
    },
    {
      $lookup: {
        from: 'projects',
        localField: 'project',
        foreignField: '_id',
        as: 'project',
        pipeline: [
          {
            $lookup: {
              from: 'projectmembers',
              localField: '_id',
              foreignField: 'project',
              as: 'projectmembers',
            },
          },
          {
            $addFields: {
              members: { $size: '$projectmembers' },
            },
          },
          {
            $project: { projectmembers: 0 },
          },
        ],
      },
    },
    { $unwind: '$project' },
    {
      $project: {
        project: {
          _id: '$project._id',
          name: '$project.name',
          description: '$project.description',
          members: '$project.members',
          createdAt: '$project.createdAt',
          createdBy: '$project.createdBy',
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

const updateMemberRole = asyncHandler(async (req, res) => {
  const { projectId, userId } = req.params;
  const { newRole } = req.body;

  // Get details of user trying to update the role
  const reqUser = await ProjectMember.findOne({
    user: req.user._id,
    project: projectId,
  });
  if (!reqUser) throw new ApiError(404, 'You are not a part of this project');

  // Throw error if not ADMIN
  if (reqUser.role !== UserRolesEnum.ADMIN)
    throw new ApiError(403, 'You are not authorized');

  // Check if given role is valid
  if (!AvailableUserRole.includes(newRole))
    throw new ApiError(400, 'Invalid Role');

  // Check if the given project and userId are valid
  if (
    !mongoose.isValidObjectId(projectId) ||
    !mongoose.isValidObjectId(userId)
  ) {
    throw new ApiError(400, 'Invalid project or user ID');
  }

  // Atomic: Update member and get username, email (from User)
  // project name (from Project)
  const updatedMember = await ProjectMember.findOneAndUpdate(
    {
      user: userId,
      project: projectId,
    },
    {
      $set: { role: newRole },
    },
    {
      new: true,
      runValidators: true,
    }
  )
    .populate('user', 'username email')
    .populate('project', 'name');

  // Member not in project
  if (!updatedMember)
    throw new ApiError(404, 'User not found in given project');

  await sendEmail({
    mailGenContent: updatedRoleContent(
      updatedMember.user.username,
      updatedMember.project.name,
      newRole
    ),
    subject: 'Your role has been updated!',
    email: updatedMember.user.email,
  });

  return res
    .status(200)
    .json(
      new ApiResponse(200, updatedMember, 'Member role updated successfully')
    );
});

const updateProject = asyncHandler(async (req, res) => {
  // Get name, description & projectId
  const { name, description } = req.body;
  const { projectId } = req.params;
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
  getProjects,
  getProjectById,
  getProjectMembers,
  updateMemberRole,
  updateProject,
};
