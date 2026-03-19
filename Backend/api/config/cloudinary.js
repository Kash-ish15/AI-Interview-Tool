const cloudinary = require('cloudinary').v2;
require('dotenv').config();

// Configure Cloudinary
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME || 'df2indfh0',
    api_key: process.env.CLOUDINARY_API_KEY || '955814165378295',
    api_secret: process.env.CLOUDINARY_API_SECRET || 'j5BeAw5tQH0LxUivLk23fyyCiI8'
});

/**
 * Upload file to Cloudinary
 * @param {Buffer} fileBuffer - File buffer to upload
 * @param {String} folder - Folder path in Cloudinary (optional)
 * @param {String} resourceType - Resource type: 'auto', 'image', 'video', 'raw' (default: 'auto')
 * @returns {Promise<Object>} Cloudinary upload result
 */
async function uploadToCloudinary(fileBuffer, folder = 'resumes', resourceType = 'auto') {
    return new Promise((resolve, reject) => {
        const uploadOptions = {
            folder: folder,
            resource_type: resourceType,
            use_filename: true,
            unique_filename: true,
            overwrite: false
        };

        cloudinary.uploader.upload_stream(
            uploadOptions,
            (error, result) => {
                if (error) {
                    console.error('Cloudinary upload error:', error);
                    reject(error);
                } else {
                    resolve(result);
                }
            }
        ).end(fileBuffer);
    });
}

/**
 * Delete file from Cloudinary
 * @param {String} publicId - Public ID of the file to delete
 * @param {String} resourceType - Resource type: 'image', 'video', 'raw' (default: 'auto')
 * @returns {Promise<Object>} Cloudinary deletion result
 */
async function deleteFromCloudinary(publicId, resourceType = 'auto') {
    try {
        const result = await cloudinary.uploader.destroy(publicId, {
            resource_type: resourceType
        });
        return result;
    } catch (error) {
        console.error('Cloudinary delete error:', error);
        throw error;
    }
}

/**
 * Get file URL from Cloudinary public ID
 * @param {String} publicId - Public ID of the file
 * @param {String} resourceType - Resource type
 * @returns {String} File URL
 */
function getCloudinaryUrl(publicId, resourceType = 'auto') {
    if (!publicId) return null;
    return cloudinary.url(publicId, {
        resource_type: resourceType,
        secure: true
    });
}

module.exports = {
    uploadToCloudinary,
    deleteFromCloudinary,
    getCloudinaryUrl,
    cloudinary
};
