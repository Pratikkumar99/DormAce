import multer from 'multer';
import { ApiError } from './ApiError.js';

const ALLOWED = new Set(['image/jpeg', 'image/png', 'image/webp']);

export const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 6, fields: 30 },
  fileFilter: (_req, file, cb) =>
    ALLOWED.has(file.mimetype) ? cb(null, true) : cb(new ApiError(400, 'Only JPG, PNG or WEBP images are allowed')),
});
