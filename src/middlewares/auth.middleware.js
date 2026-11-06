import { ApiError } from '../utils/api-error.js';
import { asyncHandler } from '../utils/async-handler.js';
import jwt from 'jsonwebtoken';
import { ProjectMember } from '../models/projectmember.model.js';
import { User } from '../models/user.model.js';

export const verifyJWT = asyncHandler(async (req, res, next) => {
  // Get Acess Token from cookies or headers
  const token =
    req.cookies?.accessToken ||
    req.header('Authorization')?.replace('Bearer ', '');

  // If no token is there User needs to LogIn
  if (!token) throw new ApiError(401, 'Unauthorized request');

  // Decode access token and append the information
  // from the token to request body
  try {
    const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
    const user = await User.findById(decodedToken?._id).select(
      '-password -refreshToken -emailVerificationToken -emailVerificationTokenExpiry'
    );

    if (!user) throw new ApiError(401, 'Invalid access token');

    req.user = user;
    next();
  } catch (error) {
    throw new ApiError(401, 'Invalid access token');
  }
});

export const validateProjectPermission = (roles = []) => {
  asyncHandler(async (req, res, next) => {
    const { projectId } = req.params;

    if (!projectId) throw new ApiError(400, 'ProjectId is required');

    const projectMember = await ProjectMember.findOne({
      user: req.user._id,
      project: projectId,
    });

    if (!projectMember) throw new ApiError(404, 'Required project not found');

    const memberRole = projectMember?.role;
    req.user.role = memberRole;

    if (!roles.includes(memberRole.toUpperCase()))
      throw new ApiError(403, "You don't have permission to execute this task");

    next();
  });
};
