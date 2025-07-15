const multer = require('multer');

// Store files in memory (buffer, not disk)
const storage = multer.memoryStorage();
const upload = multer({ storage });

// Exports a middleware for single file (field: "file")
module.exports = upload.single('file');
