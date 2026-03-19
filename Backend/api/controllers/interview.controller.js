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
            interViewReportByAi = await generateInterviewReport({
                resume: resumeText,
                selfDescription: selfDescription || "",
                jobDescription
            })
        } catch (err) {
            return res.status(502).json({
                message: "AI service failed. Please try again."
            })
        }
        // Save to database
        const interviewReport = await interviewReportModel.create({
            user: req.user.id,
            resume: resumeText,
            resumeFileUrl: resumeFileUrl,
            resumeFilePublicId: resumeFilePublicId,
            selfDescription: selfDescription || "",
            jobDescription,
            ...interViewReportByAi
        })

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

        // Check if PDF already exists in Cloudinary
        if (interviewReport.generatedResumePdfUrl) {
            console.log("Resume PDF already exists, redirecting to Cloudinary URL")
            // Redirect to Cloudinary URL for direct download
            return res.redirect(interviewReport.generatedResumePdfUrl)
        }

        // Generate PDF with timeout handling
        console.log("Starting PDF generation for interview report:", interviewReportId)

        const pdfBuffer = await Promise.race([
            generateResumePdf({
                resume: resume || "",
                jobDescription,
                selfDescription: selfDescription || ""
            }),
            new Promise((_, reject) =>
                setTimeout(() => reject(new Error("PDF generation timeout after 50 seconds")), 50000)
            )
        ])

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
        console.error("Error in generateResumePdfController:", error)
        console.error("Error stack:", error.stack)

        // More specific error messages
        let statusCode = 500
        let message = "Internal server error"

        // Check for specific error types and provide helpful messages
        if (error.message && error.message.includes("timeout")) {
            statusCode = 504
            message = "PDF generation timed out. This may take longer than expected. Please try again."
        } else if (error.message && error.message.includes("Puppeteer") || error.message.includes("browser")) {
            message = "PDF generation service is temporarily unavailable. Please try again in a few moments."
        } else if (error.message && (error.message.includes("JSON") || error.message.includes("parse") || error.message.includes("invalid response format"))) {
            // AI service response parsing errors
            message = "Unable to generate resume PDF. The AI service returned an unexpected response. Please try regenerating your interview report."
        } else if (error.message && error.message.includes("AI service")) {
            // AI service errors
            if (error.message.includes("did not return")) {
                message = "AI service is not responding. Please try again in a few moments."
            } else if (error.message.includes("empty or invalid")) {
                message = "AI service returned incomplete data. Please try regenerating your interview report."
            } else {
                message = "AI service error occurred. Please try again later."
            }
        } else if (error.message && error.message.includes("HTML content")) {
            message = "Resume content could not be generated. Please try regenerating your interview report."
        } else if (error.message && error.message.includes("PDF buffer")) {
            message = "Failed to create PDF file. Please try again."
        }

        // Don't expose internal error messages in production
        const errorResponse = {
            message: message
        }

        // Only include detailed error in development
        if (process.env.NODE_ENV === "development") {
            errorResponse.error = error.message
            errorResponse.stack = error.stack
        }

        res.status(statusCode).json(errorResponse)
    }
}

module.exports = { generateInterViewReportController, getInterviewReportByIdController, getAllInterviewReportsController, generateResumePdfController }