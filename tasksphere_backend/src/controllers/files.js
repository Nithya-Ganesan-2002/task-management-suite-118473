'use strict';

const { supabase } = require('../supabase');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const mime = require('mime-types');

/**
 * FileController handles file uploads to Supabase Storage, enforcing authentication
 * and associating uploaded files with tasks.
 * All file endpoints should be protected by authentication and validate user access.
 */
class FileController {
  // PUBLIC_INTERFACE
  /**
   * @swagger
   * /tasks/{taskId}/attachments:
   *   post:
   *     summary: Upload a file and attach to a task
   *     description: Uploads a file to Supabase Storage, associates metadata (task_id, user_id) with the file, and returns public URL.
   *     tags: [Tasks]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: taskId
   *         required: true
   *         schema:
   *           type: integer
   *         description: Task ID to attach the file to
   *     requestBody:
   *       required: true
   *       content:
   *         multipart/form-data:
   *           schema:
   *             type: object
   *             properties:
   *               file:
   *                 type: string
   *                 format: binary
   *     responses:
   *       201:
   *         description: File uploaded and linked to task successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 file_url:
   *                   type: string
   *                 storage_object:
   *                   type: object
   *       400:
   *         description: No file uploaded or invalid input
   *       401:
   *         description: Authentication required
   *       403:
   *         description: Task not found, or not owned by user
   *       500:
   *         description: Storage or backend error
   */
  async uploadTaskAttachment(req, res) {
    try {
      const user = req.user;
      const { taskId } = req.params;
      // Ensure the task exists and belongs to user
      const { data: task, error: tError } = await supabase
        .from('tasks')
        .select('id,user_id')
        .eq('id', taskId)
        .eq('user_id', user.id)
        .single();
      if (tError || !task) {
        return res.status(403).json({ message: 'Task not found or not owned by user' });
      }

      if (!req.file) {
        return res
          .status(400)
          .json({ message: 'No file uploaded - expected form field named "file".' });
      }

      // Limit file types, sizes etc here if desired (basic: max 10MB)
      if (req.file.size > 10 * 1024 * 1024) {
        return res.status(400).json({ message: 'File size exceeds limit (10MB).' });
      }
      // Check filetype
      const supportedTypes = [
        'application/pdf',
        'image/jpeg',
        'image/png',
        'application/zip',
        'text/plain',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/msword'
      ];
      if (!supportedTypes.includes(req.file.mimetype)) {
        return res.status(400).json({ message: 'Unsupported file type.' });
      }

      // Construct a unique path for file in Supabase Storage
      const ext = path.extname(req.file.originalname) || mime.extension(req.file.mimetype) || '';
      const fileId = uuidv4();
      const storagePath = `task-attachments/${user.id}/${taskId}/${fileId}${ext ? '.' + ext.replace('.', '') : ''}`;

      // Upload to Supabase Storage (bucket: "attachments")
      const { data: fileUpload, error: uploadError } = await supabase.storage
        .from('attachments')
        .upload(storagePath, req.file.buffer, {
          contentType: req.file.mimetype,
          upsert: false,
        });
      if (uploadError) {
        return res.status(500).json({ message: 'Failed to upload file', detail: uploadError.message });
      }

      // Get public URL (optional - you may need to set bucket to public or sign URLs)
      const { data: pubUrl } = supabase
        .storage
        .from('attachments')
        .getPublicUrl(storagePath);

      // Optionally, store file metadata in a DB table (e.g., 'attachments')
      // Not implemented here for brevity

      return res.status(201).json({
        file_url: pubUrl ? pubUrl.publicUrl : null,
        storage_object: fileUpload
      });
    } catch (err) {
      console.error('File upload error:', err);
      res.status(500).json({ message: 'Internal server error', detail: err.message });
    }
  }
}

module.exports = new FileController();
