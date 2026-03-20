require('dotenv').config({ path: 'Backend/.env' });
const cloudinary = require('cloudinary').v2;

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME || 'df2indfh0',
    api_key: process.env.CLOUDINARY_API_KEY || '955814165378295',
    api_secret: process.env.CLOUDINARY_API_SECRET || 'j5BeAw5tQH0LxUivLk23fyyCiI8'
});

async function run() {
    try {
        const html = "<h1>Hello World!</h1>";
        const result = await new Promise((resolve, reject) => {
            cloudinary.uploader.upload_stream(
                { folder: 'test', resource_type: 'raw', format: 'pdf' },
                (error, result) => {
                    if (error) reject(error);
                    else resolve(result);
                }
            ).end(Buffer.from(html));
        });
        console.log(result);
    } catch (e) {
        console.error(e);
    }
}
run();
