import multer from 'multer';
import * as path from 'path';

const csvStorage = multer.memoryStorage(); // use diskStorage if you want to save files

export const uploadCsv = multer({
  storage: csvStorage,
  fileFilter: function (req, file, cb) {
    const allowedExtensions = ['.csv', '.xls', '.xlsx'];
    const ext = path.extname(file.originalname).toLowerCase();

    if (!allowedExtensions.includes(ext)) {
      cb(new Error('Only CSV or Excel files are allowed'));
    } else {
      cb(null, true);
    }
  },
});