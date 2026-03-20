const { GoogleGenAI } = require("@google/genai")
const { z } = require("zod")
const { zodToJsonSchema } = require("zod-to-json-schema")
const { zodToJsonSchema } = require("zod-to-json-schema")

const ai = new GoogleGenAI({
    apiKey: process.env.GOOGLE_GENAI_API_KEY
})


const interviewReportSchema = z.object({
    matchScore: z.number().describe("A score between 0 and 100 indicating how well the candidate's profile matches the job describe"),
    technicalQuestions: z.array(z.object({
        question: z.string().describe("The technical question can be asked in the interview"),
        intention: z.string().describe("The intention of interviewer behind asking this question"),
        answer: z.string().describe("How to answer this question, what points to cover, what approach to take etc.")
    })).describe("Technical questions that can be asked in the interview along with their intention and how to answer them"),
    behavioralQuestions: z.array(z.object({
        question: z.string().describe("The technical question can be asked in the interview"),
        intention: z.string().describe("The intention of interviewer behind asking this question"),
        answer: z.string().describe("How to answer this question, what points to cover, what approach to take etc.")
    })).describe("Behavioral questions that can be asked in the interview along with their intention and how to answer them"),
    skillGaps: z.array(z.object({
        skill: z.string().describe("The skill which the candidate is lacking"),
        severity: z.enum([ "low", "medium", "high" ]).describe("The severity of this skill gap, i.e. how important is this skill for the job and how much it can impact the candidate's chances")
    })).describe("List of skill gaps in the candidate's profile along with their severity"),
    preparationPlan: z.array(z.object({
        day: z.number().describe("The day number in the preparation plan, starting from 1"),
        focus: z.string().describe("The main focus of this day in the preparation plan, e.g. data structures, system design, mock interviews etc."),
        tasks: z.array(z.string()).describe("List of tasks to be done on this day to follow the preparation plan, e.g. read a specific book or article, solve a set of problems, watch a video etc.")
    })).describe("A day-wise preparation plan for the candidate to follow in order to prepare for the interview effectively"),
    title: z.string().describe("The title of the job for which the interview report is generated"),
})

async function generateInterviewReport({ resume, selfDescription, jobDescription }) {


    const prompt = `Generate an interview report for a candidate with the following details:
                        Resume: ${resume}
                        Self Description: ${selfDescription}
                        Job Description: ${jobDescription}
`

    let response
    try {
        response = await ai.models.generateContent({
            model: "gemini-3-flash-preview",
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: zodToJsonSchema(interviewReportSchema),
            }
        })
    } catch (apiError) {
        console.error("AI API call failed:", apiError)
        console.error("AI API error details:", JSON.stringify(apiError, null, 2))
        throw new Error("AI service request failed. Please try again.")
    }

    if (!response) {
        console.error("AI service returned null/undefined response")
        throw new Error("AI service did not return any response")
    }

    // Log response structure for debugging
    console.log("AI response type:", typeof response)
    console.log("AI response keys:", Object.keys(response))
    
    // Handle different response structures
    let text = null
    
    // Try different ways to access the text
    if (typeof response.text === 'function') {
        // If text is a function, call it
        text = await response.text()
    } else if (typeof response.text === 'string') {
        // If text is a string property
        text = response.text
    } else if (response.response && typeof response.response.text === 'function') {
        // If response is wrapped and text is a function
        text = await response.response.text()
    } else if (response.response && typeof response.response.text === 'string') {
        // If response is wrapped and text is a string
        text = response.response.text
    } else if (response.candidates && response.candidates[0] && response.candidates[0].content) {
        // Google GenAI might return candidates array
        const content = response.candidates[0].content
        if (typeof content.parts !== 'undefined' && content.parts[0]) {
            text = content.parts[0].text || content.parts[0].text()
        }
    } else if (response[0] && typeof response[0].text === 'function') {
        // Response might be an array
        text = await response[0].text()
    } else if (response[0] && typeof response[0].text === 'string') {
        text = response[0].text
    }

    if (!text) {
        console.error("AI response structure:", JSON.stringify(response, null, 2))
        throw new Error("AI service returned response without text content")
    }

    // Convert to string and trim
    text = String(text).trim()
    if (!text || text.length === 0 || text === 'null' || text === 'undefined' || text === '{}' || text === '[]') {
        console.error("AI service returned invalid text:", text)
        throw new Error("AI service returned empty or invalid response")
    }

    try {
        const parsed = JSON.parse(text)
        if (!parsed || typeof parsed !== 'object') {
            throw new Error("Parsed response is not an object")
        }
        return parsed
    } catch (parseError) {
        console.error("Error parsing AI response:", parseError)
        console.error("Response text (first 500 chars):", text.substring(0, 500))
        // Don't expose the JSON.parse error message directly
        throw new Error("AI service returned invalid response format")
    }


}



async function generatePdfFromHtml(htmlContent) {
    const { uploadToCloudinary } = require('../config/cloudinary');
    const cloudinary = require('cloudinary').v2;
    const https = require('https');
    const http = require('http');

    try {
        console.log("Uploading HTML to Cloudinary to generate PDF...");
        const htmlBuffer = Buffer.from(htmlContent);
        // Upload HTML as a raw file
        const uploadOptions = {
            folder: 'temp-html',
            resource_type: 'raw',
            format: 'html'
        };
        
        const htmlUploadResult = await new Promise((resolve, reject) => {
            cloudinary.uploader.upload_stream(uploadOptions, (error, result) => {
                if (error) reject(error);
                else resolve(result);
            }).end(htmlBuffer);
        });

        const htmlUrl = htmlUploadResult.secure_url;
        console.log("HTML successfully uploaded to:", htmlUrl);

        // Make Cloudinary convert the HTML URL to a PDF using the URL2PNG add-on
        const pdfUrl = cloudinary.url(htmlUrl, {
            type: 'url2png',
            sign_url: true,
            format: 'pdf',
            crop: 'fill',
            width: 794, // A4 width at 96 DPI
            height: 1123 // A4 height at 96 DPI
        });

        console.log("Fetching generated PDF from:", pdfUrl);

        // Download the PDF into a buffer to be consistent with the expected return format
        const pdfBuffer = await new Promise((resolve, reject) => {
            const client = pdfUrl.startsWith('https') ? https : http;
            const req = client.get(pdfUrl, (res) => {
                if (res.statusCode !== 200 && res.statusCode !== 301 && res.statusCode !== 302) {
                    const error = new Error(`Cloudinary URL2PNG failed with status: ${res.statusCode}. Please ensure the URL2PNG add-on is enabled in your Cloudinary account.`);
                    error.statusCode = res.statusCode;
                    return reject(error);
                }

                if (res.statusCode === 301 || res.statusCode === 302) {
                     // Handle redirect just in case
                     const redirectUrl = res.headers.location;
                     const redirectClient = redirectUrl.startsWith('https') ? https : http;
                     redirectClient.get(redirectUrl, (redirectRes) => {
                         if (redirectRes.statusCode !== 200) {
                             return reject(new Error(`Cloudinary redirect failed with status: ${redirectRes.statusCode}`));
                         }
                         const chunks = [];
                         redirectRes.on('data', chunk => chunks.push(chunk));
                         redirectRes.on('end', () => resolve(Buffer.concat(chunks)));
                         redirectRes.on('error', reject);
                     }).on('error', reject);
                     return;
                }

                const chunks = [];
                res.on('data', chunk => chunks.push(chunk));
                res.on('end', () => resolve(Buffer.concat(chunks)));
            });
            req.on('error', reject);
        });

        return pdfBuffer;

    } catch (error) {
        console.error("Error generating PDF with Cloudinary:", error);
        throw error;
    }
}

async function generateResumePdf({ resume, selfDescription, jobDescription }) {
    try {
        const resumePdfSchema = z.object({
            html: z.string().describe("The HTML content of the resume which can be converted to PDF using any library like puppeteer")
        })

        const prompt = `Generate resume for a candidate with the following details:
                            Resume: ${resume || "Not provided"}
                            Self Description: ${selfDescription || "Not provided"}
                            Job Description: ${jobDescription}

                            the response should be a JSON object with a single field "html" which contains the HTML content of the resume which can be converted to PDF using any library like puppeteer.
                            The resume should be tailored for the given job description and should highlight the candidate's strengths and relevant experience. The HTML content should be well-formatted and structured, making it easy to read and visually appealing.
                            The content of resume should be not sound like it's generated by AI and should be as close as possible to a real human-written resume.
                            you can highlight the content using some colors or different font styles but the overall design should be simple and professional.
                            The content should be ATS friendly, i.e. it should be easily parsable by ATS systems without losing important information.
                            The resume should not be so lengthy, it should ideally be 1-2 pages long when converted to PDF. Focus on quality rather than quantity and make sure to include all the relevant information that can increase the candidate's chances of getting an interview call for the given job description.
                        `

        const response = await ai.models.generateContent({
            model: "gemini-3-flash-preview",
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: zodToJsonSchema(resumePdfSchema),
            }
        })

        if (!response) {
            throw new Error("AI service did not return any response")
        }

        // Log response structure for debugging
        console.log("AI response type (resume):", typeof response)
        console.log("AI response keys (resume):", Object.keys(response))
        
        // Handle different response structures
        let text = null
        
        // Try different ways to access the text
        if (typeof response.text === 'function') {
            text = await response.text()
        } else if (typeof response.text === 'string') {
            text = response.text
        } else if (response.response && typeof response.response.text === 'function') {
            text = await response.response.text()
        } else if (response.response && typeof response.response.text === 'string') {
            text = response.response.text
        } else if (response.candidates && response.candidates[0] && response.candidates[0].content) {
            const content = response.candidates[0].content
            if (typeof content.parts !== 'undefined' && content.parts[0]) {
                text = content.parts[0].text || (typeof content.parts[0].text === 'function' ? await content.parts[0].text() : null)
            }
        } else if (response[0] && typeof response[0].text === 'function') {
            text = await response[0].text()
        } else if (response[0] && typeof response[0].text === 'string') {
            text = response[0].text
        }

        if (!text) {
            console.error("AI response structure (resume):", JSON.stringify(response, null, 2))
            throw new Error("AI service returned response without text content")
        }

        // Convert to string and trim
        text = String(text).trim()
        
        // Validate text is not empty or null-like
        if (!text || text.length === 0 || text === 'null' || text === 'undefined' || text === '{}' || text === '[]') {
            console.error("AI service returned invalid text:", text)
            throw new Error("AI service returned empty or invalid response")
        }

        let jsonContent
        try {
            jsonContent = JSON.parse(text)
        } catch (parseError) {
            console.error("Error parsing AI response:", parseError)
            console.error("Response text (first 200 chars):", text.substring(0, 200))
            // Use a specific error message that won't match global handler conditions
            const error = new Error("AI service returned malformed JSON response")
            error.name = "AIResponseParseError"
            error.statusCode = 400
            throw error
        }

        if (!jsonContent) {
            console.error("Parsed JSON content is null or undefined")
            throw new Error("AI service returned empty JSON response")
        }
        
        if (!jsonContent.html) {
            console.error("JSON content missing html field:", Object.keys(jsonContent))
            throw new Error("AI service did not return HTML content in response")
        }
        
        if (typeof jsonContent.html !== 'string' || jsonContent.html.trim().length === 0) {
            console.error("HTML content is empty or not a string")
            throw new Error("AI service returned empty HTML content")
        }

        const pdfBuffer = await generatePdfFromHtml(jsonContent.html)

        if (!pdfBuffer || pdfBuffer.length === 0) {
            throw new Error("Failed to generate PDF buffer")
        }

        return pdfBuffer
    } catch (error) {
        console.error("Error in generateResumePdf:", error)
        throw error
    }
}

module.exports = { generateInterviewReport, generateResumePdf }