const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const taskAttachmentController = require('../controllers/taskAttachmentController');
const { authenticate } = require('../middlewares/authMiddleware');

// Define the upload directory path
const UPLOAD_DIR = path.join(process.cwd(), 'uploads', 'task-attachments');

// Configure multer storage
const storage = multer.diskStorage({
    destination: UPLOAD_DIR,
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname).toLowerCase();
        cb(null, 'file-' + uniqueSuffix + ext);
    }
});

const upload = multer({
    storage: storage,
    limits: {
        fileSize: 10 * 1024 * 1024 // 10MB limit
    }
});

// Routes
router.post('/:taskId/attachments', 
    authenticate, 
    upload.array('files', 5),
    (req, res, next) => {
        console.log("Received files:", req.files);
        console.log("Body:", req.body);
        next();
    },
    taskAttachmentController.uploadFile
);

router.get('/:taskId/attachments', 
    authenticate, 
    taskAttachmentController.getTaskAttachments
);

router.get('/attachments/:attachmentId/download',
    authenticate,
    taskAttachmentController.downloadFile
);

router.delete('/attachments/:attachmentId', 
    authenticate, 
    taskAttachmentController.deleteFile
);

module.exports = router;
