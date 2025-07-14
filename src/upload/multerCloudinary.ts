import multer from 'multer';

export const uploadMemory = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB max
  fileFilter: (req, file, cb) => {
    const ext = file.originalname.toLowerCase();
    if (!ext.match(/\.(jpg|jpeg|png|webp|mp4|mov|avi|mkv)$/)) {
      cb(new Error('Only images are allowed'));
      return;
    }
    cb(null, true);
  },
});
