const multer = require('multer');
const storage = multer.memoryStorage(); // buffer for GridFS
const upload = multer({ storage });

module.exports = upload;
