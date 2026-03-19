const multer = require("multer")


const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB (matching frontend limit)
    },
    fileFilter: (req, file, cb) => {
        // Accept only PDF and DOCX files
        const allowedMimes = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
        if (allowedMimes.includes(file.mimetype)) {
            cb(null, true)
        } else {
            cb(new Error('Only PDF and DOCX files are allowed'), false)
        }
    }
})


module.exports = upload