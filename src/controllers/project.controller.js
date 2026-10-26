import { ApiError } from '../utils/api-error.js';
import { ApiResponse } from '../utils/api-response.js';
import { asyncHandler } from '../utils/async-handler.js';
import mongoose from 'mongoose';
import { Project } from '../models/project.model.js';
import { ProjectMember } from '../models/projectmember.model.js';
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

const deleteProject = asyncHandler(async (req, res) => {});

const getProject = asyncHandler(async (req, res) => {});

const getProjectById = asyncHandler(async (req, res) => {});

const getProjectMembers = asyncHandler(async (req, res) => {});

const updateMemberRole = asyncHandler(async (req, res) => {});

const updateProject = asyncHandler(async (req, res) => {});

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
