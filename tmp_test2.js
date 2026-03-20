require('dotenv').config({ path: 'Backend/.env' });
const cloudinary = require('cloudinary').v2;
const http = require('http');
const https = require('https');

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME || 'df2indfh0',
    api_key: process.env.CLOUDINARY_API_KEY || '955814165378295',
    api_secret: process.env.CLOUDINARY_API_SECRET || 'j5BeAw5tQH0LxUivLk23fyyCiI8'
});

async function run() {
    try {
        const html = "<html><body><h1>Hello World from HTML!</h1></body></html>";
        
        // 1. Upload HTML
        console.log("Uploading HTML...");
        const htmlUploadResult = await new Promise((resolve, reject) => {
            cloudinary.uploader.upload_stream(
                { folder: 'test', resource_type: 'raw', format: 'html' },
                (error, result) => {
                    if (error) reject(error);
                    else resolve(result);
                }
            ).end(Buffer.from(html));
        });
        
        const htmlUrl = htmlUploadResult.secure_url;
        console.log("HTML URL:", htmlUrl);
        
        // 2. Generate Cloudinary URL for url2png as PDF
        // See https://cloudinary.com/documentation/url2png_website_screenshots_addon
        const pdfUrl = cloudinary.url(htmlUrl, {
            type: "url2png",
            sign_url: true,
            format: "pdf"
        });
        console.log("PDF URL:", pdfUrl);
        
        // 3. Try to fetch the PDF to see if URL2PNG is active
        console.log("Fetching PDF...");
        const client = pdfUrl.startsWith('https') ? https : http;
        
        await new Promise((resolve, reject) => {
            const req = client.get(pdfUrl, (res) => {
                let data = [];
                res.on('data', chunk => data.push(chunk));
                res.on('end', () => {
                    if (res.statusCode === 200) {
                        console.log("Successfully generated PDF! Size:", Buffer.concat(data).length);
                        resolve();
                    } else {
                        console.log("Failed to generate PDF. Status:", res.statusCode);
                        console.log("Response:", Buffer.concat(data).toString());
                        reject(new Error(`Failed with status ${res.statusCode}`));
                    }
                });
            });
            req.on('error', reject);
        });
        
    } catch (e) {
        console.error("Error:", e.message);
    }
}
run();
