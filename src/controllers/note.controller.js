import { ApiError } from '../utils/api-error.js';
import { ApiResponse } from '../utils/api-response.js';
import { asyncHandler } from '../utils/async-handler.js';
import mongoose from 'mongoose';
import { Project } from '../models/project.model.js';
import { ProjectNote } from '../models/note.model.js';

const createProjectNote = asyncHandler(async (req, res) => {
  // Get data from params and body
  const { projectId } = req.params;
  const { content } = req.body;

  // Check if project exists
  // If we do not check here then
  // ProjectNote.create() will create an
  // orphaned note in the unhappyp path!
  // We will get a case where the project is deleted
  // but a note belonging to that project will be
  // created, so check existance first
  if (!(await Project.exists({ _id: projectId })))
    throw new ApiError(404, 'Project not found');

  // Add note to DB
  const note = await ProjectNote.create({
    project: projectId,
    createdBy: req.user._id,
    content: content,
  });

  // Check validity if note was not created
  if (!note) {
    if (!(await Project.exists({ _id: projectId })))
      throw new ApiError(404, 'Project not found');
  }

  return res
    .status(201)
    .json(new ApiResponse(201, note, 'A new note was added to the project'));
});

const deleteProjectNoteById = asyncHandler(async (req, res) => {
  const { projectId, noteId } = req.params;

  const deletedNote = await ProjectNote.findOneAndDelete(
    { _id: noteId, project: projectId },
    {
      projection: { _id: 1 },
      lean: true,
    }
  );

  if (!deletedNote) {
    const [projectExists, noteExists] = await Promise.all([
      Project.exists({ _id: projectId }),
      ProjectNote.exists({ _id: noteId }),
    ]);

    if (!projectExists)
      throw new ApiError(404, 'Project not found');
    if (!noteExists)
      throw new ApiError(404, 'Note not found');
    throw new ApiError(400, 'Note does not belong to this project');
  }

  return res
    .status(200)
    .json(new ApiResponse(200, deletedNote, 'Note Successfully deleted'));
});

const getProjectNoteById = asyncHandler(async (req, res) => {
  const { projectId, noteId } = req.params;

  const [note] = await ProjectNote.aggregate([
    { $match: { _id: new mongoose.Types.ObjectId(noteId) } },
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
              avatar: 1,
              username: 1,
              fullname: 1,
              email: 1,
            },
          },
        ],
      },
    },
    { $unwind: { path: '$createdBy', preserveNullAndEmptyArrays: true } },
    {
      $project: {
        _id: 0,
        note_id: '$_id',
        content: 1,
        createdBy: 1,
        createdAt: 1,
      },
    },
  ]);

  if (!note) {
    if (!(await Project.exists({ _id: projectId })))
      throw new ApiError(404, 'Project not found');
    if (!(await ProjectNote.exists({ _id: noteId })))
      throw new ApiError(404, 'Note not found');
    throw new ApiError(400, 'Note does not belong to this project');
  }

  return res.status(200).json(new ApiResponse(200, note, 'Note fetched'));
});

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

const updateProjectNoteById = asyncHandler(async (req, res) => {
  const { projectId, noteId } = req.params;

  const { content } = req.body;

  const updatedNote = await ProjectNote.findOneAndUpdate(
    { _id: noteId, project: projectId },
    { $set: { content: content } },
    { returnDocument: 'after', runValidators: true }
  );

  if (!updatedNote) {
    const [projectExists, noteExists] = await Promise.all([
      Project.exists({ _id: projectId }),
      ProjectNote.exists({ _id: projectId }),
    ]);

    if (!projectExists) throw new ApiError(404, 'Project not found');
    if (!noteExists) throw new ApiError(404, 'Note not found');
    throw new ApiError(400, 'Note does not belong to this project');
  }

  return res
    .status(200)
    .json(new ApiResponse(200, updatedNote, 'Note Updated!'));
});

export {
  createProjectNote,
  deleteProjectNoteById,
  getProjectNoteById,
  getProjectNotes,
  updateProjectNoteById,
};
