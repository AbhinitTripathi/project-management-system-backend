import { Router } from 'express';
import {
  addMembersToProject,
  createProject,
  deleteMember,
  deleteProject,
  getProjects,
  getProjectById,
  getProjectMembers,
  updateMemberRole,
  updateProject,
} from '../controllers/project.controller.js';
import {
  addProjectMemeberValidator,
  createProjectValidator,
} from '../validators/index.js';
import { validate } from '../middlewares/validator.middleware.js';
import {
  verifyJWT,
  validateProjectPermission,
} from '../middlewares/auth.middleware.js';
import { AvailableUserRole, UserRolesEnum } from '../utils/constants.js';

const router = Router();

router.use(verifyJWT);

// Base route for get and post project
router
  .route('/')
  .get(getProjects)
  .post(createProjectValidator(), validate, createProject);

export default router;
