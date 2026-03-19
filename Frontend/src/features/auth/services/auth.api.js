
import axios from "axios"

const api = axios.create({
    baseURL: import.meta.env.VITE_BACKEND_URL || "https://ai-interview-tool-one.vercel.app",
    withCredentials: true,
    headers: {
        'Content-Type': 'application/json',
    },
    timeout: 10000, // 10 seconds timeout
})

// Request interceptor
api.interceptors.request.use(
    (config) => {
        return config
    },
    (error) => {
        return Promise.reject(error)
    }
)

// Response interceptor for better error handling
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response) {
            // Server responded with error status
            console.error("API Error:", error.response.status, error.response.data)
        } else if (error.request) {
            // Request made but no response received
            console.error("Network Error:", error.request)
        } else {
            // Something else happened
            console.error("Error:", error.message)
        }
        return Promise.reject(error)
    }
)

export async function register({ username, email, password }) {

    try {
        const response = await api.post('/api/auth/register', {
            username, email, password
        })

        return response.data

    } catch (err) {

        console.log(err)

    }

}

export async function login({ email, password }) {

    try {

        const response = await api.post("/api/auth/login", {
            email, password
        })

        return response.data

    } catch (err) {
        console.log(err)
    }

}

export async function logout() {
    try {

        const response = await api.get("/api/auth/logout")

        return response.data

    } catch (err) {

    }
}

export async function getMe() {

    try {

        const response = await api.get("/api/auth/get-me")

        return response.data

    } catch (err) {
        console.log(err)
    }

}