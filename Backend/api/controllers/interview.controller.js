const pdfParse = require("pdf-parse")
const { generateInterviewReport, generateResumePdf } = require("../services/ai.service")
const interviewReportModel = require("../models/interviewReport.model")




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
        
        // Parse PDF if file is uploaded
        if (req.file) {
            // Check if file is PDF (pdf-parse only supports PDF)
            if (req.file.mimetype !== 'application/pdf') {
                return res.status(400).json({
                    message: "Only PDF files are supported for resume upload. Please convert your DOCX file to PDF."
                })
            }
            
            try {
                const pdfData = await pdfParse(req.file.buffer)
                resumeText = pdfData.text || ""
                
                if (!resumeText || resumeText.trim().length === 0) {
                    return res.status(400).json({
                        message: "The PDF file appears to be empty or could not be read. Please ensure it contains text."
                    })
                }
            } catch (pdfError) {
                console.error("Error parsing PDF:", pdfError)
                return res.status(400).json({
                    message: "Failed to parse PDF file. Please ensure it's a valid PDF with readable text."
                })
            }
        }

        // Generate interview report using AI
        const interViewReportByAi = await generateInterviewReport({
            resume: resumeText,
            selfDescription: selfDescription || "",
            jobDescription
        })

        // Save to database
        const interviewReport = await interviewReportModel.create({
            user: req.user.id,
            resume: resumeText,
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

        // Validate required fields
        if (!jobDescription || jobDescription.trim().length === 0) {
            console.error("Job description is missing from interview report")
            return res.status(400).json({
                message: "Job description is missing from the interview report. Please regenerate the interview report with a job description."
            })
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

        res.set({
            "Content-Type": "application/pdf",
            "Content-Disposition": `attachment; filename=resume_${interviewReportId}.pdf`,
            "Content-Length": pdfBuffer.length
        })

        res.send(pdfBuffer)
    } catch (error) {
        console.error("Error in generateResumePdfController:", error)
        console.error("Error stack:", error.stack)
        
        // More specific error messages
        let statusCode = 500
        let message = "Internal server error"
        
        if (error.message && error.message.includes("timeout")) {
            statusCode = 504
            message = "PDF generation timed out. Please try again."
        } else if (error.message && error.message.includes("Puppeteer")) {
            message = "PDF generation service unavailable. Please try again later."
        }
        
        res.status(statusCode).json({
            message: message,
            error: process.env.NODE_ENV === "development" ? error.message : undefined
        })
    }
}

module.exports = { generateInterViewReportController, getInterviewReportByIdController, getAllInterviewReportsController, generateResumePdfController }