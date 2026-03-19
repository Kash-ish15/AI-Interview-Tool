import { getAllInterviewReports, generateInterviewReport, getInterviewReportById, generateResumePdf } from "../services/interview.api"
import { useContext, useEffect } from "react"
import { InterviewContext } from "../interview.context"
import { useParams } from "react-router"


export const useInterview = () => {

    const context = useContext(InterviewContext)
    const { interviewId } = useParams()

    if (!context) {
        throw new Error("useInterview must be used within an InterviewProvider")
    }

    const { loading, setLoading, report, setReport, reports, setReports } = context

    const generateReport = async ({ jobDescription, selfDescription, resumeFile }) => {
        setLoading(true)
        let response = null
        try {
            response = await generateInterviewReport({ jobDescription, selfDescription, resumeFile })
            if (response && response.interviewReport) {
                setReport(response.interviewReport)
                return response.interviewReport
            }
        } catch (error) {
            console.error("Error generating report:", error)
        } finally {
            setLoading(false)
        }

        return null
    }

    const getReportById = async (interviewId) => {
        setLoading(true)
        let response = null
        try {
            response = await getInterviewReportById(interviewId)
            if (response && response.interviewReport) {
                setReport(response.interviewReport)
                return response.interviewReport
            }
        } catch (error) {
            console.error("Error getting report:", error)
        } finally {
            setLoading(false)
        }
        return null
    }

    const getReports = async () => {
        setLoading(true)
        let response = null
        try {
            response = await getAllInterviewReports()
            if (response && response.interviewReports) {
                setReports(response.interviewReports)
                return response.interviewReports
            }
            return []
        } catch (error) {
            console.error("Error getting reports:", error)
            setReports([])
        } finally {
            setLoading(false)
        }

        return []
    }

    const getResumePdf = async (interviewReportId) => {
        if (!interviewReportId) {
            console.error("Interview report ID is required")
            alert("Interview report ID is missing")
            return
        }

        // Validate that the current report has required fields before attempting download
        if (report && (!report.jobDescription || (typeof report.jobDescription === 'string' && report.jobDescription.trim().length === 0))) {
            alert("This interview report is missing a job description. Please regenerate the interview report with a job description to download the resume PDF.")
            return
        }

        console.log("Downloading resume for interview report ID:", interviewReportId)
        setLoading(true)
        try {
            const response = await generateResumePdf({ interviewReportId })
            
            if (!response) {
                throw new Error("No response received from server")
            }

            // Check if response is actually a blob/PDF
            if (response instanceof Blob) {
                const url = window.URL.createObjectURL(response)
                const link = document.createElement("a")
                link.href = url
                link.setAttribute("download", `resume_${interviewReportId}.pdf`)
                document.body.appendChild(link)
                link.click()
                
                // Cleanup
                setTimeout(() => {
                    document.body.removeChild(link)
                    window.URL.revokeObjectURL(url)
                }, 100)
            } else if (response instanceof ArrayBuffer || response instanceof Uint8Array) {
                // Handle ArrayBuffer or Uint8Array
                const blob = new Blob([response], { type: "application/pdf" })
                const url = window.URL.createObjectURL(blob)
                const link = document.createElement("a")
                link.href = url
                link.setAttribute("download", `resume_${interviewReportId}.pdf`)
                document.body.appendChild(link)
                link.click()
                
                // Cleanup
                setTimeout(() => {
                    document.body.removeChild(link)
                    window.URL.revokeObjectURL(url)
                }, 100)
            } else {
                throw new Error("Invalid response format")
            }
        } catch (error) {
            console.error("Error downloading resume PDF:", error)
            console.error("Error details:", {
                status: error.response?.status,
                statusText: error.response?.statusText,
                data: error.response?.data,
                message: error.message
            })
            
            // More specific error messages
            let errorMessage = "Failed to download resume. Please try again."
            
            if (error.response) {
                const status = error.response.status
                const responseData = error.response.data
                
                // Handle 400 Bad Request with specific messages
                if (status === 400) {
                    if (responseData && responseData.message) {
                        errorMessage = responseData.message
                    } else {
                        errorMessage = "Invalid request. The interview report may be missing required information. Please regenerate the interview report with all required fields."
                    }
                } else if (status === 404) {
                    errorMessage = "Interview report not found. Please refresh the page and try again."
                } else if (status === 403) {
                    errorMessage = "You don't have permission to download this resume."
                } else if (status === 500) {
                    errorMessage = "Server error while generating PDF. This may take longer than expected. Please try again in a moment."
                } else if (status === 504) {
                    errorMessage = "PDF generation timed out. This may take longer than expected. Please try again."
                } else if (responseData && responseData.message) {
                    errorMessage = responseData.message
                }
            } else if (error.code === 'ECONNABORTED') {
                errorMessage = "Request timed out. PDF generation is taking longer than expected. Please try again."
            } else if (error.request && !error.response) {
                errorMessage = "Network error. Please check your internet connection and try again."
            }
            
            alert(errorMessage)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        if (interviewId) {
            getReportById(interviewId)
        } else {
            getReports()
        }
    }, [ interviewId ])

    return { loading, report, reports, generateReport, getReportById, getReports, getResumePdf }

}