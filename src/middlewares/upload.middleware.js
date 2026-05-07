import fs from 'fs';
import path from 'path';
import multer from 'multer';
import { AppError } from '../utils/appError.js';

const createStorage = (folderName) => {
  const uploadDirectory = path.resolve(process.cwd(), 'uploads', folderName);
  fs.mkdirSync(uploadDirectory, { recursive: true });

  return multer.diskStorage({
    destination: (_req, _file, cb) => {
      cb(null, uploadDirectory);
    },
    filename: (_req, file, cb) => {
      const extension = path.extname(file.originalname);
      const safeName = path
        .basename(file.originalname, extension)
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');

      cb(null, `${Date.now()}-${safeName || 'file'}${extension}`);
    },
  });
};

const imageFileFilter = (_req, file, cb) => {
  if (!file.mimetype.startsWith('image/')) {
    cb(new AppError('Only image files are allowed.', 400));
    return;
  }

  cb(null, true);
};

export const studentImageUpload = multer({
  storage: createStorage('students'),
  limits: {
    fileSize: 5 * 1024 * 1024,
  },
  fileFilter: imageFileFilter,
});

export const teacherImageUpload = multer({
  storage: createStorage('teachers'),
  limits: {
    fileSize: 5 * 1024 * 1024,
  },
  fileFilter: imageFileFilter,
});
