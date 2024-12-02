import * as Multer from 'multer';

declare global {
  namespace Express {
    interface Request {
      file?: Multer.File; // For single file uploads
      files?: Multer.File[]; // For multiple file uploads
    }
  }
}
