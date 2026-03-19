import { useContext, useEffect, useRef } from "react";
import { AuthContext } from "../auth.context";
import { login, register, logout, getMe } from "../services/auth.api";



export const useAuth = () => {

    const context = useContext(AuthContext)
    const { user, setUser, loading, setLoading } = context
    const isInitialMount = useRef(true)

    const handleLogin = async ({ email, password }) => {
        if (loading) return; // Prevent duplicate calls
        setLoading(true)
        try {
            const data = await login({ email, password })
            if (data && data.user) {
                setUser(data.user)
                return { success: true, data }
            }
            return { success: false }
        } catch (err) {
            console.error("Login error:", err)
            return { success: false, error: err }
        } finally {
            setLoading(false)
        }
    }

    const handleRegister = async ({ username, email, password }) => {
        setLoading(true)
        try {
            const data = await register({ username, email, password })
            setUser(data.user)
        } catch (err) {

        } finally {
            setLoading(false)
        }
    }

    const handleLogout = async () => {
        setLoading(true)
        try {
            const data = await logout()
            setUser(null)
        } catch (err) {

        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        // Prevent double execution in StrictMode
        if (isInitialMount.current) {
            isInitialMount.current = false;
            
            const getAndSetUser = async () => {
                try {
                    const data = await getMe()
                    if (data && data.user) {
                        setUser(data.user)
                    }
                } catch (err) {
                    // User not logged in, which is fine
                    setUser(null)
                } finally {
                    setLoading(false)
                }
            }

            getAndSetUser()
        }
    }, [setUser, setLoading])

    return { user, loading, handleRegister, handleLogin, handleLogout }
}