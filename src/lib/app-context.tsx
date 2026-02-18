'use client'

import { createContext, useContext, useState, ReactNode } from 'react'
import { mockUsers, type User, type Role } from '@/lib/mock-data'

interface AppContextType {
    currentUser: User
    setCurrentUser: (user: User) => void
    switchRole: (role: Role) => void
    sidebarOpen: boolean
    setSidebarOpen: (open: boolean) => void
    toggleSidebar: () => void
}

const AppContext = createContext<AppContextType | null>(null)

export function AppProvider({ children }: { children: ReactNode }) {
    const [currentUser, setCurrentUser] = useState<User>(mockUsers[0]) // Default: Gerencia
    const [sidebarOpen, setSidebarOpen] = useState(false)

    const switchRole = (role: Role) => {
        const user = mockUsers.find((u) => u.role === role)
        if (user) setCurrentUser(user)
    }

    const toggleSidebar = () => setSidebarOpen(!sidebarOpen)

    return (
        <AppContext.Provider value={{
            currentUser,
            setCurrentUser,
            switchRole,
            sidebarOpen,
            setSidebarOpen,
            toggleSidebar
        }}>
            {children}
        </AppContext.Provider>
    )
}

export function useApp() {
    const ctx = useContext(AppContext)
    if (!ctx) throw new Error('useApp must be used within AppProvider')
    return ctx
}
