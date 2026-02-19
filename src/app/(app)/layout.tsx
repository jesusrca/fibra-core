'use client'

import dynamic from 'next/dynamic'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Sidebar } from '@/components/layout/Sidebar'
import { Header } from '@/components/layout/Header'
import { useApp } from '@/lib/app-context'

const ChatWidget = dynamic(
    () => import('@/components/chat-widget').then((m) => m.ChatWidget),
    { ssr: false }
)

export default function AppLayout({ children }: { children: React.ReactNode }) {
    const { currentUser, sessionLoading } = useApp()
    const router = useRouter()
    const [chatEnabled, setChatEnabled] = useState(false)

    useEffect(() => {
        const id = window.setTimeout(() => setChatEnabled(true), 1200)
        return () => window.clearTimeout(id)
    }, [])

    useEffect(() => {
        if (!sessionLoading && !currentUser) {
            router.replace('/login')
        }
    }, [sessionLoading, currentUser, router])

    if (sessionLoading) {
        return (
            <div className="h-screen flex items-center justify-center bg-background text-muted-foreground">
                Cargando sesión...
            </div>
        )
    }

    if (!currentUser) {
        return (
            <div className="h-screen flex items-center justify-center bg-background text-muted-foreground">
                Redirigiendo al login...
            </div>
        )
    }

    return (
        <div className="flex h-screen overflow-hidden">
            <Sidebar userRole={currentUser.role} />
            <div className="flex-1 flex flex-col overflow-hidden">
                <Header user={currentUser} />
                <main className="flex-1 overflow-y-auto p-4 sm:p-6">
                    {children}
                </main>
                {chatEnabled ? <ChatWidget /> : null}
            </div>
        </div>
    )
}
