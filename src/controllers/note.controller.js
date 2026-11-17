import { ApiError } from '../utils/api-error.js';
import { ApiResponse } from '../utils/api-response.js';
import { asyncHandler } from '../utils/async-handler.js';
import mongoose from 'mongoose';
import { Project } from '../models/project.model.js';
import { ProjectNote } from '../models/note.model.js';

const createProjectNote = asyncHandler(async (req, res) => {});

const deleteProjectNoteById = asyncHandler(async (req, res) => {});

const getProjectNoteById = asyncHandler(async (req, res) => {});

const getProjectNotes = asyncHandler(async (req, res) => {});

const updateProjectNoteById = asyncHandler(async (req, res) => {});

export {
  createProjectNote,
  deleteProjectNoteById,
  getProjectNoteById,
  getProjectNotes,
  updateProjectNoteById,
};
