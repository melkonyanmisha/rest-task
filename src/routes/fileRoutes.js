import express from 'express';
import authenticateToken from '../middlewares/authMiddleware.js';
import filesController from '../controllers/filesController.js';

const router = express.Router();

// Upload a new file
router.post('/upload', authenticateToken, filesController.uploadFile);

// Get a list of all files
router.get('/list', authenticateToken, filesController.getFileList);

// Delete a file by ID
router.delete('/delete/:id', authenticateToken, filesController.deleteFile);

// Get file by ID
router.get('/:id', authenticateToken, filesController.getFileById);

// // Download a file by ID
router.get('/download/:id', authenticateToken, filesController.downloadFile);

// Update file by ID
router.put('/update/:id', authenticateToken, filesController.updateFile);

export default router;