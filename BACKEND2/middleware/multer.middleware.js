const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Destructure commonly used functions for convenience
const { diskStorage } = multer;
const { join, extname } = path;
const { existsSync, mkdirSync } = fs;

// Define the storage configuration
const storage = (destination) => 
    diskStorage({
        destination: (req, file, cb) => {
            const directoryPath = join(__dirname, 'DB', 'Images', destination);

            // Create directory if it does not exist
            if (!existsSync(directoryPath)) {
                mkdirSync(directoryPath, { recursive: true });
            }

            cb(null, directoryPath);
        },
        filename: (req, file, cb) => {
            cb(null, Date.now() + extname(file.originalname));
        },
    });

// Define the file filter function
const fileFilter = (req, file, cb) => {
    const allowedFileTypes = /jpeg|jpg|png|gif/;
    const isFileTypeValid = allowedFileTypes.test(extname(file.originalname).toLowerCase());
    const isMimeTypeValid = allowedFileTypes.test(file.mimetype);

    if (isFileTypeValid && isMimeTypeValid) {
        cb(null, true);
    } else {
        cb(new Error('Invalid file type. Only images are allowed.'));
    }
};

// Configure multer
const upload = multer({
    storage: storage('CustomerImages'),
    fileFilter: fileFilter,
    limits: { fileSize: 5 * 1024 * 1024 }, 
}).single('image');

module.exports = upload;

