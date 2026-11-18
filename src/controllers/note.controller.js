import { ApiError } from '../utils/api-error.js';
import { ApiResponse } from '../utils/api-response.js';
import { asyncHandler } from '../utils/async-handler.js';
import mongoose from 'mongoose';
import { Project } from '../models/project.model.js';
import { ProjectNote } from '../models/note.model.js';

const createProjectNote = asyncHandler(async (req, res) => {});

const deleteProjectNoteById = asyncHandler(async (req, res) => {});

const getProjectNoteById = asyncHandler(async (req, res) => {});

const getProjectNotes = asyncHandler(async (req, res) => {
  const { projectId } = req.params;

  const notes = await ProjectNote.aggregate([
    {
      $match: {
        project: new mongoose.Types.ObjectId(projectId),
      },
    },
    {
      $lookup: {
        from: 'users',
        localField: 'createdBy',
        foreignField: '_id',
        as: 'createdBy',
        pipeline: [
          {
            $project: {
              _id: 0,
              user_id: '$_id',
              username: 1,
              fullname: 1,
              email: 1,
              avatar: 1,
            },
          },
        ],
      },
    },
    {
      $addFields: {
        createdBy: { $first: '$createdBy' },
      },
    },
    {
      $project: {
        _id: 0,
        note_id: '$_id',
        content: 1,
        createdBy: 1,
        createdAt: 1,
      },
    },
    {
      $sort: { createdAt: -1 },
    },
  ]);

  if (notes.length === 0) {
    if (!(await Project.exists({ _id: projectId })))
      throw new ApiError(404, 'Project not found');
  }

  return res.status(200).json(new ApiResponse(200, notes, 'Notes Fetched'));
});

const updateProjectNoteById = asyncHandler(async (req, res) => {});

export {
  createProjectNote,
  deleteProjectNoteById,
  getProjectNoteById,
  getProjectNotes,
  updateProjectNoteById,
};
