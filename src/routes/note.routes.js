import { Router } from 'express';

import { AvailableUserRole, UserRolesEnum } from '../utils/constants.js';

import {
  createProjectNote,
  deleteProjectNoteById,
  getProjectNoteById,
  getProjectNotes,
  updateProjectNoteById,
} from '../controllers/note.controller.js';

import {
  createProjectNoteValidator,
  deleteNoteByIdValidator,
  getProjectNoteByIdValidator,
  getProjectNotesValidator,
  updateProjectNoteByIdValidator,
} from '../validators/index.js';

import {
  verifyJWT,
  validateProjectPermission,
} from '../middlewares/auth.middleware.js';
import { validate } from '../middlewares/validator.middleware.js';

const router = Router();

router.use(verifyJWT);

const MANAGERS = [UserRolesEnum.ADMIN, UserRolesEnum.PROJECT_ADMIN];

// Get and create Notes
router
  .route('/:projectId')
  .get(
    getProjectNotesValidator(),
    validate,
    validateProjectPermission(AvailableUserRole),
    getProjectNotes
  )
  .post(
    createProjectNoteValidator(),
    validate,
    validateProjectPermission(MANAGERS),
    createProjectNote
  );

// Get, Update & Delete Notes by Id
router
  .route('/:projectId/n/:noteId')
  .get(
    getProjectNoteByIdValidator(),
    validate,
    validateProjectPermission(AvailableUserRole),
    getProjectNoteById
  )
  .put(
    updateProjectNoteByIdValidator(),
    validate,
    validateProjectPermission(MANAGERS),
    updateProjectNoteById
  )
  .delete(
    deleteNoteByIdValidator(),
    validate,
    validateProjectPermission(MANAGERS),
    deleteProjectNoteById
  );

export default router;