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
            return
        }

        setLoading(true)
        try {
            const response = await generateResumePdf({ interviewReportId })
            
            if (!response) {
                throw new Error("No response received from server")
            }

            // Create blob and download
            const blob = new Blob([response], { type: "application/pdf" })
            const url = window.URL.createObjectURL(blob)
            const link = document.createElement("a")
            link.href = url
            link.setAttribute("download", `resume_${interviewReportId}.pdf`)
            document.body.appendChild(link)
            link.click()
            
            // Cleanup
            document.body.removeChild(link)
            window.URL.revokeObjectURL(url)
        } catch (error) {
            console.error("Error downloading resume PDF:", error)
            alert("Failed to download resume. Please try again.")
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