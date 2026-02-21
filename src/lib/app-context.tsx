'use client'

import { createContext, useContext, useMemo, useState, ReactNode } from 'react'
import { useSession } from 'next-auth/react'
import type { Role } from '@prisma/client'

export interface AppUser {
    id: string
    name: string
    email: string
    role: Role
}

interface AppContextType {
    currentUser: AppUser | null
    sessionLoading: boolean
    sidebarOpen: boolean
    setSidebarOpen: (open: boolean) => void
    toggleSidebar: () => void
}

const AppContext = createContext<AppContextType | null>(null)

export function AppProvider({
    children,
    initialUser = null
}: {
    children: ReactNode
    initialUser?: AppUser | null
}) {
    const { data: session, status } = useSession()
    const [sidebarOpen, setSidebarOpen] = useState(false)
    const sessionLoading = status === 'loading' && !initialUser
    const toggleSidebar = () => setSidebarOpen(!sidebarOpen)

    const sessionUser = useMemo<AppUser | null>(() => {
        if (!session?.user?.id || !session?.user?.role || !session.user.email) return null
        return {
            id: session.user.id,
            name: session.user.name || session.user.email,
            email: session.user.email,
            role: session.user.role as Role
        }
    }, [session])
    const currentUser = sessionUser ?? initialUser

    return (
        <AppContext.Provider value={{
            currentUser,
            sessionLoading,
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
