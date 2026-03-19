const pdfParse = require("pdf-parse")
const { generateInterviewReport, generateResumePdf } = require("../services/ai.service")
const interviewReportModel = require("../models/interviewReport.model")
const { uploadToCloudinary, deleteFromCloudinary } = require("../config/cloudinary")




/**
 * @description Controller to generate interview report based on user self description, resume and job description.
 */
async function generateInterViewReportController(req, res) {
    try {
        const { selfDescription, jobDescription } = req.body

        // Validate job description is provided
        if (!jobDescription || jobDescription.trim().length === 0) {
            return res.status(400).json({
                message: "Job description is required"
            })
        }

        // Validate that either resume or selfDescription is provided
        if (!req.file && (!selfDescription || selfDescription.trim().length === 0)) {
            return res.status(400).json({
                message: "Either a resume file or self description is required"
            })
        }

        let resumeText = ""
        let resumeFileUrl = null
        let resumeFilePublicId = null

        // Parse PDF and upload to Cloudinary if file is uploaded
        if (req.file) {
            // Check if file is PDF (pdf-parse only supports PDF)
            if (req.file.mimetype !== 'application/pdf') {
                return res.status(400).json({
                    message: "Only PDF files are supported for resume upload. Please convert your DOCX file to PDF."
                })
            }

            try {
                // Parse PDF to extract text
                const pdfData = await pdfParse(req.file.buffer)
                resumeText = pdfData.text || ""

                if (!resumeText || resumeText.trim().length === 0) {
                    return res.status(400).json({
                        message: "The PDF file appears to be empty or could not be read. Please ensure it contains text."
                    })
                }

                // Upload to Cloudinary for storage
                try {
                    const cloudinaryResult = await uploadToCloudinary(
                        req.file.buffer,
                        'resumes',
                        'raw' // PDF files as raw type
                    )
                    resumeFileUrl = cloudinaryResult.secure_url
                    resumeFilePublicId = cloudinaryResult.public_id
                    console.log("File uploaded to Cloudinary:", resumeFileUrl)
                } catch (cloudinaryError) {
                    console.error("Cloudinary upload error:", cloudinaryError)
                    // Continue without Cloudinary URL if upload fails (non-critical)
                    // The resume text is already extracted
                }
            } catch (pdfError) {
                console.error("Error parsing PDF:", pdfError)
                return res.status(400).json({
                    message: "Failed to parse PDF file. Please ensure it's a valid PDF with readable text."
                })
            }
        }

        // Generate interview report using AI
        let interViewReportByAi;
        try {
            console.log("Starting AI interview report generation...")
            interViewReportByAi = await generateInterviewReport({
                resume: resumeText,
                selfDescription: selfDescription || "",
                jobDescription
            })
            console.log("AI interview report generated successfully")
        } catch (err) {
            console.error("Error generating interview report:", err)
            console.error("Error message:", err.message)
            console.error("Error stack:", err.stack)
            
            // Provide more specific error messages
            let errorMessage = "AI service failed. Please try again."
            if (err.message && err.message.includes("invalid response format")) {
                errorMessage = "AI service returned an invalid response. Please try regenerating your interview report."
            } else if (err.message && err.message.includes("empty or invalid")) {
                errorMessage = "AI service returned an empty response. Please try again."
            } else if (err.message && err.message.includes("timeout")) {
                errorMessage = "AI service request timed out. Please try again."
            }
            
            return res.status(502).json({
                message: errorMessage
            })
        }
        // Save to database
        let interviewReport
        try {
            console.log("Saving interview report to database...")
            interviewReport = await interviewReportModel.create({
                user: req.user.id,
                resume: resumeText,
                resumeFileUrl: resumeFileUrl,
                resumeFilePublicId: resumeFilePublicId,
                selfDescription: selfDescription || "",
                jobDescription,
                ...interViewReportByAi
            })
            console.log("Interview report saved successfully, ID:", interviewReport._id)
        } catch (dbError) {
            console.error("Error saving interview report to database:", dbError)
            console.error("Database error details:", JSON.stringify(dbError, null, 2))
            return res.status(500).json({
                message: "Failed to save interview report. Please try again."
            })
        }

        res.status(201).json({
            message: "Interview report generated successfully.",
            interviewReport
        })
    } catch (error) {
        console.error("Error in generateInterViewReportController:", error)
        res.status(500).json({
            message: "Internal server error",
            error: process.env.NODE_ENV === "development" ? error.message : undefined
        })
    }
}

/**
 * @description Controller to get interview report by interviewId.
 */
async function getInterviewReportByIdController(req, res) {
    try {
        const { interviewId } = req.params

        const interviewReport = await interviewReportModel.findOne({ _id: interviewId, user: req.user.id })

        if (!interviewReport) {
            return res.status(404).json({
                message: "Interview report not found."
            })
        }

        res.status(200).json({
            message: "Interview report fetched successfully.",
            interviewReport
        })
    } catch (error) {
        console.error("Error in getInterviewReportByIdController:", error)
        res.status(500).json({
            message: "Internal server error"
        })
    }
}


/** 
 * @description Controller to get all interview reports of logged in user.
 */
async function getAllInterviewReportsController(req, res) {
    try {
        const interviewReports = await interviewReportModel.find({ user: req.user.id })
            .sort({ createdAt: -1 })
            .select("-resume -selfDescription -jobDescription -__v -technicalQuestions -behavioralQuestions -skillGaps -preparationPlan")

        res.status(200).json({
            message: "Interview reports fetched successfully.",
            interviewReports
        })
    } catch (error) {
        console.error("Error in getAllInterviewReportsController:", error)
        res.status(500).json({
            message: "Internal server error"
        })
    }
}


/**
 * @description Controller to generate resume PDF based on user self description, resume and job description.
 */
async function generateResumePdfController(req, res) {
    try {
        const { interviewReportId } = req.params

        console.log("PDF generation request - interviewReportId:", interviewReportId)
        console.log("PDF generation request - user ID:", req.user?.id)

        // Validate interviewReportId
        if (!interviewReportId || interviewReportId.trim().length === 0) {
            console.error("Missing interviewReportId in request")
            return res.status(400).json({
                message: "Interview report ID is required"
            })
        }

        // Validate MongoDB ObjectId format
        const mongoose = require("mongoose")
        if (!mongoose.Types.ObjectId.isValid(interviewReportId)) {
            console.error("Invalid interviewReportId format:", interviewReportId)
            return res.status(400).json({
                message: "Invalid interview report ID format"
            })
        }

        const interviewReport = await interviewReportModel.findById(interviewReportId)

        console.log("Found interview report:", interviewReport ? "Yes" : "No")

        if (!interviewReport) {
            return res.status(404).json({
                message: "Interview report not found."
            })
        }

        // Check if user owns this report
        if (interviewReport.user.toString() !== req.user.id) {
            return res.status(403).json({
                message: "You don't have permission to access this report."
            })
        }

        const { resume, jobDescription, selfDescription } = interviewReport

        console.log("Interview report data - has resume:", !!resume, "has jobDescription:", !!jobDescription, "has selfDescription:", !!selfDescription)

        // Validate required fields - handle null/undefined safely
        if (!jobDescription || (typeof jobDescription === 'string' && jobDescription.trim().length === 0)) {
            console.error("Job description is missing from interview report")
            return res.status(400).json({
                message: "Job description is missing from the interview report. Please regenerate the interview report with a job description."
            })
        }

        // Check if PDF already exists in Cloudinary - fetch and return it
        if (interviewReport.generatedResumePdfUrl) {
            console.log("Resume PDF already exists in Cloudinary, fetching:", interviewReport.generatedResumePdfUrl)
            try {
                // Fetch PDF from Cloudinary using https module
                const https = require('https')
                const http = require('http')
                const url = require('url')
                
                const pdfBuffer = await new Promise((resolve, reject) => {
                    const parsedUrl = new URL(interviewReport.generatedResumePdfUrl)
                    const client = parsedUrl.protocol === 'https:' ? https : http
                    
                    client.get(interviewReport.generatedResumePdfUrl, (response) => {
                        if (response.statusCode !== 200) {
                            reject(new Error(`Failed to fetch PDF: ${response.statusCode}`))
                            return
                        }
                        
                        const chunks = []
                        response.on('data', (chunk) => chunks.push(chunk))
                        response.on('end', () => {
                            resolve(Buffer.concat(chunks))
                        })
                        response.on('error', reject)
                    }).on('error', reject)
                })
                
                console.log("PDF fetched from Cloudinary, size:", pdfBuffer.length)
                
                res.set({
                    "Content-Type": "application/pdf",
                    "Content-Disposition": `attachment; filename=resume_${interviewReportId}.pdf`,
                    "Content-Length": pdfBuffer.length,
                    "Cache-Control": "no-store"
                })
                
                return res.send(pdfBuffer)
            } catch (fetchError) {
                console.error("Error fetching PDF from Cloudinary, will generate new one:", fetchError)
                // Fall through to generate new PDF
            }
        }

        // Generate PDF with timeout handling
        console.log("Starting PDF generation for interview report:", interviewReportId)

        let pdfBuffer
        try {
            pdfBuffer = await Promise.race([
                generateResumePdf({
                    resume: resume || "",
                    jobDescription,
                    selfDescription: selfDescription || ""
                }),
                new Promise((_, reject) =>
                    setTimeout(() => reject(new Error("PDF generation timeout after 50 seconds")), 50000)
                )
            ])
        } catch (pdfGenError) {
            console.error("Error during PDF generation:", pdfGenError)
            // Re-throw to be caught by outer catch block
            throw pdfGenError
        }

        if (!pdfBuffer || pdfBuffer.length === 0) {
            console.error("PDF buffer is empty")
            return res.status(500).json({
                message: "Failed to generate PDF - empty buffer"
            })
        }

        console.log("PDF generated successfully, size:", pdfBuffer.length)

        // Upload generated PDF to Cloudinary for future use
        let pdfUrl = null
        let pdfPublicId = null
        try {
            const cloudinaryResult = await uploadToCloudinary(
                pdfBuffer,
                'generated-resumes',
                'raw' // PDF as raw type
            )
            pdfUrl = cloudinaryResult.secure_url
            pdfPublicId = cloudinaryResult.public_id
            
            // Update interview report with PDF URL
            await interviewReportModel.findByIdAndUpdate(interviewReportId, {
                generatedResumePdfUrl: pdfUrl,
                generatedResumePdfPublicId: pdfPublicId
            })
            
            console.log("PDF uploaded to Cloudinary:", pdfUrl)
        } catch (cloudinaryError) {
            console.error("Failed to upload PDF to Cloudinary:", cloudinaryError)
            // Continue even if Cloudinary upload fails - we'll still send the PDF
        }

        res.set({
            "Content-Type": "application/pdf",
            "Content-Disposition": `attachment; filename=resume_${interviewReportId}.pdf`,
            "Content-Length": pdfBuffer.length,
            "Cache-Control": "no-store"
        })

        res.send(pdfBuffer)
    } catch (error) {
        // Ensure error is properly logged
        console.error("Error in generateResumePdfController:", error)
        console.error("Error stack:", error.stack)
        console.error("Error message:", error.message)
        console.error("Error name:", error.name)
        console.error("Error statusCode:", error.statusCode)
        
        // Prevent error from escaping to global handler
        if (res.headersSent) {
            console.error("Response already sent, cannot send error response")
            return
        }

        // More specific error messages
        let statusCode = 500
        let message = "Internal server error"

        // Check for specific error types and provide helpful messages
        // Check for statusCode from service layer first
        if (error.statusCode) {
            statusCode = error.statusCode
        }
        
        if (error.name === "AIResponseParseError" || (error.message && error.message.includes("malformed JSON"))) {
            // AI service response parsing errors
            statusCode = 400
            message = "Unable to generate resume PDF. The AI service returned an unexpected response. Please try regenerating your interview report."
        } else if (error.message && error.message.includes("timeout")) {
            statusCode = 504
            message = "PDF generation timed out. This may take longer than expected. Please try again."
        } else if (error.message && (error.message.includes("Puppeteer") || error.message.includes("browser"))) {
            statusCode = 503
            message = "PDF generation service is temporarily unavailable. Please try again in a few moments."
        } else if (error.message && (error.message.includes("JSON") || error.message.includes("parse") || error.message.includes("invalid response format") || error.message.includes("invalid response"))) {
            // AI service response parsing errors (fallback)
            statusCode = 400
            message = "Unable to generate resume PDF. The AI service returned an unexpected response. Please try regenerating your interview report."
        } else if (error.message && error.message.includes("AI service")) {
            // AI service errors
            statusCode = 503
            if (error.message.includes("did not return")) {
                message = "AI service is not responding. Please try again in a few moments."
            } else if (error.message.includes("empty or invalid")) {
                message = "AI service returned incomplete data. Please try regenerating your interview report."
            } else {
                message = "AI service error occurred. Please try again later."
            }
        } else if (error.message && error.message.includes("HTML content")) {
            statusCode = 400
            message = "Resume content could not be generated. Please try regenerating your interview report."
        } else if (error.message && error.message.includes("PDF buffer")) {
            statusCode = 500
            message = "Failed to create PDF file. Please try again."
        }

        // Don't expose internal error messages in production
        const errorResponse = {
            message: message
        }

        // Only include detailed error in development
        if (process.env.NODE_ENV === "development") {
            errorResponse.error = {
                message: error.message,
                stack: error.stack,
                name: error.name
            }
        }

        // Ensure we always send a response and prevent double response
        if (!res.headersSent) {
            return res.status(statusCode).json(errorResponse)
        } else {
            // If headers already sent, log the error but don't try to send response
            console.error("Cannot send error response - headers already sent")
        }
    }
}

module.exports = { generateInterViewReportController, getInterviewReportByIdController, getAllInterviewReportsController, generateResumePdfController }