import multer from 'multer';

const storage = multer.memoryStorage();

const ALLOWED_IMAGE_MIME = new Set([
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/webp',
    'image/heic',
    'image/heif'
]);

const imageFileFilter = (req, file, cb) => {
    if (!file) {
        return cb(null, true);
    }
    const mime = String(file.mimetype || '').toLowerCase();
    if (ALLOWED_IMAGE_MIME.has(mime)) {
        return cb(null, true);
    }
    return cb(new Error('Only image files are allowed (jpg, png, webp, heic)'));
};

export const upload = multer({
    storage,
    limits: {
        fileSize: 5 * 1024 * 1024
    },
    fileFilter: imageFileFilter
});
